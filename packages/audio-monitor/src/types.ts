/**
 * Types for the audio monitor
 */

/**
 * Configuration for the audio monitor
 */
export interface AudioMonitorConfig {
  /**
   * Name or ID of the application to monitor
   * This can be a process name, window title, or other identifier
   */
  applicationName: string;
  
  /**
   * Whether to capture microphone audio
   * @default true
   */
  captureMicrophone?: boolean;
  
  /**
   * Whether to capture application audio
   * @default true
   */
  captureApplication?: boolean;
  
  /**
   * Directory to write transcription files to
   * @default "./transcriptions"
   */
  outputDirectory?: string;
  
  /**
   * Format for the transcription files
   * @default "txt"
   */
  outputFormat?: "txt" | "json" | "srt";
  
  /**
   * Prefix for the transcription files
   * @default "transcription"
   */
  filePrefix?: string;
  
  /**
   * Sample rate for audio capture
   * @default 16000
   */
  sampleRate?: number;
  
  /**
   * Number of channels for audio capture
   * @default 1 (mono)
   */
  channels?: number;
  
  /**
   * Bits per sample for audio capture
   * @default 16
   */
  bitsPerSample?: number;
  
  /**
   * Transcription language
   * @default "en" (English)
   */
  language?: string;
  
  /**
   * Whisper model size to use for transcription
   * @default "base"
   */
  modelSize?: "tiny" | "base" | "small" | "medium" | "large";
  
  /**
   * Buffer size in seconds before transcribing
   * @default 5
   */
  bufferSize?: number;
  
  /**
   * Whether to include timestamps in the transcription
   * @default true
   */
  includeTimestamps?: boolean;
  
  /**
   * Whether to append to existing files or create new ones
   * @default false (create new files)
   */
  appendToExisting?: boolean;
}

/**
 * Status of the audio monitor
 */
export type MonitorStatus = 
  | "idle"
  | "initializing"
  | "waiting_for_application"
  | "capturing"
  | "transcribing"
  | "error";

/**
 * Audio data with metadata
 */
export interface AudioData {
  /**
   * Raw audio data
   */
  data: Uint8Array;
  
  /**
   * Source of the audio
   */
  source: "microphone" | "application" | "mixed";
  
  /**
   * Timestamp when the audio was captured
   */
  timestamp: number;
  
  /**
   * Duration of the audio in seconds
   */
  duration: number;
}

/**
 * Transcription segment with timing information
 */
export interface TranscriptionSegment {
  /**
   * Start time of the segment in seconds
   */
  start: number;
  
  /**
   * End time of the segment in seconds
   */
  end: number;
  
  /**
   * Transcribed text
   */
  text: string;
  
  /**
   * Speaker identification (if available)
   */
  speaker?: string;
}

/**
 * Complete transcription result
 */
export interface TranscriptionResult {
  /**
   * Full transcribed text
   */
  text: string;
  
  /**
   * Individual segments with timing information
   */
  segments?: TranscriptionSegment[];
  
  /**
   * Start time of the transcription (Unix timestamp)
   */
  startTime: number;
  
  /**
   * End time of the transcription (Unix timestamp)
   */
  endTime: number;
  
  /**
   * Session ID for this transcription
   */
  sessionId: string;
  
  /**
   * Application name that was monitored
   */
  applicationName: string;
}

/**
 * Event types emitted by the monitor
 */
export type MonitorEvent = 
  | { type: "status_change"; status: MonitorStatus; message?: string }
  | { type: "application_found"; name: string }
  | { type: "application_lost"; name: string }
  | { type: "transcription"; result: TranscriptionResult }
  | { type: "error"; error: Error };