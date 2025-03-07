import {
    onData,
    startAudioCapture,
    stopAudioCapture,
} from "./bindings.ts";

console.log("Registering callback for audio data...");

// Register the callback to process audio data
onData((chunk) => {
    console.log("Received audio chunk of size:", chunk.length);
    // You can add further processing here, such as saving or analyzing the chunk.
});

// Start capturing from a specific app (e.g., TextEdit for testing)
// const bundleID = "com.amazon.Amazon-Chime"; // Replace with your app's bundle ID
const bundleID = "com.apple.Music"; // Replace with your app's bundle ID
console.log("Starting audio capture for:", bundleID);
const result = startAudioCapture(bundleID);

if (result !== 0) {
    console.error("Failed to start audio capture. Error code:", result);
    Deno.exit(1);
}

// Run for 30 seconds, then stop
console.log("Audio capture started. Listening for 30 seconds...");
setTimeout(() => {
    stopAudioCapture();
    console.log("Audio capture stopped.");
}, 30000);

if (result !== 0) {
    console.error("Failed to start audio capture. Error code:", result);
    Deno.exit(1);
}

// Run for 10 seconds, then stop
console.log("Audio capture started. Listening for 10 seconds...");
setTimeout(() => {
    stopAudioCapture();
    console.log("Audio capture stopped.");
}, 10000);