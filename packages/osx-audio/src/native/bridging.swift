import Foundation
import ScreenCaptureKit
import CoreMedia

// MARK: - AudioRingBuffer

// The @unchecked Sendable tells the compiler we manually ensure thread safety.
// Because we use NSLock for synchronization, we can assert it's safe.
// Marking the class as final prevents subclassing, aiding in concurrency safety.
final class AudioRingBuffer: @unchecked Sendable {
    private var buffer: [UInt8]
    private var writeIndex: Int
    private var readIndex: Int
    private let capacity: Int
    private let lock = NSLock()

    init(capacity: Int) {
        self.capacity = capacity
        self.buffer = [UInt8](repeating: 0, count: capacity)
        self.writeIndex = 0
        self.readIndex = 0
    }

    func write(_ data: UnsafePointer<UInt8>?, length: Int) {
        guard let data = data, length > 0 else { return }

        lock.lock()
        defer { lock.unlock() }

        for i in 0..<length {
            buffer[writeIndex] = data[i]
            writeIndex = (writeIndex + 1) % capacity
            if writeIndex == readIndex {
                // Overwrite oldest data if the buffer is full
                readIndex = (readIndex + 1) % capacity
            }
        }
    }

    func read(_ dest: UnsafeMutablePointer<UInt8>?, maxLength: Int) -> Int {
        guard let dest = dest, maxLength > 0 else { return 0 }

        lock.lock()
        defer { lock.unlock() }

        var bytesRead = 0
        while bytesRead < maxLength && readIndex != writeIndex {
            dest[bytesRead] = buffer[readIndex]
            readIndex = (readIndex + 1) % capacity
            bytesRead += 1
        }

        return bytesRead
    }
}

// MARK: - Global State

// Global ring buffer for audio data
let globalAudioBuffer = AudioRingBuffer(capacity: 2_097_152) // ~2MB

// Global SCStream
var globalSCStream: SCStream?

// MARK: - AudioCaptureDelegate

// Mark @unchecked Sendable to bypass Swift's concurrency checks, but be sure
// your usage of SCStreamDelegate is thread-safe in practice.
final class AudioCaptureDelegate: NSObject, SCStreamDelegate, @unchecked Sendable {
    func stream(_ stream: SCStream, didOutput sampleBuffer: CMSampleBuffer, of type: SCStreamOutputType) {
        guard type == .audio else { return }
        guard let data = extractPCMData(from: sampleBuffer) else { return }

        data.withUnsafeBytes { ptr in
            if let base = ptr.baseAddress?.assumingMemoryBound(to: UInt8.self) {
                globalAudioBuffer.write(base, length: data.count)
            }
        }
    }

    private func extractPCMData(from sampleBuffer: CMSampleBuffer) -> Data? {
        guard let blockBuffer = CMSampleBufferGetDataBuffer(sampleBuffer) else {
            return nil
        }

        var lengthAtOffset = 0
        var totalLength = 0
        var dataPointer: UnsafeMutablePointer<Int8>?

        let status = CMBlockBufferGetDataPointer(blockBuffer,
                                                 0,
                                                 &lengthAtOffset,
                                                 &totalLength,
                                                 &dataPointer)
        guard status == kCMBlockBufferNoErr, let dataPointer = dataPointer else {
            return nil
        }

        return Data(bytes: dataPointer, count: totalLength)
    }
}

// Global delegate instance
let globalDelegate = AudioCaptureDelegate()

// MARK: - C-Callable API

@_cdecl("startAudioCapture")
public func startAudioCapture(_ bundleID: UnsafePointer<CChar>?) -> Int32 {
    guard let bundleID = bundleID else {
        print("startAudioCapture: No bundle ID provided.")
        return -1
    }
    let bundleStr = String(cString: bundleID)

    let workItem = DispatchWorkItem(qos: .userInitiated, flags: []) {
        SCShareableContent.getWithCompletionHandler { shareableContent, error in
            if let error = error {
                print("startAudioCapture: Failed to retrieve shareable content - \(error.localizedDescription)")
                return
            }
            guard let scContent = shareableContent else {
                print("startAudioCapture: No shareable content returned.")
                return
            }

            guard let app = scContent.applications.first(where: { $0.bundleIdentifier == bundleStr }) else {
                print("startAudioCapture: Application not found: \(bundleStr)")
                return
            }

            guard let targetDisplay = scContent.displays.first else {
                print("startAudioCapture: No displays found.")
                return
            }

            let config = SCStreamConfiguration()
            config.capturesAudio = true
            config.captureMicrophone = true

            let filter = SCContentFilter(display: targetDisplay,
                                         including: [app],
                                         exceptingWindows: [])

            let scStream = SCStream(filter: filter, configuration: config, delegate: globalDelegate)

            // startCapture() is no longer throwing in recent ScreenCaptureKit,
            // so remove "try" and "catch" blocks to avoid warnings
            scStream.startCapture()
            globalSCStream = scStream
            print("startAudioCapture: Audio capture started for \(bundleStr)")
        }
    }

    DispatchQueue.global(qos: .userInitiated).async(execute: workItem)

    return 0
}

@_cdecl("readAudioFrame")
public func readAudioFrame(_ bufferPtr: UnsafeMutableRawPointer?, _ bufferSize: Int32) -> Int32 {
    guard let bufferPtr = bufferPtr, bufferSize > 0 else {
        return 0
    }
    let dest = bufferPtr.bindMemory(to: UInt8.self, capacity: Int(bufferSize))
    let bytesRead = globalAudioBuffer.read(dest, maxLength: Int(bufferSize))
    return Int32(bytesRead)
}

@_cdecl("stopAudioCapture")
public func stopAudioCapture() {
    guard let scStream = globalSCStream else {
        print("stopAudioCapture: No active stream to stop.")
        return
    }
    scStream.stopCapture { error in
        if let e = error {
            print("stopAudioCapture: Error stopping capture - \(e.localizedDescription)")
        } else {
            globalSCStream = nil
            print("stopAudioCapture: Audio capture stopped.")
        }
    }
}