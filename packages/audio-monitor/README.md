# Audio Monitor

A Deno application that automatically captures audio from applications and microphone, transcribes it in real-time, and writes the transcription to a file.

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
deno run --allow-read --allow-write --allow-run --allow-env --allow-ffi --unstable-ffi packages/audio-monitor/src/main.ts "Zoom"
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

## Output Formats

### Text Format

```
================================================================================
Application: Zoom
Session Start: 2023-09-01T12:00:00.000Z
================================================================================

[00:00:05] Hello, can you hear me?
[00:00:10] Yes, I can hear you clearly.
```

### JSON Format

```json
{
  "application": "Zoom",
  "sessionStart": "2023-09-01T12:00:00.000Z",
  "transcriptions": [
    {
      "text": "Hello, can you hear me?",
      "segments": [
        {
          "start": 5.0,
          "end": 7.2,
          "text": "Hello, can you hear me?"
        }
      ],
      "startTime": 1693569600000,
      "endTime": 1693569605000,
      "sessionId": "123e4567-e89b-12d3-a456-426614174000",
      "applicationName": "Zoom"
    }
  ]
}
```

### SRT Format

```
WEBVTT

Session: Zoom
Start: 2023-09-01T12:00:00.000Z

1
00:00:05,000 --> 00:00:07,200
Hello, can you hear me?

2
00:00:10,000 --> 00:00:12,500
Yes, I can hear you clearly.
```

## License

MIT