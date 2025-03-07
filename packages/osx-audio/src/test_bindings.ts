import { onData, startAudioCapture, stopAudioCapture } from "./bindings.ts";

// Simple test script to debug audio capture
console.log("Starting audio capture test");

// Subscribe to audio data
let dataReceived = false;
let dataCount = 0;
onData((data) => {
  dataCount++;
  console.log(`Received audio data of size: ${data.byteLength}, total chunks: ${dataCount}`);
  
  // Print first few bytes for debugging
  if (data.byteLength > 0) {
    const firstBytes = new Uint8Array(data.slice(0, Math.min(16, data.byteLength)));
    console.log(`First bytes: [${Array.from(firstBytes).join(', ')}]`);
    dataReceived = true;
  }
});

// Start capturing audio from QuickTime Player
console.log("Starting audio capture for QuickTime Player");
const result = startAudioCapture("com.apple.QuickTimePlayerX");
console.log(`startCapture result: ${result}`);

// Wait for 10 seconds or until data is received
console.log("Waiting for audio data (10 second timeout)...");
setTimeout(() => {
  console.log(`Data received during test: ${dataReceived}, total chunks: ${dataCount}`);
  stopAudioCapture();
  console.log("Audio capture stopped");
}, 10000);