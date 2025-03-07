# Audora

Audora is a suite of tools for audio transcription and monitoring. It automatically captures audio from applications and microphone, transcribes it in real-time, and writes the transcription to a file.

## Packages

- **whisper-transcriber**: A Deno module that provides transcription capabilities using Whisper.cpp
- **audio-monitor**: A Deno application that monitors applications and transcribes their audio

## Features

- Automatically detects when the target application starts and stops
- Captures both application audio and microphone input
- Real-time transcription using Whisper
- Writes transcriptions to files with timestamps
- Supports multiple output formats (text, JSON, SRT)
- Configurable buffer size and transcription parameters

## Requirements

- [Deno](https://deno.land/) 1.37.0 or higher
- [FFmpeg](https://ffmpeg.org/) for audio capture
- [Whisper.cpp](https://github.com/ggerganov/whisper.cpp) (automatically downloaded and built)

## Installation

No installation is needed as this is a Deno application. Just clone the repository and run it.

```bash
git clone https://github.com/yourusername/audora.git
cd audora
```

## Usage

### Command Line

```bash
# Using the task (easiest)
deno task start "Zoom"

# Using the CLI directly
./cli.ts "Zoom"
```

Replace `"Zoom"` with the name of the application you want to monitor.

### Programmatic Usage

```typescript
import { startMonitoring } from "@audora/audio-monitor";

const monitor = await startMonitoring({
  applicationName: "Zoom",
  outputDirectory: "./transcriptions",
  outputFormat: "txt",
  modelSize: "base"
});

// To stop monitoring
await monitor.stop();
```

## Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `applicationName` | Name or ID of the application to monitor | (required) |
| `captureMicrophone` | Whether to capture microphone audio | `true` |
| `captureApplication` | Whether to capture application audio | `true` |
| `outputDirectory` | Directory to write transcription files to | `"./transcriptions"` |
| `outputFormat` | Format for the transcription files (`"txt"`, `"json"`, `"srt"`) | `"txt"` |
| `filePrefix` | Prefix for the transcription files | `"transcription"` |
| `sampleRate` | Sample rate for audio capture | `16000` |
| `channels` | Number of channels for audio capture | `1` (mono) |
| `bitsPerSample` | Bits per sample for audio capture | `16` |
| `language` | Transcription language | `"en"` (English) |
| `modelSize` | Whisper model size to use for transcription | `"base"` |
| `bufferSize` | Buffer size in seconds before transcribing | `5` |
| `includeTimestamps` | Whether to include timestamps in the transcription | `true` |
| `appendToExisting` | Whether to append to existing files or create new ones | `false` |

## Development

```bash
# Run tests for whisper-transcriber
cd packages/whisper-transcriber
deno task test

# Run tests for audio-monitor
cd packages/audio-monitor
deno task test
```

## License

MIT