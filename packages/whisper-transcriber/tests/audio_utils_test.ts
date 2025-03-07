import { assertEquals, assertNotEquals } from "https://deno.land/std@0.220.1/assert/mod.ts";
import { pcmToWav, convertToWhisperFormat } from "../src/audio_utils.ts";
import { AudioFormat } from "../src/types.ts";

Deno.test("pcmToWav - should create a valid WAV file", () => {
  // Create a simple sine wave
  const sampleRate = 16000;
  const duration = 0.1; // 0.1 second
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
  
  // Convert to WAV
  const format: AudioFormat = {
    sampleRate: 16000,
    channels: 1,
    bitsPerSample: 16
  };
  
  const wav = pcmToWav(pcmData, format);
  
  // Check WAV header
  const wavView = new DataView(wav.buffer);
  
  // Check RIFF header
  assertEquals(String.fromCharCode(wav[0], wav[1], wav[2], wav[3]), "RIFF");
  
  // Check WAVE format
  assertEquals(String.fromCharCode(wav[8], wav[9], wav[10], wav[11]), "WAVE");
  
  // Check fmt chunk
  assertEquals(String.fromCharCode(wav[12], wav[13], wav[14], wav[15]), "fmt ");
  
  // Check audio format (PCM = 1)
  assertEquals(wavView.getUint16(20, true), 1);
  
  // Check channels
  assertEquals(wavView.getUint16(22, true), 1);
  
  // Check sample rate
  assertEquals(wavView.getUint32(24, true), 16000);
  
  // Check data chunk
  assertEquals(String.fromCharCode(wav[36], wav[37], wav[38], wav[39]), "data");
  
  // Check data size
  assertEquals(wavView.getUint32(40, true), pcmData.length);
  
  // Check total size
  assertEquals(wav.length, 44 + pcmData.length);
});

Deno.test("convertToWhisperFormat - should pass through already correct format", () => {
  // Create a simple audio buffer
  const buffer = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
  
  // Format already matches Whisper requirements
  const format: AudioFormat = {
    sampleRate: 16000,
    channels: 1,
    bitsPerSample: 16
  };
  
  const converted = convertToWhisperFormat(buffer, format);
  
  // Should be the same buffer
  assertEquals(converted, buffer);
});