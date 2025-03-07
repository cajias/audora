/**
 * Main audio monitoring class that coordinates audio capture and transcription
 */

import { AudioCapture } from "./audio_capture.ts";
import { OutputWriter } from "./output_writer.ts";
import { AudioMonitorConfig, MonitorEvent, MonitorStatus, TranscriptionResult } from "./types.ts";
import { WhisperTranscriber } from "../../whisper-transcriber/mod.ts";

/**
 * Audio Monitor class that coordinates audio capture and transcription
 */
export class AudioMonitor {
  private config: AudioMonitorConfig;
  private audioCapture: AudioCapture;
  private transcriber: WhisperTranscriber;
  private outputWriter: OutputWriter;
  private status: MonitorStatus = "idle";
  private sessionId: string;
  private listeners: ((event: MonitorEvent) => void)[] = [];
  private isRunning = false;
  private applicationFound = false;
  private checkInterval: number | null = null;
  
  constructor(config: AudioMonitorConfig) {
    this.config = {
      captureMicrophone: true,
      captureApplication: true,
      ...config
    };
    
    this.sessionId = crypto.randomUUID();
    this.audioCapture = new AudioCapture(this.config);
    this.transcriber = new WhisperTranscriber({
      modelSize: this.config.modelSize || "base",
      language: this.config.language || "en"
    });
    this.outputWriter = new OutputWriter(this.config);
  }
  
  /**
   * Initialize the monitor
   */
  async initialize(): Promise<void> {
    this.updateStatus("initializing");
    
    try {
      // Initialize components
      await this.audioCapture.initialize();
      await this.transcriber.initialize();
      await this.outputWriter.initialize();
      
      this.updateStatus("waiting_for_application");
    } catch (error) {
      this.updateStatus("error");
      this.emitEvent({ type: "error", error: error instanceof Error ? error : new Error(String(error)) });
      throw error;
    }
  }
  
  /**
   * Start monitoring
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }
    
    this.isRunning = true;
    
    // Start checking for application
    await this.checkForApplication();
    this.checkInterval = setInterval(() => this.checkForApplication(), 5000);
    
    // Start monitoring loop
    this.monitorLoop();
  }
  
  /**
   * Stop monitoring
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }
    
    this.isRunning = false;
    
    // Stop checking for application
    if (this.checkInterval !== null) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    // Stop audio capture
    await this.audioCapture.stopCapture();
    
    this.updateStatus("idle");
  }
  
  /**
   * Add an event listener
   */
  addEventListener(listener: (event: MonitorEvent) => void): void {
    this.listeners.push(listener);
  }
  
  /**
   * Remove an event listener
   */
  removeEventListener(listener: (event: MonitorEvent) => void): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }
  
  /**
   * Get current status
   */
  getStatus(): MonitorStatus {
    return this.status;
  }
  
  /**
   * Check if the application is running
   */
  private async checkForApplication(): Promise<void> {
    const found = await this.audioCapture.findApplication(this.config.applicationName);
    
    if (found && !this.applicationFound) {
      this.applicationFound = true;
      this.emitEvent({ type: "application_found", name: this.config.applicationName });
      
      // Start capturing audio
      await this.audioCapture.startCapture();
      this.updateStatus("capturing");
    } else if (!found && this.applicationFound) {
      this.applicationFound = false;
      this.emitEvent({ type: "application_lost", name: this.config.applicationName });
      
      // Stop capturing audio
      await this.audioCapture.stopCapture();
      this.updateStatus("waiting_for_application");
    }
  }
  
  /**
   * Main monitoring loop
   */
  private async monitorLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        // Wait for application to be found
        if (!this.applicationFound) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        
        // Get audio buffer
        const buffer = await this.audioCapture.getNextBuffer();
        if (!buffer) {
          await new Promise(resolve => setTimeout(resolve, 100));
          continue;
        }
        
        // Transcribe audio
        this.updateStatus("transcribing");
        
        // Add audio to transcriber
        this.transcriber.addAudioData(buffer.data);
        this.transcriber.setAudioFormat({
          sampleRate: this.config.sampleRate || 16000,
          channels: this.config.channels || 1,
          bitsPerSample: this.config.bitsPerSample || 16
        });
        
        // Transcribe
        const transcription = await this.transcriber.transcribe();
        
        // Create result
        const result: TranscriptionResult = {
          text: transcription.text,
          segments: transcription.segments,
          startTime: buffer.timestamp,
          endTime: buffer.timestamp + buffer.duration * 1000,
          sessionId: this.sessionId,
          applicationName: this.config.applicationName
        };
        
        // Write to file
        await this.outputWriter.writeTranscription(result);
        
        // Emit event
        this.emitEvent({ type: "transcription", result });
        
        // Back to capturing
        this.updateStatus("capturing");
      } catch (error) {
        console.error("Error in monitor loop:", error);
        this.emitEvent({ type: "error", error: error instanceof Error ? error : new Error(String(error)) });
      }
    }
  }
  
  /**
   * Update status and emit event
   */
  private updateStatus(status: MonitorStatus, message?: string): void {
    this.status = status;
    this.emitEvent({ type: "status_change", status, message });
  }
  
  /**
   * Emit an event to all listeners
   */
  private emitEvent(event: MonitorEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error("Error in event listener:", error);
      }
    }
  }
}