import { join } from "@std/path";
import { ensureDir } from "@std/fs";
import { 
  WhisperConfig, 
  TranscriptionResult, 
  TranscriberStatus,
  AudioFormat,
  TranscriptionSegment
} from "./types.ts";
import { setupWhisperCpp, runWhisperCommand } from "./whisper_cpp.ts";
import { pcmToWav, convertToWhisperFormat } from "./audio_utils.ts";

/**
 * WhisperTranscriber class for handling audio transcription using Whisper
 */
export class WhisperTranscriber {
  private config: WhisperConfig;
  private status: TranscriberStatus = "idle";
  private modelLoaded = false;
  private audioBuffer: Uint8Array[] = [];
  private audioFormat: AudioFormat = {
    sampleRate: 16000,
    channels: 1,
    bitsPerSample: 16
  };
  protected cacheDir: string;
  private whisperBinary: string | null = null;
  private whisperProcess: Deno.ChildProcess | null = null;
  private currentTranscription: Promise<TranscriptionResult> | null = null;
  
  // For testing - allow injection of these functions
  protected setupWhisperCpp = setupWhisperCpp;
  protected runWhisperCommand = runWhisperCommand;

  /**
   * Create a new WhisperTranscriber instance
   * @param config Configuration options
   */
  constructor(config: WhisperConfig = {}) {
    this.config = {
      modelSize: "base",
      threads: navigator.hardwareConcurrency || 4,
      useGPU: true,
      timeout: 30000,
      ...config
    };
    
    this.cacheDir = join(Deno.env.get("HOME") || ".", ".cache", "audora", "whisper");
  }

  /**
   * Initialize the transcriber and download the model if needed
   */
  async initialize(): Promise<void> {
    this.status = "loading";
    
    try {
      // Ensure cache directory exists
      await ensureDir(this.cacheDir);
      
      // Setup whisper.cpp (download, build, and get binary path)
      this.whisperBinary = await this.setupWhisperCpp(this.config);
      
      console.log(`Whisper binary ready at: ${this.whisperBinary}`);
      this.modelLoaded = true;
      this.status = "ready";
    } catch (error) {
      this.status = "error";
      console.error("Failed to initialize Whisper transcriber:", error);
      if (error instanceof Error) {
        throw new Error(`Failed to initialize Whisper transcriber: ${error.message}`);
      } else {
        throw new Error("Failed to initialize Whisper transcriber");
      }
    }
  }

  /**
   * Add audio data to the buffer for transcription
   * @param audioData Raw audio data
   */
  addAudioData(audioData: Uint8Array): void {
    this.audioBuffer.push(audioData);
  }

  /**
   * Set the audio format for transcription
   * @param format Audio format details
   */
  setAudioFormat(format: Partial<AudioFormat>): void {
    this.audioFormat = {
      ...this.audioFormat,
      ...format
    };
  }

  /**
   * Clear the audio buffer
   */
  clearAudioBuffer(): void {
    this.audioBuffer = [];
  }

  /**
   * Get the current status of the transcriber
   */
  getStatus(): TranscriberStatus {
    return this.status;
  }

  /**
   * Transcribe the current audio buffer
   * @returns Promise resolving to transcription result
   */
  async transcribe(): Promise<TranscriptionResult> {
    if (this.status !== "ready") {
      throw new Error("Transcriber is not ready. Call initialize() first.");
    }
    
    if (this.audioBuffer.length === 0) {
      return { text: "" };
    }
    
    if (!this.whisperBinary) {
      throw new Error("Whisper binary not found. Initialization may have failed.");
    }
    
    this.status = "transcribing";
    
    try {
      // Combine all audio chunks
      const combinedAudio = this.combineAudioChunks();
      
      // Convert to Whisper format if needed (16kHz mono 16-bit PCM)
      const whisperAudio = convertToWhisperFormat(combinedAudio, this.audioFormat);
      
      // Convert to WAV for whisper.cpp
      const wavAudio = pcmToWav(whisperAudio, {
        sampleRate: 16000,
        channels: 1,
        bitsPerSample: 16
      });
      
      // Save to temporary file
      const tempFile = await this.saveTempAudioFile(wavAudio, ".wav");
      
      // Run whisper command
      const output = await this.runWhisperCommand(this.whisperBinary, tempFile, this.config);
      
      // Parse the output
      const result = this.parseWhisperOutput(output);
      
      // Clean up
      try {
        await Deno.remove(tempFile);
      } catch (e) {
        console.warn(`Failed to remove temporary file ${tempFile}:`, e);
      }
      
      this.status = "ready";
      return result;
    } catch (error) {
      const result = { 
        text: "", 
        error: error instanceof Error ? error.message : "Unknown error"
      };
      
      this.status = "ready";
      return result;
    }
  }

  /**
   * Cancel the current transcription if one is in progress
   */
  async cancelTranscription(): Promise<void> {
    if (this.status === "transcribing" && this.whisperProcess) {
      try {
        this.whisperProcess.kill("SIGTERM");
        this.whisperProcess = null;
      } catch (error) {
        console.error("Failed to cancel transcription:", error);
      }
      
      this.status = "ready";
    }
  }

  /**
   * Combine all audio chunks in the buffer
   * @private
   */
  private combineAudioChunks(): Uint8Array {
    // Calculate total length
    const totalLength = this.audioBuffer.reduce((acc, chunk) => acc + chunk.length, 0);
    
    // Create a new buffer with the total length
    const combined = new Uint8Array(totalLength);
    
    // Copy each chunk into the combined buffer
    let offset = 0;
    for (const chunk of this.audioBuffer) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    
    return combined;
  }

  /**
   * Save audio data to a temporary file
   * @param audioData Audio data to save
   * @param extension File extension (default: .raw)
   * @private
   */
  private async saveTempAudioFile(audioData: Uint8Array, extension = ".raw"): Promise<string> {
    // Create a temporary file
    const tempFile = join(this.cacheDir, `whisper_temp_${Date.now()}${extension}`);
    
    // Write the audio data to the file
    await Deno.writeFile(tempFile, audioData);
    
    return tempFile;
  }

  /**
   * Parse the output from whisper.cpp
   * @param output Raw output from whisper.cpp
   * @private
   */
  protected parseWhisperOutput(output: string): TranscriptionResult {
    try {
      // Check if output is JSON format
      if (output.trim().startsWith("{")) {
        try {
          // Try to parse as JSON
          const json = JSON.parse(output);
          return this.parseJsonOutput(json);
        } catch (e) {
          console.warn("Failed to parse whisper output as JSON:", e);
        }
      }
      
      // Fall back to text parsing
      return this.parseTextOutput(output);
    } catch (error) {
      console.error("Error parsing whisper output:", error);
      return {
        text: output.trim(),
        error: error instanceof Error ? error.message : "Failed to parse output"
      };
    }
  }
  
  /**
   * Parse JSON output from whisper.cpp
   * @param json JSON output from whisper.cpp
   * @private
   */
  protected parseJsonOutput(json: any): TranscriptionResult {
    const segments: TranscriptionSegment[] = [];
    let fullText = "";
    
    // Parse segments if available
    if (Array.isArray(json.segments)) {
      for (const seg of json.segments) {
        segments.push({
          id: seg.id,
          start: seg.start,
          end: seg.end,
          text: seg.text,
          confidence: seg.confidence || undefined
        });
        
        fullText += seg.text + " ";
      }
    } else if (typeof json.text === "string") {
      fullText = json.text;
    }
    
    return {
      text: fullText.trim(),
      detectedLanguage: json.language,
      confidence: json.confidence,
      segments: segments.length > 0 ? segments : undefined
    };
  }
  
  /**
   * Parse text output from whisper.cpp
   * @param output Text output from whisper.cpp
   * @private
   */
  protected parseTextOutput(output: string): TranscriptionResult {
    // Extract the main transcription text
    // Remove any "[BLANK_AUDIO]" markers
    const cleanedText = output.replace(/\[BLANK_AUDIO\]/g, "").trim();
    
    // Try to extract segments with timestamps (e.g., "[00:00:00 --> 00:00:05] Text here")
    const segments: TranscriptionSegment[] = [];
    const timestampRegex = /\[(\d{2}:\d{2}:\d{2})\s*-->\s*(\d{2}:\d{2}:\d{2})\]\s*(.*?)(?=\[\d{2}:\d{2}:\d{2}|$)/gs;
    
    let match;
    let id = 0;
    let fullText = "";
    
    while ((match = timestampRegex.exec(output)) !== null) {
      const startTime = this.parseTimestamp(match[1]);
      const endTime = this.parseTimestamp(match[2]);
      const text = match[3].trim();
      
      segments.push({
        id: id++,
        start: startTime,
        end: endTime,
        text
      });
      
      fullText += text + " ";
    }
    
    // If we extracted segments, use the combined text from segments
    // Otherwise use the cleaned text
    const resultText = segments.length > 0 ? fullText.trim() : cleanedText;
    
    return {
      text: resultText,
      segments: segments.length > 0 ? segments : undefined
    };
  }
  
  /**
   * Parse a timestamp string (HH:MM:SS) to seconds
   * @param timestamp Timestamp string
   * @private
   */
  protected parseTimestamp(timestamp: string): number {
    const parts = timestamp.split(":").map(Number);
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
}