import {resolve,dirname,fromFileUrl} from "@std/path"

type SwiftSymbols = {
  onData: Deno.ForeignFunction<["function"], "i32">;
  startCapture: Deno.ForeignFunction<["pointer"], "i32">;
  stopCapture: Deno.ForeignFunction<[], "void">;
};

// Dynamically resolve library path
const projectRoot = resolve(dirname(fromFileUrl(import.meta.url)));
const LIB_PATH = `${projectRoot}/../../ScreenCaptureKitBindings/.build/debug/libScreenCaptureKitBindings.dylib`;

// Deno FFI: Open the library
const { symbols } = Deno.dlopen<SwiftSymbols>(LIB_PATH, {
  onData: { parameters: ["function"], result: "i32" },
  startCapture: { parameters: ["pointer"], result: "i32" },
  stopCapture: { parameters: [], result: "void" },
});

/** Register a callback to receive audio data */
export function onData(callback: (chunk: Uint8Array) => void): number | Promise<number> {
  const rawCallback = new Deno.UnsafeCallback(
      {
        parameters: ["pointer", "i32"],
        result: "void",
      },
      (dataPtr: Deno.PointerValue, length: number) => {
        if (!dataPtr || length <= 0) {
          console.log(`Invalid data pointer or length: ${dataPtr} ${length}`);
          return;
        }
        const chunk = new Uint8Array(Deno.UnsafePointerView.getArrayBuffer(dataPtr, length));
        console.log("Received audio chunk of size:", chunk.length);
        callback(chunk);
      }
  );

  const result = symbols.onData(rawCallback.pointer);
  rawCallback.close(); // Cleanup after use
  return result;
}


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
  const result = symbols.startCapture(ptr);
  console.log("startAudioCapture result:", result)

  return result as number;
}

/** Stop audio capture */
export function stopAudioCapture(): void | Promise<void> {
  return symbols.stopCapture();
}