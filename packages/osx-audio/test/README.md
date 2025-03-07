# Audio Capture E2E Tests

This directory contains end-to-end tests for the audio capture functionality.

## Setup

1. Place a sample audio file at `e2e/sample_speech.mp3`
   - This should be a short MP3 file (5-10 seconds) of someone speaking
   - The file will be played by QuickTime Player during the test

## Running the Tests

Run the tests using the provided runner script:

```bash
cd packages/osx-audio
deno run --allow-run --allow-read --allow-write test/run_e2e_tests.ts
```

## Test Details

The E2E test:

1. Opens the sample audio file in QuickTime Player
2. Starts audio capture targeting QuickTime Player
3. Plays the audio file
4. Verifies that audio data is being captured
5. Cleans up by stopping capture and closing QuickTime Player

## Expected Results

If the audio capture functionality is working correctly:
- The test should receive multiple chunks of audio data
- The test should pass all assertions

If the audio capture functionality is not working:
- The test will time out waiting for audio data
- The test will fail with an assertion error

## Troubleshooting

If the test fails:

1. Ensure QuickTime Player has permission to access the microphone
2. Ensure the terminal running Deno has Screen Recording permission
3. Check that the sample audio file plays correctly in QuickTime Player
4. Try increasing the timeout value in the test if needed