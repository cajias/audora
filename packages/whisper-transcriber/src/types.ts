/**
 * Configuration options for the Whisper transcriber
 */
export interface WhisperConfig {
  /**
   * Path to the Whisper model file
   * If not provided, the default model will be downloaded
   */
  modelPath?: string;
  
  /**
   * Model size to use
   * Smaller models are faster but less accurate
   */
  modelSize?: "tiny" | "base" | "small" | "medium" | "large";
  
  /**
   * Language to use for transcription
   * If not provided, Whisper will auto-detect the language
   */
  language?: string;
  
  /**
   * Whether to translate non-English speech to English
   */
  translate?: boolean;
  
  /**
   * Number of threads to use for computation
   * Default: number of CPU cores
   */
  threads?: number;
  
  /**
   * Whether to use GPU acceleration if available
   * Default: true
   */
  useGPU?: boolean;
  
  /**
   * Timeout in milliseconds for transcription
   * Default: 30000 (30 seconds)
   */
  timeout?: number;
}

/**
 * Result of a transcription operation
 */
export interface TranscriptionResult {
  /**
   * The transcribed text
   */
  text: string;
  
  /**
   * Confidence score (0-1)
   */
  confidence?: number;
  
  /**
   * Language detected in the audio
   */
  detectedLanguage?: string;
  
  /**
   * Segments with timestamps
   */
  segments?: TranscriptionSegment[];
  
  /**
   * Any errors that occurred during transcription
   */
  error?: string;
}

/**
 * A segment of transcribed text with timing information
 */
export interface TranscriptionSegment {
  /**
   * Segment ID
   */
  id: number;
  
  /**
   * Start time in seconds
   */
  start: number;
  
  /**
   * End time in seconds
   */
  end: number;
  
  /**
   * Transcribed text for this segment
   */
  text: string;
  
  /**
   * Confidence score (0-1)
   */
  confidence?: number;
}

/**
 * Audio format information
 */
export interface AudioFormat {
  /**
   * Sample rate in Hz
   */
  sampleRate: number;
  
  /**
   * Number of channels
   */
  channels: number;
  
  /**
   * Bits per sample
   */
  bitsPerSample: number;
}

/**
 * Status of the transcriber
 */
export type TranscriberStatus = 
  | "idle" 
  | "loading" 
  | "ready" 
  | "transcribing" 
  | "error";