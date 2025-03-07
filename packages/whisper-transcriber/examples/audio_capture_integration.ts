/**
 * Example of integrating with the audio capture module
 * 
 * This example shows how to:
 * 1. Initialize the audio capture from the osx-audio package
 * 2. Initialize the whisper transcriber
 * 3. Connect the audio capture to the transcriber
 * 4. Display real-time transcriptions
 * 
 * Run with:
 * deno run --allow-read --allow-write --allow-run --allow-env --allow-ffi --unstable-ffi examples/audio_capture_integration.ts
 */

import { WhisperTranscriber } from "../mod.ts";
import { captureAudio } from "../../osx-audio/src/bindings.ts";

// Create and initialize transcriber
const transcriber = new WhisperTranscriber({
  modelSize: "tiny", // Use tiny model for faster real-time results
  language: "en",    // Force English language
  threads: 4,        // Use 4 CPU threads
  timeout: 5000      // 5 second timeout for streaming
});

console.log("Initializing transcriber (downloading model if needed)...");
await transcriber.initialize();

// Set audio format to match what we'll get from the audio capture
// The audio capture from ScreenCaptureKit provides 16-bit 48kHz stereo
transcriber.setAudioFormat({
  sampleRate: 48000,
  channels: 2,
  bitsPerSample: 16
});

// Transcription interval (every 3 seconds)
const TRANSCRIBE_INTERVAL = 3000;
let lastTranscriptionTime = Date.now();
let isTranscribing = false;
let fullTranscription = "";

console.log("Starting audio capture...");
console.log("Press Ctrl+C to stop\n");

// Start audio capture
await captureAudio({
  onData: async (data: Uint8Array) => {
    // Add the audio data to the transcriber
    transcriber.addAudioData(data);
    
    // Check if it's time to transcribe
    const now = Date.now();
    if (now - lastTranscriptionTime >= TRANSCRIBE_INTERVAL && !isTranscribing) {
      isTranscribing = true;
      await performTranscription();
      lastTranscriptionTime = Date.now();
      isTranscribing = false;
    }
  },
  onError: (error: Error) => {
    console.error(`Audio capture error: ${error.message}`);
  }
});

/**
 * Perform transcription and display results
 */
async function performTranscription(): Promise<void> {
  if (transcriber.getStatus() !== "ready") {
    return; // Skip if transcriber is busy
  }
  
  try {
    console.log("Transcribing...");
    const result = await transcriber.transcribe();
    
    if (result.text) {
      console.log(`\n[${new Date().toISOString()}] ${result.text}`);
      
      // Append to full transcription
      if (fullTranscription) {
        fullTranscription += " " + result.text;
      } else {
        fullTranscription = result.text;
      }
    } else {
      console.log("No speech detected");
    }
    
    // Clear buffer after transcription
    transcriber.clearAudioBuffer();
  } catch (error) {
    console.error(`Transcription error: ${error.message}`);
  }
}