/**
 * Audio capture functionality using FFmpeg
 */

import { AudioData, AudioMonitorConfig } from "./types.ts";
import { join } from "@std/path";
import { ensureDir } from "@std/fs";

/**
 * Audio capture class that uses FFmpeg to record audio from applications and microphone
 */
export class AudioCapture {
  private config: AudioMonitorConfig;
  private ffmpegProcess: Deno.Command | null = null;
  private tempDir: string;
  private isCapturing = false;
  private audioBuffer: AudioData[] = [];
  
  constructor(config: AudioMonitorConfig) {
    this.config = {
      sampleRate: 16000,
      channels: 1,
      bitsPerSample: 16,
      bufferSize: 5,
      ...config
    };
    
    // Create temp directory for audio files
    this.tempDir = join(Deno.env.get("HOME") || ".", ".cache", "audora", "audio-capture");
  }
  
  /**
   * Initialize audio capture
   */
  async initialize(): Promise<void> {
    await ensureDir(this.tempDir);
    
    // Check if FFmpeg is available
    try {
      const ffmpeg = new Deno.Command("ffmpeg", {
        args: ["-version"],
        stdout: "null",
        stderr: "null"
      });
      
      const output = await ffmpeg.output();
      if (!output.success) {
        throw new Error("FFmpeg command failed");
      }
    } catch (error) {
      throw new Error("FFmpeg is not available. Please install FFmpeg to use audio capture.");
    }
  }
  
  /**
   * Start capturing audio
   */
  async startCapture(): Promise<void> {
    if (this.isCapturing) {
      return;
    }
    
    this.isCapturing = true;
    
    // Build FFmpeg command based on config
    const args = this.buildFfmpegArgs();
    
    // Start FFmpeg process
    this.ffmpegProcess = new Deno.Command("ffmpeg", {
      args,
      stdout: "piped",
      stderr: "piped"
    });
    
    // Read audio data from FFmpeg
    this.readAudioData();
  }
  
  /**
   * Stop capturing audio
   */
  async stopCapture(): Promise<void> {
    if (!this.isCapturing || !this.ffmpegProcess) {
      return;
    }
    
    this.isCapturing = false;
    
    // FFmpeg process will be closed when we stop reading from it
    this.ffmpegProcess = null;
  }
  
  /**
   * Get the next audio buffer when it's ready
   */
  async getNextBuffer(): Promise<AudioData | null> {
    if (!this.isCapturing) {
      return null;
    }
    
    // Wait for buffer to fill
    const bufferDuration = this.calculateBufferDuration();
    if (bufferDuration < this.config.bufferSize!) {
      return null;
    }
    
    // Combine and return buffer
    const buffer = this.combineBuffers();
    this.audioBuffer = [];
    return buffer;
  }
  
  /**
   * Check if an application is available for capture
   */
  async findApplication(name: string): Promise<boolean> {
    // On macOS, use osascript to find application
    if (Deno.build.os === "darwin") {
      const script = `tell application "System Events" to return exists process "${name}"`;
      
      try {
        const osascript = new Deno.Command("osascript", {
          args: ["-e", script],
          stdout: "piped",
          stderr: "null"
        });
        
        const output = await osascript.output();
        return output.success && new TextDecoder().decode(output.stdout).trim() === "true";
      } catch {
        return false;
      }
    }
    
    // On Linux, use pactl to list applications
    if (Deno.build.os === "linux") {
      try {
        const pactl = new Deno.Command("pactl", {
          args: ["list", "sink-inputs"],
          stdout: "piped",
          stderr: "null"
        });
        
        const output = await pactl.output();
        if (output.success) {
          const text = new TextDecoder().decode(output.stdout);
          return text.toLowerCase().includes(name.toLowerCase());
        }
      } catch {
        return false;
      }
    }
    
    // On Windows, use PowerShell to find application
    if (Deno.build.os === "windows") {
      try {
        const script = `Get-Process "${name}" -ErrorAction SilentlyContinue`;
        const powershell = new Deno.Command("powershell", {
          args: ["-Command", script],
          stdout: "piped",
          stderr: "null"
        });
        
        const output = await powershell.output();
        return output.success && output.stdout.length > 0;
      } catch {
        return false;
      }
    }
    
    return false;
  }
  
  /**
   * Build FFmpeg command arguments based on config
   */
  private buildFfmpegArgs(): string[] {
    const args: string[] = [
      "-y",                   // Overwrite output files
      "-f", this.getAudioFormat(), // Input format
    ];
    
    // Add input device based on OS
    if (Deno.build.os === "darwin") {
      if (this.config.captureMicrophone) {
        args.push("-f", "avfoundation", "-i", ":0"); // Microphone
      }
      if (this.config.captureApplication) {
        args.push("-f", "avfoundation", "-i", "1:"); // System audio
      }
    } else if (Deno.build.os === "linux") {
      if (this.config.captureMicrophone) {
        args.push("-f", "pulse", "-i", "default"); // Microphone
      }
      if (this.config.captureApplication) {
        args.push("-f", "pulse", "-i", `${this.config.applicationName}.monitor`); // Application
      }
    } else if (Deno.build.os === "windows") {
      if (this.config.captureMicrophone) {
        args.push("-f", "dshow", "-i", "audio=Microphone"); // Microphone
      }
      if (this.config.captureApplication) {
        args.push("-f", "dshow", "-i", "audio=Virtual-Audio-Capturer"); // Application
      }
    }
    
    // Add output format
    args.push(
      "-acodec", "pcm_s16le",        // Output codec
      "-ar", String(this.config.sampleRate), // Sample rate
      "-ac", String(this.config.channels),   // Channels
      "-f", "s16le",                 // Raw PCM output
      "pipe:1"                       // Output to stdout
    );
    
    return args;
  }
  
  /**
   * Get audio format string based on OS
   */
  private getAudioFormat(): string {
    switch (Deno.build.os) {
      case "darwin":
        return "avfoundation";
      case "linux":
        return "pulse";
      case "windows":
        return "dshow";
      default:
        throw new Error(`Unsupported OS: ${Deno.build.os}`);
    }
  }
  
  /**
   * Read audio data from FFmpeg process
   */
  private async readAudioData() {
    if (!this.ffmpegProcess) {
      return;
    }
    
    const process = this.ffmpegProcess.spawn();
    const stdout = process.stdout;
    if (!stdout) return;
    
    // Calculate bytes per frame
    const bytesPerSample = this.config.bitsPerSample! / 8;
    const bytesPerFrame = bytesPerSample * this.config.channels!;
    const framesPerBuffer = this.config.sampleRate! * this.config.bufferSize!;
    // Increase buffer size by 50% to ensure we have enough space
    const bufferSize = Math.ceil(bytesPerFrame * framesPerBuffer * 1.5);
    
    // Read audio data in chunks
    const buffer = new Uint8Array(bufferSize);
    let offset = 0;
    
    try {
      const reader = stdout.getReader();
      
      while (this.isCapturing) {
        const { value, done } = await reader.read();
        
        if (done) break;
        
        if (value) {
          // Check if we have enough space in the buffer
          if (offset + value.length > buffer.length) {
            // Create a larger buffer if needed
            const newBuffer = new Uint8Array(buffer.length * 2);
            newBuffer.set(buffer);
            console.log(`Increasing buffer size from ${buffer.length} to ${newBuffer.length} bytes`);
            buffer = newBuffer;
          }
          
          // Add chunk to buffer
          buffer.set(value, offset);
          offset += value.length;
          
          // If buffer has enough data, add it to queue
          const targetSize = bytesPerFrame * framesPerBuffer;
          if (offset >= targetSize) {
            this.audioBuffer.push({
              data: buffer.slice(0, targetSize),
              source: this.getAudioSource(),
              timestamp: Date.now(),
              duration: this.config.bufferSize!
            });
            
            // Reset buffer (keep any extra data for next chunk)
            if (offset > targetSize) {
              // Move remaining data to beginning of buffer
              const remaining = buffer.slice(targetSize, offset);
              buffer.fill(0);
              buffer.set(remaining, 0);
              offset = remaining.length;
            } else {
              offset = 0;
            }
          }
        }
      }
      
      reader.releaseLock();
    } catch (error) {
      console.error("Error reading audio data:", error);
      await this.stopCapture();
    }
  }
  
  /**
   * Get the source of the audio based on config
   */
  private getAudioSource(): "microphone" | "application" | "mixed" {
    if (this.config.captureMicrophone && this.config.captureApplication) {
      return "mixed";
    }
    if (this.config.captureMicrophone) {
      return "microphone";
    }
    return "application";
  }
  
  /**
   * Calculate total duration of buffered audio
   */
  private calculateBufferDuration(): number {
    return this.audioBuffer.reduce((total, buffer) => total + buffer.duration, 0);
  }
  
  /**
   * Combine all buffers into a single AudioData object
   */
  private combineBuffers(): AudioData {
    // Calculate total size
    const totalSize = this.audioBuffer.reduce((size, buffer) => size + buffer.data.length, 0);
    const combined = new Uint8Array(totalSize);
    
    // Copy buffers
    let offset = 0;
    for (const buffer of this.audioBuffer) {
      combined.set(buffer.data, offset);
      offset += buffer.data.length;
    }
    
    return {
      data: combined,
      source: this.getAudioSource(),
      timestamp: this.audioBuffer[0].timestamp,
      duration: this.calculateBufferDuration()
    };
  }
}