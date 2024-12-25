# `osx-audio`: A macOS Audio Capture Module for Deno

This module provides macOS audio capture capabilities using Apple's **ScreenCaptureKit** (available in macOS 12.3+). It
compiles Swift code into a `.dylib` that you can call from **Deno** via **FFI**.

## Features

1. **Capture App-Specific Audio** using ScreenCaptureKit.
2. **Simple Deno API** with `startCapture`, `readFrame`, and `stopCapture`.
3. **Thread-Safe Ring Buffer** in Swift for smooth data flow.

## Requirements

- **macOS 12.3+**
- **Xcode** or **Xcode Command-Line Tools**
- **Deno v1.28+** (recommended)
- **CMake** (for building the Swift library)

## Build Steps

1. **Navigate** to this directory:

   ```bash
   cd packages/osx-audio
   ```

2. **Build** the .dylib:
   ```shell
   mkdir -p build
   cd build
   cmake ..
   cmake --build .
   cd ..
   ```

The resulting `libaudiocap.dylib` will be located in `build/` (e.g., `build/libaudiocap.dylib`).

3. **Grant Screen Recording Permission:**

- macOS will prompt you at runtime.
- Alternatively, go to System Settings → Privacy & Security → Screen Recording and allow the terminal or app that runs
  Deno.

4. Use the Module:

- From another Deno module, import and invoke:
  ```ts
  import { readFrame, startCapture, stopCapture } from "./mod.ts";

  await startCapture("com.apple.Music");

  const buffer = new Uint8Array(4096);
  const bytesRead = await readFrame(buffer);

  await stopCapture();
  ```

## Usage Examples

```shell
deno run --allow-ffi --allow-read --allow-write examples/capture_example.ts
```

(where `capture_example.ts` imports `osx-audio` and does the steps above)

## Troubleshooting

### 1. xcode-select: error: tool 'xcodebuild' requires Xcode

If you encounter an error similar to:
```shell
xcode-select: error: tool 'xcodebuild' requires Xcode, but active developer directory '/Library/Developer/CommandLineTools' is a command line tools instance
```
it means **CMake is looking for the full Xcode environment**, but your system is pointed to the Command-Line Tools only. You can fix this by:
1.	Installing or opening the full Xcode app (via the Mac App Store or developer.apple.com).
2.	Switching the active developer directory to Xcode:
    ```shell
    sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
    ```
3. Verifying that the switch worked:
```shell
xcode-select -p
```
It should print something like:
```shell
/Applications/Xcode.app/Contents/Developer
```
4.	Re-run your build commands (e.g., make or the cmake commands).

### 2. Other Swift Compiler Issues
* Check your swiftc: Run which swiftc and ensure it points to a valid path under Xcode.
* Update CMake: Use CMake 3.16+ to ensure better Swift support.

## Known Limitations

- macOS Only: Requires `ScreenCaptureKit`, which is only on macOS 12.3 or higher.
- Single Capture Session: This example is designed for one capture session at a time. For advanced multi-session
  support, further modifications may be needed.
