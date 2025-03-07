import { assertEquals } from "@std/assert";
import { resolve, dirname, fromFileUrl } from "@std/path";
import { onData, startAudioCapture, stopAudioCapture } from "../../src/bindings.ts";

// Path to the test audio file (to be provided)
const TEST_AUDIO_FILE = resolve(dirname(fromFileUrl(import.meta.url)), "./sample_speech.mp3");

// The application that will play our audio
const AUDIO_PLAYER_APP = "com.apple.QuickTimePlayerX"; // QuickTime Player

/**
 * E2E test for audio capture functionality
 * 
 * This test:
 * 1. Opens a sample audio file in QuickTime Player
 * 2. Starts audio capture on QuickTime Player
 * 3. Verifies that audio data is being captured
 * 4. Closes QuickTime Player and stops capture
 */
Deno.test({
  name: "Audio capture e2e test",
  fn: async () => {
    // Setup: Track if we received any audio data
    let capturedChunks = 0;
    let totalBytesReceived = 0;
    
    // Create a promise that will resolve when we receive audio data
    const audioDataPromise = new Promise<boolean>((resolve) => {
      // Register callback to process audio data
      onData((chunk) => {
        console.log(`Received audio chunk of size: ${chunk.length} bytes`);
        capturedChunks++;
        totalBytesReceived += chunk.length;
        
        // If we've received at least 3 chunks, consider it a success
        if (capturedChunks >= 3) {
          resolve(true);
        }
      });
    });

    // Create a timeout promise
    const timeoutPromise = new Promise<boolean>((resolve) => {
      setTimeout(() => resolve(false), 15000); // 15 second timeout
    });

    try {
      // Step 1: Open the audio file with QuickTime Player
      console.log(`Opening audio file: ${TEST_AUDIO_FILE}`);
      const openProcess = new Deno.Command("open", {
        args: ["-a", "QuickTime Player", TEST_AUDIO_FILE],
        stdout: "piped",
        stderr: "piped",
      }).spawn();
      
      // Wait a moment for QuickTime to open
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Step 2: Start audio capture
      console.log("Starting audio capture for QuickTime Player");
      const result = startAudioCapture(AUDIO_PLAYER_APP);
      assertEquals(result, 0, "Audio capture should start successfully");
      
      // Step 3: Play the audio (simulate pressing space bar to play)
      console.log("Simulating play command");
      const playProcess = new Deno.Command("osascript", {
        args: ["-e", 'tell application "QuickTime Player" to play the front document'],
        stdout: "piped",
        stderr: "piped",
      }).spawn();
      
      // Wait for the play command to complete
      const playOutput = await playProcess.output();
      assertEquals(playOutput.code, 0, "Play command should succeed");
      
      // Step 4: Wait for audio data or timeout
      console.log("Waiting for audio data (15 second timeout)...");
      const receivedAudioData = await Promise.race([audioDataPromise, timeoutPromise]);
      
      // Assert that we received audio data
      assertEquals(receivedAudioData, true, "Should receive audio data within timeout period");
      console.log(`Received ${capturedChunks} audio chunks totaling ${totalBytesReceived} bytes`);
      
      // Additional assertions
      assertEquals(capturedChunks > 0, true, "Should capture at least one audio chunk");
      assertEquals(totalBytesReceived > 0, true, "Should receive audio data bytes");
      
    } finally {
      // Cleanup: Stop audio capture
      console.log("Stopping audio capture");
      stopAudioCapture();
      
      // Close QuickTime Player
      console.log("Closing QuickTime Player");
      const closeProcess = new Deno.Command("osascript", {
        args: ["-e", 'tell application "QuickTime Player" to quit'],
        stdout: "piped",
        stderr: "piped",
      }).spawn();
      
      await closeProcess.output();
    }
  },
  
  // This test requires permissions
  permissions: {
    run: true,
    read: true,
    write: true,
    ffi: true,
  },
  
  // This test might take some time
  sanitizeResources: false,
  sanitizeOps: false,
});