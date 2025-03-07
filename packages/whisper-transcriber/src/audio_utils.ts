/**
 * Audio utilities for processing and converting audio data
 */

import {AudioFormat} from "./types.ts";

/**
 * Convert raw PCM audio to WAV format
 * @param pcmData Raw PCM audio data
 * @param format Audio format information
 * @returns WAV file as Uint8Array
 */
export function pcmToWav(pcmData: Uint8Array, format: AudioFormat): Uint8Array {
  const dataSize = pcmData.length;
  const bytesPerSample = format.bitsPerSample / 8;
  const blockAlign = format.channels * bytesPerSample;
  const byteRate = format.sampleRate * blockAlign;
  const wavSize = 44 + dataSize;
  
  const wav = new Uint8Array(wavSize);
  const view = new DataView(wav.buffer);
  
  // RIFF header
  writeString(view, 0, "RIFF");
  view.setUint32(4, wavSize - 8, true);
  writeString(view, 8, "WAVE");
  
  // Format chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // Chunk size
  view.setUint16(20, 1, true); // Audio format (PCM)
  view.setUint16(22, format.channels, true);
  view.setUint32(24, format.sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, format.bitsPerSample, true);
  
  // Data chunk
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);
  
  // Copy PCM data
  wav.set(pcmData, 44);
  
  return wav;
}

/**
 * Convert audio to the format required by Whisper (16kHz, mono, 16-bit PCM)
 * @param audioData Audio data to convert
 * @param sourceFormat Source audio format
 * @returns Converted audio data
 */
export function convertToWhisperFormat(
  audioData: Uint8Array, 
  sourceFormat: AudioFormat
): Uint8Array {
  // If already in the right format, return as is
  if (
    sourceFormat.sampleRate === 16000 && 
    sourceFormat.channels === 1 && 
    sourceFormat.bitsPerSample === 16
  ) {
    return audioData;
  }
  
  // Create a view of the input data
  const inputView = new DataView(audioData.buffer, audioData.byteOffset, audioData.byteLength);
  const bytesPerSample = sourceFormat.bitsPerSample / 8;
  const numSamples = Math.floor(audioData.length / bytesPerSample / sourceFormat.channels);
  
  // Calculate output size and create output buffer
  const outputSampleRate = 16000;
  const outputNumSamples = Math.floor(numSamples * outputSampleRate / sourceFormat.sampleRate);
  const outputData = new Uint8Array(outputNumSamples * 2); // 16-bit = 2 bytes
  const outputView = new DataView(outputData.buffer);
  
  // Perform resampling
  for (let i = 0; i < outputNumSamples; i++) {
    // Find the corresponding sample in the input
    const inputSampleIndex = Math.floor(i * sourceFormat.sampleRate / outputSampleRate);
    let sample = 0;
    
    if (sourceFormat.channels === 1) {
      // Mono: just get the sample
      sample = getSample(inputView, inputSampleIndex, bytesPerSample, sourceFormat.bitsPerSample);
    } else {
      // Stereo: average the channels
      let sum = 0;
      for (let ch = 0; ch < sourceFormat.channels; ch++) {
        const chSample = getSample(
          inputView, 
          inputSampleIndex * sourceFormat.channels + ch, 
          bytesPerSample,
          sourceFormat.bitsPerSample
        );
        sum += chSample;
      }
      sample = Math.round(sum / sourceFormat.channels);
    }
    
    // Write to output buffer
    outputView.setInt16(i * 2, sample, true);
  }
  
  return outputData;
}

/**
 * Get a sample value from audio data
 * @param view DataView of the audio buffer
 * @param sampleIndex Index of the sample
 * @param bytesPerSample Number of bytes per sample
 * @param bitsPerSample Number of bits per sample
 * @returns Sample value as a number
 */
function getSample(
  view: DataView, 
  sampleIndex: number, 
  bytesPerSample: number,
  bitsPerSample: number
): number {
  const byteIndex = sampleIndex * bytesPerSample;
  
  switch (bytesPerSample) {
    case 1: // 8-bit
      return (view.getUint8(byteIndex) - 128) * 256; // Convert to signed and scale to 16-bit
      
    case 2: // 16-bit
      return view.getInt16(byteIndex, true);
      
    case 3: // 24-bit
      // Read 3 bytes and convert to 16-bit
      const byte0 = view.getUint8(byteIndex);
      const byte1 = view.getUint8(byteIndex + 1);
      const byte2 = view.getUint8(byteIndex + 2);
      
      // Combine bytes into a 24-bit signed integer, then scale to 16-bit
      let value = (byte2 << 16) | (byte1 << 8) | byte0;
      if (value & 0x800000) {
        value |= ~0xFFFFFF; // Sign extension
      }
      return value >> 8; // Scale to 16-bit
      
    case 4: // 32-bit
      if (bitsPerSample === 32) {
        // 32-bit float
        return Math.round(view.getFloat32(byteIndex, true) * 32767);
      } else {
        // 32-bit int
        return view.getInt32(byteIndex, true) >> 16; // Scale to 16-bit
      }
      
    default:
      throw new Error(`Unsupported bytes per sample: ${bytesPerSample}`);
  }
}

/**
 * Write a string to a DataView
 * @param view DataView to write to
 * @param offset Offset to write at
 * @param string String to write
 */
function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}