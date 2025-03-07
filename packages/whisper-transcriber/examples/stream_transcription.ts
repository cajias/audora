/**
 * Example of streaming audio transcription
 * 
 * This example shows how to:
 * 1. Initialize the transcriber
 * 2. Stream audio data in chunks
 * 3. Periodically transcribe the accumulated audio
 * 4. Display the results in real-time
 * 
 * Run with:
 * deno run --allow-read --allow-write --allow-run --allow-env --allow-ffi --unstable-ffi examples/stream_transcription.ts
 */

import { WhisperTranscriber } from "../mod.ts";
import { join } from "@std/path";

// Create and initialize transcriber
const transcriber = new WhisperTranscriber({
  modelSize: "tiny", // Use tiny model for faster results in streaming
  language: "en",    // Force English language
  threads: 4,        // Use 4 CPU threads
  timeout: 5000      // 5 second timeout for streaming
});

console.log("Initializing transcriber (downloading model if needed)...");
await transcriber.initialize();

// Set audio format for our simulated audio stream
transcriber.setAudioFormat({
  sampleRate: 16000,
  channels: 1,
  bitsPerSample: 16
});

// Simulate streaming audio by reading a file in chunks
const audioFile = Deno.args[0] || "test_audio.wav";
let audioData: Uint8Array;

try {
  audioData = await Deno.readFile(audioFile);
  console.log(`Loaded audio file: ${audioFile} (${audioData.length} bytes)`);
} catch (error) {
  console.error(`Failed to read audio file: ${error.message}`);
  console.log("Generating synthetic audio data instead...");
  
  // Generate 10 seconds of synthetic audio (sine wave)
  audioData = generateSyntheticAudio(16000, 10);
}

// Chunk size (0.5 seconds of 16-bit mono audio at 16kHz)
const CHUNK_SIZE = 16000 * 2 * 0.5;
// Transcription interval (every 2 seconds)
const TRANSCRIBE_INTERVAL = 2000;

console.log("Starting simulated audio stream...");
console.log("Press Ctrl+C to stop\n");

let offset = 0;
let lastTranscriptionTime = Date.now();
let fullTranscription = "";

// Simulate streaming by sending chunks periodically
const streamInterval = setInterval(async () => {
  if (offset >= audioData.length) {
    console.log("\nEnd of audio stream reached");
    clearInterval(streamInterval);
    
    // Final transcription of any remaining audio
    await performTranscription(true);
    
    console.log("\n=== Final Transcription ===\n");
    console.log(fullTranscription);
    
    Deno.exit(0);
    return;
  }
  
  // Calculate chunk size (don't go past the end of the buffer)
  const size = Math.min(CHUNK_SIZE, audioData.length - offset);
  
  // Extract chunk and add to transcriber
  const chunk = audioData.slice(offset, offset + size);
  transcriber.addAudioData(chunk);
  
  // Move to next chunk
  offset += size;
  
  // Show progress
  const progress = Math.round((offset / audioData.length) * 100);
  process.stdout.write(`\rStreaming: ${progress}% complete`);
  
  // Check if it's time to transcribe
  const now = Date.now();
  if (now - lastTranscriptionTime >= TRANSCRIBE_INTERVAL) {
    await performTranscription();
    lastTranscriptionTime = now;
  }
}, 500); // Send a chunk every 500ms

/**
 * Perform transcription and display results
 */
async function performTranscription(isFinal = false): Promise<void> {
  if (transcriber.getStatus() !== "ready") {
    return; // Skip if transcriber is busy
  }
  
  try {
    const result = await transcriber.transcribe();
    
    if (result.text) {
      process.stdout.write(`\r${" ".repeat(50)}\r`); // Clear progress line
      console.log(`\n[${new Date().toISOString()}] ${result.text}`);
      
      // Append to full transcription
      if (fullTranscription) {
        fullTranscription += " " + result.text;
      } else {
        fullTranscription = result.text;
      }
    }
    
    // Clear buffer after transcription unless this is the final pass
    if (!isFinal) {
      transcriber.clearAudioBuffer();
    }
  } catch (error) {
    console.error(`\nTranscription error: ${error.message}`);
  }
}

/**
 * Generate synthetic audio data (sine wave)
 * @param sampleRate Sample rate in Hz
 * @param durationSec Duration in seconds
 * @returns Synthetic audio data
 */
function generateSyntheticAudio(sampleRate: number, durationSec: number): Uint8Array {
  const numSamples = sampleRate * durationSec;
  const buffer = new Uint8Array(numSamples * 2); // 16-bit = 2 bytes per sample
  const view = new DataView(buffer.buffer);
  
  // Generate a 440 Hz sine wave
  const frequency = 440;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const amplitude = 0.5; // 50% volume
    
    // Generate sine wave
    const sample = Math.sin(2 * Math.PI * frequency * t) * amplitude * 32767;
    
    // Write 16-bit sample
    view.setInt16(i * 2, sample, true);
  }
  
  return buffer;
}