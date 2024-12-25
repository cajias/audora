//
//  AudioCaptureActor.swift
//  An actor that owns the ring buffer, SCStream, and delegate.
//  All reads/writes to the ring buffer go through actor methods.
//
import Foundation
import ScreenCaptureKit
import CoreMedia

actor AudioCaptureActor {
    // Internal state
    private let ringBuffer = AudioRingBuffer(capacity: 2_097_152) // ~2MB
    private var scStream: SCStream?
    private let delegate = AudioCaptureDelegate()

    // The delegate sends raw PCM data back to us via a closure.
    // We capture self weakly to avoid strong reference cycles.
    init() {
        delegate.onAudioData = { [weak self] pcmData in
            // We must hop into the actor context to write safely.
            Task {
                guard let self = self else { return }
                await self.writeToRingBuffer(pcmData)
            }
        }
    }

    // MARK: - Actor Methods

    func startCapture(for bundleID: String) {
        SCShareableContent.getWithCompletionHandler { shareableContent, error in
            if let error = error {
                print("AudioCaptureActor: Failed to retrieve shareable content - \(error.localizedDescription)")
                return
            }
            guard let scContent = shareableContent else {
                print("AudioCaptureActor: No shareable content returned.")
                return
            }

            // Find the matching application
            guard let app = scContent.applications.first(where: { $0.bundleIdentifier == bundleID }) else {
                print("AudioCaptureActor: Application not found: \(bundleID)")
                return
            }

            // Capture the main display
            guard let display = scContent.displays.first else {
                print("AudioCaptureActor: No displays found.")
                return
            }

            let config = SCStreamConfiguration()
            config.capturesAudio = true
            config.captureMicrophone = true

            let filter = SCContentFilter(display: display,
                                         including: [app],
                                         exceptingWindows: [])
            let stream = SCStream(filter: filter,
                                  configuration: config,
                                  delegate: self.delegate)

            // startCapture() isn't throwing in newer ScreenCaptureKit
            stream.startCapture()
            self.scStream = stream
            print("AudioCaptureActor: Capture started for \(bundleID)")
        }
    }

    func stopCapture() {
        guard let stream = scStream else {
            print("AudioCaptureActor: No active stream to stop.")
            return
        }
        stream.stopCapture { error in
            if let err = error {
                print("AudioCaptureActor: Error stopping capture - \(err.localizedDescription)")
            } else {
                self.scStream = nil
                print("AudioCaptureActor: Capture stopped.")
            }
        }
    }

    /// Write PCM data into the ring buffer, inside the actor context.
    func writeToRingBuffer(_ data: Data) {
        data.withUnsafeBytes { ptr in
            if let base = ptr.baseAddress?.assumingMemoryBound(to: UInt8.self) {
                ringBuffer.write(base, length: data.count)
            }
        }
    }

    /// Reads from the ring buffer in a synchronous manner.
    /// Used by bridging for readAudioFrame.
    func readAudioFrame(bufferPtr: UnsafeMutableRawPointer?, size: Int) -> Int {
        // The ring buffer expects an UnsafePointer<UInt8>
        let dest = bufferPtr?.bindMemory(to: UInt8.self, capacity: size)
        return ringBuffer.read(dest, maxLength: size)
    }

    // MARK: - Nested Delegate

    /// A private class that receives audio sample buffers from SCStream.
    /// We push the raw PCM data back to the actor with onAudioData callback.
    private final class AudioCaptureDelegate: NSObject, SCStreamDelegate {
        var onAudioData: ((Data) -> Void)?

        func stream(_ stream: SCStream,
                    didOutput sampleBuffer: CMSampleBuffer,
                    of type: SCStreamOutputType)
        {
            guard type == .audio else { return }
            guard let data = extractPCMData(from: sampleBuffer) else { return }
            onAudioData?(data)
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
}