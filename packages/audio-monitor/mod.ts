/**
 * Audio Monitor
 * 
 * Captures audio from applications and microphone, transcribes it,
 * and writes the transcription to a file in real-time.
 */

export * from "./src/types.ts";
export * from "./src/audio_capture.ts";
export * from "./src/monitor.ts";
export * from "./src/output_writer.ts";
export { startMonitoring } from "./src/main.ts";