# Whisper Transcriber

A Deno package for real-time audio transcription using [whisper.cpp](https://github.com/ggerganov/whisper.cpp).

## Features

- Local transcription without requiring an API key
- Automatic download and setup of whisper.cpp
- Support for streaming audio in real-time
- Multiple model sizes (tiny, base, small, medium, large)
- Audio format conversion and resampling
- Detailed transcription results with timestamps

## Installation

```bash
# Add to your project
deno add @audora/whisper-transcriber
```

## Requirements

- Git (for cloning whisper.cpp)
- C++ compiler (for building whisper.cpp)
- curl (for downloading models)

## Basic Usage

```typescript
import { WhisperTranscriber } from "@audora/whisper-transcriber";

// Create and initialize transcriber
const transcriber = new WhisperTranscriber({
  modelSize: "base",
  language: "en"
});

// Initialize (downloads model if needed)
await transcriber.initialize();

// Add audio data
transcriber.addAudioData(audioData);

// Transcribe
const result = await transcriber.transcribe();
console.log(result.text);
```

## Streaming Usage

```typescript
import { WhisperTranscriber } from "@audora/whisper-transcriber";

const transcriber = new WhisperTranscriber({
  modelSize: "tiny", // Smaller model for faster real-time results
  language: "en"
});

await transcriber.initialize();

// In your audio stream callback
audioStream.on("data", async (chunk) => {
  transcriber.addAudioData(chunk);
  
  // Transcribe periodically
  if (shouldTranscribeNow()) {
    const result = await transcriber.transcribe();
    console.log(result.text);
    transcriber.clearAudioBuffer();
  }
});
```

## Configuration Options

```typescript
const transcriber = new WhisperTranscriber({
  // Model options
  modelSize: "base",     // "tiny", "base", "small", "medium", "large"
  modelPath: "/path/to/model.bin", // Optional custom model path
  
  // Language options
  language: "en",        // Language code (optional, auto-detects if not specified)
  translate: false,      // Whether to translate non-English to English
  
  // Performance options
  threads: 4,            // Number of CPU threads to use
  useGPU: true,          // Whether to use GPU acceleration if available
  timeout: 30000         // Timeout in milliseconds
});
```

## Audio Format

By default, the transcriber expects 16kHz, mono, 16-bit PCM audio. If your audio is in a different format, you can specify it:

```typescript
transcriber.setAudioFormat({
  sampleRate: 44100,    // Sample rate in Hz
  channels: 2,          // Number of channels (1 = mono, 2 = stereo)
  bitsPerSample: 16     // Bits per sample (8, 16, 24, or 32)
});
```

The transcriber will automatically convert your audio to the format required by Whisper.

## Examples

See the `examples` directory for complete examples:

- `basic_transcription.ts` - Transcribe an audio file
- `stream_transcription.ts` - Simulate streaming audio transcription
- `audio_capture_integration.ts` - Integrate with audio capture

## Testing and Coverage

Run tests:

```bash
deno task test
```

Generate coverage report:

```bash
deno task coverage
deno task coverage:html
```

View the HTML coverage report in `coverage/html/index.html`.

## License

MIT