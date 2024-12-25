//
//  AudioCaptureActor.swift
//  -----------------------------------------------------------------------------
//  The actor that handles starting/stopping ScreenCaptureKit capture.
//  When data arrives, we forward it to AudioEventEmitter for distribution.
//
import Foundation
@preconcurrency import ScreenCaptureKit
import CoreMedia

actor AudioCaptureActor {
    private var scStream: SCStream?
    private let delegate = AudioCaptureDelegate()

    init() {
        delegate.audioActor = self
    }

    // Start capture for a given bundle ID
    func startCapture(for bundleID: String) async throws{
         do {
             let scContent = try await SCShareableContent.current
             print("AudioCaptureActor: Shareable content retrieved: \(scContent)")

             guard let app = scContent.applications.first(where: { $0.bundleIdentifier == bundleID }) else {
                 throw NSError(domain: "AudioCaptureActor", code: 1, userInfo: [NSLocalizedDescriptionKey: "App not found"])
             }
             print("AudioCaptureActor: App: \(app)")

             guard let display = scContent.displays.first else {
                 throw NSError(domain: "AudioCaptureActor", code: 2, userInfo: [NSLocalizedDescriptionKey: "No displays found"])
             }
             print("AudioCaptureActor: display: \(display)")

             let config = SCStreamConfiguration()
             config.capturesAudio = true
             if #available(macOS 15.0, *) {
                 config.captureMicrophone = true
             }

             let filter = SCContentFilter(display: display, including: [app], exceptingWindows: [])
             let stream = SCStream(filter: filter, configuration: config, delegate: delegate)
             print("AudioCaptureActor: Stream created: \(stream)")
             print("AudioCaptureActor: delegate \(delegate)")
             try await stream.startCapture()

             self.scStream = stream
             print("AudioCaptureActor: Capture started for \(bundleID)")
         } catch {
             print("AudioCaptureActor: Error starting capture - \(error.localizedDescription)")
             throw error
         }
     }

    // Stop capture if any
    func stopCapture() {
        guard let stream = scStream else {
            print("AudioCaptureActor: No active stream to stop.")
            return
        }
        stream.stopCapture { error in
            if let err = error {
                print("AudioCaptureActor: Error stopping capture - \(err.localizedDescription)")
                return
            }
            self.scStream = nil
            print("AudioCaptureActor: Capture stopped.")
        }
    }

    // Called by delegate with new PCM data
    func handlePCMData(_ data: Data) async {
        print("AudioCaptureActor: Received PCM data of size \(data.count)")
        // Forward to the event emitter for broadcasting
        await AudioEventEmitter.shared.emitData(data)
    }
}