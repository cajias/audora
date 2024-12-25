type SwiftSymbols = {
  registerOnDataCallback: Deno.ForeignFunction<["function", "pointer"], "i32">;
  startAudioCapture: Deno.ForeignFunction<["pointer"], "i32">;
  stopAudioCapture: Deno.ForeignFunction<[], "void">;
};

// Dynamically resolve library path
const LIB_PATH = new URL("../build/universal/libaudiocap.dylib", import.meta.url).pathname;

// Deno FFI: Open the library
const { symbols } = Deno.dlopen<SwiftSymbols>(LIB_PATH, {
  registerOnDataCallback: { parameters: ["function", "pointer"], result: "i32" },
  startAudioCapture: { parameters: ["pointer"], result: "i32" },
  stopAudioCapture: { parameters: [], result: "void" },
});

/** Register a callback to receive audio data */
export function registerOnDataCallback(onData: (chunk: Uint8Array) => void): number | Promise<number> {
  const rawCallback = new Deno.UnsafeCallback(
      {
        parameters: ["pointer", "pointer", "i32"],
        result: "void",
      },
      (_userContext: Deno.PointerValue, dataPtr: Deno.PointerValue, length: number) => {
        if (!dataPtr || length <= 0) {
          console.log(`Invalid data pointer or length: ${dataPtr} ${length}`);
          return;
        }
        const chunk = new Uint8Array(Deno.UnsafePointerView.getArrayBuffer(dataPtr, length));
        console.log("Received audio chunk of size:", chunk.length);
        onData(chunk);
      }
  );

  const result = symbols.registerOnDataCallback(rawCallback.pointer, null);
  rawCallback.close(); // Cleanup after use
  return result;
}

/** Start audio capture for the given bundle ID */
export function startAudioCapture(bundleID: string): number {
  if (!bundleID) {
    throw new Error("Bundle ID cannot be empty.");
  }

  // Encode the bundle ID as a null-terminated C string
  const bytes = new TextEncoder().encode(bundleID + "\0");

  // Allocate memory for the string
  const memory = new Uint8Array(bytes.length);
  memory.set(bytes);

  // Get a pointer to the allocated memory
  const ptr = Deno.UnsafePointer.of(memory);

  if (!ptr) {
    throw new Error("Failed to get a pointer to the bundle ID.");
  }

  // Call the FFI function
  const result = symbols.startAudioCapture(ptr);
  console.log("startAudioCapture result:", result)

  return result as number;
}

/** Stop audio capture */
export function stopAudioCapture(): void | Promise<void> {
  return symbols.stopAudioCapture();
}