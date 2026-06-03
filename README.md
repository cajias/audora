```text
   █████╗ ██╗   ██╗██████╗  ██████╗ ██████╗  █████╗
  ██╔══██╗██║   ██║██╔══██╗██╔═══██╗██╔══██╗██╔══██╗
  ███████║██║   ██║██║  ██║██║   ██║██████╔╝███████║
  ██╔══██║██║   ██║██║  ██║██║   ██║██╔══██╗██╔══██║
  ██║  ██║╚██████╔╝██████╔╝╚██████╔╝██║  ██║██║  ██║
  ╚═╝  ╚═╝ ╚═════╝ ╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝
```

<p align="center">
  <strong>Watch any macOS app, capture its audio, and transcribe it to disk in real time — fully on-device.</strong>
</p>

<p align="center">
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/github/license/cajias/audora"></a>
  <img alt="Top language" src="https://img.shields.io/github/languages/top/cajias/audora">
  <img alt="Last commit" src="https://img.shields.io/github/last-commit/cajias/audora">
  <img alt="Deno" src="https://img.shields.io/badge/runtime-Deno-000?logo=deno&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white">
  <img alt="Swift" src="https://img.shields.io/badge/Swift-F05138?logo=swift&logoColor=white">
  <img alt="Platform" src="https://img.shields.io/badge/platform-macOS%2012.3%2B-black?logo=apple">
</p>

Audora is a macOS audio-transcription toolkit built on [Deno](https://deno.land/). Point it at a
running application and it captures that app's audio (via **FFmpeg**), streams the samples through a
local [whisper.cpp](https://github.com/ggerganov/whisper.cpp) model, and writes timestamped
transcripts to disk — no cloud API, no API key, nothing leaves your machine. A separate native
**ScreenCaptureKit** binding (the `osx-audio` / `ScreenCaptureKitBindings` packages) provides
app-scoped capture on macOS 12.3+ for callers that want to consume it directly. Audora is organized
as a Deno workspace so each capability (capture, transcription, orchestration) ships as its own
importable package.

## ✨ Features

- **App-scoped capture** — targets a specific running application: the orchestrator captures via FFmpeg, and a native ScreenCaptureKit binding (macOS 12.3+) is available for direct app-scoped capture.
- **Local transcription** — runs whisper.cpp on-device with selectable model sizes (`tiny` → `large`); no network, no API key.
- **Real-time pipeline** — buffers audio and transcribes continuously while the target app runs.
- **Auto lifecycle** — detects when the target application starts and stops and reacts accordingly.
- **Timestamped output** — writes transcripts to per-session files, with `txt`, `json`, and `srt` formats supported.
- **Configurable** — sample rate, channels, language, buffer size, model size and more are all tunable.
- **Composable packages** — use the high-level monitor, or import the transcriber / native capture bindings on their own.

## 📦 Packages

This repository is a Deno workspace. Each package under `packages/` is independently importable.

| Package | What it does |
|---------|--------------|
| **audio-monitor** (`@audora/audio-monitor`) | Orchestrates the full pipeline: watch an app, capture, transcribe, and write transcripts. |
| **whisper-transcriber** (`@audora/whisper-transcriber`) | Local speech-to-text via whisper.cpp, with streaming and audio-format conversion. |
| **osx-audio** | Deno FFI bindings to the native ScreenCaptureKit capture library. |
| **ScreenCaptureKitBindings** | The Swift package that compiles the macOS capture `.dylib` consumed over FFI. |

## 🔧 Requirements

- **macOS 12.3+** (required for the native ScreenCaptureKit capture binding)
- [**Deno**](https://deno.land/) (the project targets the Deno runtime and `deno task` workflow)
- [**FFmpeg**](https://ffmpeg.org/) — the audio-monitor pipeline shells out to `ffmpeg` to capture audio
- **Xcode / Command-Line Tools** (Swift toolchain) to build the native `ScreenCaptureKitBindings` capture library
- A **C++ compiler**, **git**, and **curl** — used by whisper.cpp, which is downloaded and built on first run

## 🚀 Installation

Clone the repository — there is nothing to install globally; everything runs through Deno.

```bash
git clone https://github.com/cajias/audora.git
cd audora
```

If you use [mise](https://mise.jdx.dev/), `mise install` will pin Deno from `mise.toml`.

## 💻 Usage

### Command line

Run the bundled task and pass the name of the application you want to monitor. Transcripts are
written to a `transcriptions/` directory in the current working directory.

```bash
# Easiest: the workspace task
deno task start "Zoom"

# Or invoke the CLI script directly
./cli.ts "Zoom"
```

Replace `"Zoom"` with any running application's name.

### Programmatic

```typescript
import { startMonitoring } from "@audora/audio-monitor";

const monitor = await startMonitoring({
  applicationName: "Zoom",
  outputDirectory: "./transcriptions",
  outputFormat: "txt",
  modelSize: "base",
});

// Later, to stop:
await monitor.stop();
```

### Configuration options

`startMonitoring` accepts an `AudioMonitorConfig`:

| Option | Description | Default |
|--------|-------------|---------|
| `applicationName` | Name or ID of the application to monitor | *(required)* |
| `captureMicrophone` | Capture microphone audio | `true` |
| `captureApplication` | Capture application audio | `true` |
| `outputDirectory` | Directory to write transcripts to | `"./transcriptions"` |
| `outputFormat` | `"txt"`, `"json"`, or `"srt"` | `"txt"` |
| `filePrefix` | Prefix for transcript filenames | `"transcription"` |
| `sampleRate` | Audio capture sample rate (Hz) | `16000` |
| `channels` | Channels (1 = mono) | `1` |
| `bitsPerSample` | Bits per sample | `16` |
| `language` | Transcription language code | `"en"` |
| `modelSize` | Whisper model: `tiny`/`base`/`small`/`medium`/`large` | `"base"` |
| `bufferSize` | Seconds buffered before each transcription pass | `5` |
| `includeTimestamps` | Include timestamps in output | `true` |
| `appendToExisting` | Append to an existing file vs. create new | `false` |

## 🗂️ Project Structure

```text
audora/
├── cli.ts                       # CLI entry point: `audora <application-name>`
├── deno.json                    # Deno workspace config + `start` task
├── mise.toml                    # Pins the Deno toolchain
├── scripts/
│   └── build.sh                 # Helper build script
└── packages/
    ├── audio-monitor/           # @audora/audio-monitor — capture + transcribe orchestrator
    │   ├── mod.ts               #   public exports
    │   ├── src/                 #   monitor, audio capture, output writer, types
    │   └── tests/               #   unit tests
    ├── whisper-transcriber/     # @audora/whisper-transcriber — local whisper.cpp STT
    │   ├── mod.ts               #   public exports
    │   ├── src/                 #   transcriber, whisper_cpp runner, audio utils
    │   ├── examples/            #   basic / streaming / integration samples
    │   └── tests/               #   unit + integration tests
    ├── osx-audio/               # Deno FFI bindings to the native capture library
    │   ├── src/bindings.ts      #   FFI surface
    │   └── test/                #   e2e capture tests
    └── ScreenCaptureKitBindings/# Swift package → compiles the capture .dylib
        ├── Package.swift
        └── Sources/             #   AudioCaptureActor, ScreenCaptureKit bindings
```

## 🛠️ Development

The TypeScript packages use Deno's built-in test runner. From a package directory:

```bash
# whisper-transcriber
cd packages/whisper-transcriber
deno task test            # full suite (unit + integration)
deno task test:unit       # unit tests only
deno task coverage        # generate coverage data

# audio-monitor
cd packages/audio-monitor
deno task test
deno task test:unit
```

Build the native macOS capture library. `osx-audio` loads the `.dylib` from
`ScreenCaptureKitBindings/.build/debug/`, which is produced by Swift Package Manager:

```bash
cd packages/ScreenCaptureKitBindings
swift build               # emits .build/debug/libScreenCaptureKitBindings.dylib
```

> **Note:** The test tasks and runtime were authored against an earlier Deno release. On current
> Deno you may need to update a few standard-library imports and type annotations before the full
> suite passes — see [Contributing](#-contributing).

## 🤝 Contributing

Contributions are welcome. Please:

1. Fork the repo and create a feature branch.
2. Keep changes focused and run `deno fmt` / `deno lint` on touched files.
3. Add or update tests for the package you change.
4. Open a pull request describing the change and how you verified it.

## 📄 License

[MIT](LICENSE) © 2026 Raul Cajias
