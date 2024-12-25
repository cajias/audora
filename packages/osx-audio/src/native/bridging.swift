//
//  bridging.swift
//  Exports C-callable functions for start, read, and stop capture.
//
import Foundation

// A single shared actor instance. This replaces global variables.
private let audioCaptureActor = AudioCaptureActor()

@_cdecl("startAudioCapture")
public func startAudioCapture(_ bundleID: UnsafePointer<CChar>?) -> Int32 {
    guard let bundleID = bundleID else {
        print("startAudioCapture: No bundle ID provided.")
        return -1
    }
    let bundleStr = String(cString: bundleID)

    // Fire-and-forget approach
    Task.detached {
        await audioCaptureActor.startCapture(for: bundleStr)
    }
    return 0
}

@_cdecl("readAudioFrame")
public func readAudioFrame(_ bufferPtr: UnsafeMutableRawPointer?, _ bufferSize: Int32) -> Int32 {
    guard let bufferPtr = bufferPtr, bufferSize > 0 else {
        return 0
    }

    // We need to read from the actor. We'll do a small synchronous wait:
    var bytesRead = 0
    let group = DispatchGroup()
    group.enter()

    Task.detached {
        bytesRead = await audioCaptureActor.readAudioFrame(bufferPtr: bufferPtr, size: Int(bufferSize))
        group.leave()
    }
    group.wait() // block until read completes

    return Int32(bytesRead)
}

@_cdecl("stopAudioCapture")
public func stopAudioCapture() {
    // Fire-and-forget approach
    Task.detached {
        await audioCaptureActor.stopCapture()
    }
}