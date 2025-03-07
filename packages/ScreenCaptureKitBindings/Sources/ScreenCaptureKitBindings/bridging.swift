import Foundation
import OSLog

// Logger for debugging
let logger = Logger(subsystem: "io.cajias.audora", category: "FFI")

// Create a singleton actor for audio capture
let captureActor = AudioCaptureActor()

// Define the callback type for audio data
public typealias OnDataCallback = @convention(c) (UnsafePointer<UInt8>?, Int32) -> Void

// Wrapper to hold the callback function
class CallbackContextWrapper: @unchecked Sendable {
    let callback: OnDataCallback
    
    init(callback: @escaping OnDataCallback) {
        self.callback = callback
    }
}

@_cdecl("onData")
public func onData(_ callback: OnDataCallback?) -> UnsafeMutableRawPointer? {
    logger.info("onData called")
    guard let callback = callback else {
        logger.error("subscribeAudioData: No callback provided.")
        return nil
    }
    
    // Create a wrapper that will be retained
    let wrapper = CallbackContextWrapper(callback: callback)
    let subscriptionID = UUID()
    print("Registering callback with ID: \(subscriptionID)")
    
    // Create a callback that will be passed to the actor
    let dataCallback: @Sendable (Data) -> Void = { data in
        logger.info("\(subscriptionID) received data of size \(data.count)")
        print("Callback received data of size: \(data.count)")
        
        data.withUnsafeBytes { bufferPointer in
            let length = Int32(bufferPointer.count)
            let baseAddr = bufferPointer.baseAddress?.assumingMemoryBound(to: UInt8.self)
            print("Invoking C callback with data length: \(length)")
            wrapper.callback(baseAddr, length)
        }
    }
    
    Task {
        await captureActor.onData(subscriptionID, dataCallback)
    }

    // Return a pointer to the retained UUID so TS can pass it back later to cancel
    return UnsafeMutableRawPointer(Unmanaged.passRetained(subscriptionID.uuidString as NSString).toOpaque())
}

@_cdecl("startCapture")
public func startCapture(_ bundleIDPtr: UnsafePointer<CChar>?) -> Int32 {
    guard let bundleIDPtr = bundleIDPtr else {
        logger.error("startCapture: No bundle ID provided.")
        return -1
    }
    
    let bundleID = String(cString: bundleIDPtr)
    logger.info("startCapture called for \(bundleID)")
    
    Task {
        do {
            try await captureActor.startCapture(for: bundleID)
        } catch {
            logger.error("startCapture: Error - \(error.localizedDescription)")
        }
    }
    
    return 0
}

@_cdecl("stopCapture")
public func stopCapture() {
    logger.info("stopCapture called")
    Task {
        await captureActor.stopCapture()
    }
}