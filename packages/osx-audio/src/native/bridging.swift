import Foundation

/// A public typealias so that external code (C/FFI) can reference and provide this callback.
public typealias OnDataCallback = @convention(c) (
    /* userData */ UnsafeMutableRawPointer?,
    /* raw bytes */ UnsafePointer<UInt8>?,
    /* length    */ Int32
) -> Void


// A fileprivate global instance of the bridging callback actor.
fileprivate let bridgingCallbackActor = BridgingCallbackActor()

// If you have your AudioCaptureActor defined elsewhere, ensure it's accessible here.
// We'll assume it's internal or public. We'll reference it here as fileprivate.
fileprivate let audioCaptureActor = AudioCaptureActor()

// MARK: - Public C-Callable Functions

/// Registers a callback for receiving audio data. This is the entry point from your
/// TypeScript (Deno) or C-based FFI. We store the callback in an `@unchecked Sendable`
/// wrapper and hand it off to `BridgingCallbackActor`.
@_cdecl("registerOnDataCallback")
public func registerOnDataCallback( _ callback: @escaping OnDataCallback, _ userContext: UnsafeMutableRawPointer?) -> Int32 {
    // Wrap the callback + context in our @unchecked Sendable struct.
    let wrapper = CallbackContextWrapper(callback: callback, userContext: userContext)

    // Fire a task to register & attach the listener. Non-blocking approach.
    Task.detached{
        await bridgingCallbackActor.registerCallback(wrapper: wrapper)
        await bridgingCallbackActor.attachListener()
    }
    // Return success code
    return 0
}

/// Starts audio capture for a given application (by bundle ID).
@_cdecl("startAudioCapture")
public func startAudioCapture(_ bundleID: UnsafePointer<CChar>?) -> Int32 {
    guard let bundleID = bundleID else {
        print("startAudioCapture: No bundle ID provided.")
        return -1
    }
    let bundleStr = String(cString: bundleID)

    Task {
        do {
            try await audioCaptureActor.startCapture(for: bundleStr)
        } catch {
            print("Error starting audio capture: \(error)")
        }
    }
    return 0
}

/// Stops the current audio capture session.
@_cdecl("stopAudioCapture")
public func stopAudioCapture() {
    Task {
        await audioCaptureActor.stopCapture()
    }
}
