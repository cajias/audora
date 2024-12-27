//
//  bridging.swift
//  ScreenCaptureKitBindings
//
//  Created by Cajias, Raul on 27.12.24.
//


import Foundation
import Combine
import OSLog

let logger = Logger(subsystem: "io.cajias.audora", category: "bridging")
/// A public typealias so that external code (C/FFI) can reference and provide this callback.
public typealias OnDataCallback = @convention(c) (
    /* raw bytes */ UnsafePointer<UInt8>?,
    /* length    */ Int32
) -> Void

struct CallbackContextWrapper: @unchecked Sendable {
    let callback: OnDataCallback
}

fileprivate let captureActor = AudioCaptureActor()

// MARK: - Public C-Callable Functions
@_cdecl("onData")
public func onData(_ callback: OnDataCallback?) -> UnsafeMutableRawPointer? {
    logger.info("onData called")
    guard let callback = callback else {
        logger.error("subscribeAudioData: No callback provided.")
        return nil
    }
    let wrapper = CallbackContextWrapper(callback: callback)

    let subscriptionID = UUID()
    
    Task {
        await captureActor.onData(subscriptionID,  { data in
            logger.info("\(subscriptionID) received data \(data)")
            data.withUnsafeBytes { bufferPointer in
                let length = Int32(bufferPointer.count)
                let baseAddr = bufferPointer.baseAddress?.assumingMemoryBound(to: UInt8.self)
                wrapper.callback(baseAddr, length)
            }
        })
    }

    // Return a pointer to the retained UUID so TS can pass it back later to cancel
    return UnsafeMutableRawPointer(Unmanaged.passRetained(subscriptionID.uuidString as NSString).toOpaque())
}

@_cdecl("cancelSubscription")
public func cancelSubscription(_ subscriptionIDPtr: UnsafeMutableRawPointer?) {
    guard let subscriptionIDPtr = subscriptionIDPtr else { return }
    let subscriptionIDString = Unmanaged<NSString>.fromOpaque(subscriptionIDPtr).takeRetainedValue() as String
    guard let subscriptionID = UUID(uuidString: subscriptionIDString) else {
           logger.error("cancelAudioDataSubscription: Invalid UUID string: \(subscriptionIDString)")
           return
       }
    Task {
        await captureActor.unsubscribeFromAudioData(subscriptionID)
    }
}

/// Starts audio capture for a given application (by bundle ID).
@_cdecl("startCapture")
public func startCapture(_ bundleID: UnsafePointer<CChar>?) -> Int32 {
    logger.info("starting audio capture")
    guard let bundleID = bundleID else {
        logger.error("startAudioCapture: No bundle ID provided.")
        return -1
    }
    let bundleStr = String(cString: bundleID)

    Task {
        do {
            try await captureActor.startCapture(for: bundleStr)
        } catch {
            logger.error("Error starting audio capture: \(error)")
        }
    }
    return 0
}

/// Stops the current audio capture session.
@_cdecl("stopCapture")
public func stopCapture() {
    Task {
        await captureActor.stopCapture()
    }
}
