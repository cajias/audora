/**
 * Basic example of using the WhisperTranscriber
 * 
 * This example shows how to:
 * 1. Initialize the transcriber
 * 2. Load an audio file
 * 3. Transcribe the audio
 * 4. Display the results
 * 
 * Run with:
 * deno run --allow-read --allow-write --allow-run --allow-env --allow-ffi --unstable-ffi examples/basic_transcription.ts <audio_file>
 */

import { WhisperTranscriber } from "../mod.ts";
import { join } from "@std/path";

// Get audio file from command line argument
const audioFile = Deno.args[0];
if (!audioFile) {
  console.error("Please provide an audio file path as an argument");
  Deno.exit(1);
}

// Check if file exists
try {
  await Deno.stat(audioFile);
} catch {
  console.error(`Audio file not found: ${audioFile}`);
  Deno.exit(1);
}

console.log(`Transcribing audio file: ${audioFile}`);

// Create and initialize transcriber
const transcriber = new WhisperTranscriber({
  modelSize: "base", // Use base model for faster results
  language: "en",    // Force English language
  threads: 4         // Use 4 CPU threads
});

console.log("Initializing transcriber (downloading model if needed)...");
await transcriber.initialize();

// Read audio file
console.log("Reading audio file...");
const audioData = await Deno.readFile(audioFile);

// Add audio data to transcriber
transcriber.addAudioData(audioData);

// Set audio format based on file extension
// In a real application, you would detect the format properly
const fileExt = audioFile.split('.').pop()?.toLowerCase();
switch (fileExt) {
  case "wav":
    transcriber.setAudioFormat({
      sampleRate: 44100,  // Most common WAV sample rate
      channels: 2,        // Stereo
      bitsPerSample: 16   // 16-bit
    });
    break;
  case "mp3":
    // For MP3, we'd need to decode it first
    // This is just a placeholder
    console.error("MP3 files are not supported in this example");
    Deno.exit(1);
    break;
  default:
    console.log("Unknown file format, assuming 16kHz 16-bit mono PCM");
    transcriber.setAudioFormat({
      sampleRate: 16000,
      channels: 1,
      bitsPerSample: 16
    });
}

// Transcribe audio
console.log("Transcribing audio...");
console.time("Transcription time");
const result = await transcriber.transcribe();
console.timeEnd("Transcription time");

// Display results
console.log("\n=== Transcription Result ===\n");
console.log(result.text);

if (result.detectedLanguage) {
  console.log(`\nDetected language: ${result.detectedLanguage}`);
}

if (result.segments && result.segments.length > 0) {
  console.log("\n=== Segments ===\n");
  for (const segment of result.segments) {
    const startTime = formatTime(segment.start);
    const endTime = formatTime(segment.end);
    console.log(`[${startTime} --> ${endTime}] ${segment.text}`);
  }
}

if (result.error) {
  console.error(`\nError: ${result.error}`);
}

/**
 * Format time in seconds to MM:SS format
 */
function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}