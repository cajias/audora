import { assertEquals, assertExists } from "https://deno.land/std@0.220.1/assert/mod.ts";
import { WhisperTranscriber } from "../src/transcriber.ts";
import { join } from "@std/path";

// This is an integration test that tests the full transcription pipeline
// It requires whisper.cpp to be installed and a model to be available
// It will be skipped by default to avoid long test runs

Deno.test({
  name: "Integration - full transcription pipeline",
  fn: async () => {
    // Create a synthetic audio file
    const audioPath = await createTestAudioFile();
    
    try {
      // Create transcriber with tiny model for faster tests
      const transcriber = new WhisperTranscriber({
        modelSize: "tiny",
        language: "en"
      });
      
      // Initialize (this will download the model if needed)
      await transcriber.initialize();
      
      // Read the test audio file
      const audioData = await Deno.readFile(audioPath);
      
      // Add to transcriber
      transcriber.addAudioData(audioData);
      
      // Set audio format
      transcriber.setAudioFormat({
        sampleRate: 16000,
        channels: 1,
        bitsPerSample: 16
      });
      
      // Transcribe
      const result = await transcriber.transcribe();
      
      // Check result
      assertExists(result);
      assertExists(result.text);
      
      // The synthetic audio doesn't contain speech, so we don't expect
      // specific text, but the transcription should complete without errors
      assertEquals(result.error, undefined);
    } finally {
      // Clean up
      try {
        await Deno.remove(audioPath);
      } catch {
        // Ignore cleanup errors
      }
    }
  },
  // Skip this test by default as it requires whisper.cpp and models
  ignore: true
});

// Helper function to create a test audio file
async function createTestAudioFile(): Promise<string> {
  // Create a simple sine wave
  const sampleRate = 16000;
  const duration = 2; // 2 seconds
  const frequency = 440; // 440 Hz (A4 note)
  const numSamples = sampleRate * duration;
  const pcmData = new Uint8Array(numSamples * 2); // 16-bit = 2 bytes per sample
  const view = new DataView(pcmData.buffer);
  
  // Generate sine wave
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const amplitude = 0.5; // 50% volume
    const sample = Math.sin(2 * Math.PI * frequency * t) * amplitude * 32767;
    view.setInt16(i * 2, Math.round(sample), true);
  }
  
  // Create WAV header
  const wavHeader = new Uint8Array(44);
  const headerView = new DataView(wavHeader.buffer);
  
  // RIFF header
  writeString(headerView, 0, "RIFF");
  headerView.setUint32(4, 36 + pcmData.length, true);
  writeString(headerView, 8, "WAVE");
  
  // Format chunk
  writeString(headerView, 12, "fmt ");
  headerView.setUint32(16, 16, true); // Chunk size
  headerView.setUint16(20, 1, true); // Audio format (PCM)
  headerView.setUint16(22, 1, true); // Channels (mono)
  headerView.setUint32(24, sampleRate, true);
  headerView.setUint32(28, sampleRate * 2, true); // Byte rate
  headerView.setUint16(32, 2, true); // Block align
  headerView.setUint16(34, 16, true); // Bits per sample
  
  // Data chunk
  writeString(headerView, 36, "data");
  headerView.setUint32(40, pcmData.length, true);
  
  // Combine header and data
  const wavData = new Uint8Array(wavHeader.length + pcmData.length);
  wavData.set(wavHeader);
  wavData.set(pcmData, wavHeader.length);
  
  // Write to temp file
  const tempDir = await Deno.makeTempDir();
  const filePath = join(tempDir, "test_audio.wav");
  await Deno.writeFile(filePath, wavData);
  
  return filePath;
}

// Helper function to write a string to a DataView
function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}