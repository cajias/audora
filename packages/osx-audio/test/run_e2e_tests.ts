/**
 * Runner script for E2E tests
 * 
 * This script:
 * 1. Checks if the required sample audio file exists
 * 2. Runs the E2E tests with the necessary permissions
 */

import { resolve, dirname, fromFileUrl } from "@std/path";

const TEST_AUDIO_FILE = resolve(dirname(fromFileUrl(import.meta.url)), "./e2e/sample_speech.mp3");

async function main() {
  // Check if the sample audio file exists
  try {
    await Deno.stat(TEST_AUDIO_FILE);
  } catch (error) {
    console.error(`Error: Sample audio file not found at ${TEST_AUDIO_FILE}`);
    console.error("Please provide a sample MP3 file of someone speaking at this location.");
    Deno.exit(1);
  }

  console.log(`Found sample audio file: ${TEST_AUDIO_FILE}`);
  console.log("Running E2E tests...");

  // Run the E2E tests with necessary permissions
  const process = Deno.run({
    cmd: [
      "deno", "test", 
      "--allow-ffi", 
      "--allow-read", 
      "--allow-write", 
      "--allow-run",
      "--unstable-ffi",
      "./e2e/audio_capture_test.ts"
    ],
    stdout: "inherit",
    stderr: "inherit",
  });

  const status = await process.status();
  Deno.exit(status.code);
}

main().catch(err => {
  console.error("Error running tests:", err);
  Deno.exit(1);
});