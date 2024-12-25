/**
 * mod.ts
 *
 * Public API for the `osx-audio` module.
 * Exports the Deno FFI bindings that allow capturing macOS audio via ScreenCaptureKit.
 */

export { readFrame, startCapture, stopCapture } from "./src/bindings.ts";
