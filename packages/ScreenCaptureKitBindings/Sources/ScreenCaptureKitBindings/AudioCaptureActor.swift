//
//  AudioCaptureActor.swift
//  -----------------------------------------------------------------------------
//  The actor that handles starting/stopping ScreenCaptureKit capture.
//  When data arrives, we publish it via Combine so subscribers can process PCM data.
//
import Foundation
@preconcurrency import ScreenCaptureKit
import CoreMedia
import OSLog
import Combine


actor AudioCaptureActor {
    private let logger = Logger(subsystem: "io.cajias.audora", category: "AudioCaptureDelegate")
    private var scStream: SCStream?
    private let delegate = AudioCaptureDelegate()
    private let videoSampleBufferQueue = DispatchQueue(label: "io.cajias.audora.VideoSampleBufferQueue")
    private let audioSampleBufferQueue = DispatchQueue(label: "io.cajias.audora.AudioSampleBufferQueue")
    private let micSampleBufferQueue = DispatchQueue(label: "io.cajias.audora.MicSampleBufferQueue")
    var subscriptions: [UUID: AnyCancellable] = [:]

    /// A Combine subject for emitting audio data.
    private let audioDataSubject = PassthroughSubject<Data, Never>()
    
    init() {
        delegate.audioActor = self
    }

        
    func onData(_ subscriptionID: UUID,_ callback: @escaping ((Data) -> Void)) -> Void {
        let cancellable = audioDataSubject.sink(receiveValue: callback)
        subscriptions[subscriptionID]  = cancellable
    }
    
    func unsubscribeFromAudioData(_ subscriptionID: UUID) -> Void {
        subscriptions[subscriptionID]?.cancel()
        subscriptions[subscriptionID] = nil
    }
    
    // MARK: - Capture Lifecycle

    /// Start capture for a given bundle ID
    func startCapture(for bundleID: String) async throws {
        do {
            let scContent = try await SCShareableContent.current
            logger.info("AudioCaptureActor: Shareable content retrieved: \(scContent)")

            guard let app = scContent.applications.first(where: { $0.bundleIdentifier == bundleID }) else {
                throw NSError(domain: "AudioCaptureActor", code: 1, userInfo: [
                    NSLocalizedDescriptionKey: "App not found"
                ])
            }
            print("AudioCaptureActor: App: \(app)")

            guard let display = scContent.displays.first else {
                throw NSError(domain: "AudioCaptureActor", code: 2, userInfo: [
                    NSLocalizedDescriptionKey: "No displays found"
                ])
            }
            print("AudioCaptureActor: Display: \(display)")

            let config = SCStreamConfiguration()
            config.capturesAudio = true
            if #available(macOS 15.0, *) {
                config.captureMicrophone = true
                config.microphoneCaptureDeviceID = AVCaptureDevice.default(for: .audio)?.uniqueID
            }

            let filter = SCContentFilter(display: display, including: [app], exceptingWindows: [])
            print("Filter style: \(filter.style)")
            let stream = SCStream(filter: filter, configuration: config, delegate: delegate)
            try stream.addStreamOutput(delegate, type: .audio, sampleHandlerQueue: audioSampleBufferQueue)
            try stream.addStreamOutput(delegate, type: .microphone, sampleHandlerQueue: micSampleBufferQueue)
            try stream.addStreamOutput(delegate, type: .screen, sampleHandlerQueue: videoSampleBufferQueue)
            print("AudioCaptureActor: Stream created: \(stream)")

            try await stream.startCapture()
            self.scStream = stream
            print("AudioCaptureActor: Capture started for \(bundleID)")
        } catch {
            logger.error("AudioCaptureActor: Error starting capture - \(error.localizedDescription)")
            throw error
        }
    }

    /// Stop capture if running
    func stopCapture() {
        guard let stream = scStream else {
            logger.info("AudioCaptureActor: No active stream to stop.")
            return
        }
        stream.stopCapture { error in
            if let err = error {
                self.logger.error("AudioCaptureActor: Error stopping capture - \(err.localizedDescription)")
                return
            }
            self.scStream = nil
            self.logger.info("AudioCaptureActor: Capture stopped.")
        }
    }

    // MARK: - Handling PCM Data

    /// Called by delegate with new PCM data.
    /// Publishes data to `audioDataSubject` for all subscribers.
    func handlePCMData(_ data: Data) async {
        logger.info("AudioCaptureActor: Received PCM data of size \(data.count)")
        audioDataSubject.send(data)
    }
}
