/**
 * Load the compiled dynamic library. Adjust the path as needed.
 * If you're in this same directory after building, it might be `./build/libaudiocap.dylib`.
 */
const LIB_PATH = new URL("../build/libaudiocap.dylib", import.meta.url).pathname;

export const dylib = Deno.dlopen(LIB_PATH, {
  startAudioCapture: {
    parameters: ["pointer"], // Correct parameter type
    result: "i32",           // Correct result type
  },
  readAudioFrame: {
    parameters: ["pointer", "i32"], // Correct parameter types
    result: "i32",                  // Correct result type
  },
  stopAudioCapture: {
    parameters: [],
    result: "void",                 // Correct result type
  },
} as const);
/**
 * Start capturing audio from a macOS application identified by `bundleId`.
 *
 * @param bundleId e.g. "com.apple.Music"
 * @returns 0 on success, -1 on failure
 */
export async function startCapture(bundleId: string): Promise<number> {
  const encoder = new TextEncoder();
  const cString = encoder.encode(bundleId + "\0"); // Null-terminate
  const ptr = Deno.UnsafePointer.of(cString);

  if (!ptr) {
    return -1;
  }

  return dylib.symbols.startAudioCapture(ptr);
}

/**
 * Read PCM data into the provided `buffer`.
 *
 * @param buffer A Uint8Array to store the PCM data.
 * @returns The number of bytes actually read.
 */
export async function readFrame(buffer: Uint8Array): Promise<number> {
  const ptr = Deno.UnsafePointer.of(buffer);

  if (!ptr) {
    return -1
  }

  return dylib.symbols.readAudioFrame(ptr, buffer.length);
}

/**
 * Stop the ongoing audio capture.
 */
export async function stopCapture(): Promise<void> {
  dylib.symbols.stopAudioCapture();
}
