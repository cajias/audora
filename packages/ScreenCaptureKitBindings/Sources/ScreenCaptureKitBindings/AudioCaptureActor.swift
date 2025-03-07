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
    
    // Dictionary to store callback functions by ID
    private var callbacks: [UUID: @Sendable (Data) -> Void] = [:]
    
    init() {
        delegate.audioActor = self
    }

    func onData(_ subscriptionID: UUID, _ callback: @Sendable @escaping (Data) -> Void) {
        callbacks[subscriptionID] = callback
        print("AudioCaptureActor: Registered callback with ID \(subscriptionID), total callbacks: \(callbacks.count)")
    }
    
    func unsubscribeFromAudioData(_ subscriptionID: UUID) {
        callbacks.removeValue(forKey: subscriptionID)
        print("AudioCaptureActor: Removed callback with ID \(subscriptionID), remaining callbacks: \(callbacks.count)")
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
            
            // Audio configuration
            config.capturesAudio = true
            config.excludesCurrentProcessAudio = false
            
            // Use app filter for now as it's more reliable
            let filter = SCContentFilter(display: display, including: [app], exceptingWindows: [])
            print("Filter style: \(filter.style)")
            
            let stream = SCStream(filter: filter, configuration: config, delegate: delegate)
            try stream.addStreamOutput(delegate, type: .audio, sampleHandlerQueue: audioSampleBufferQueue)
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
    /// Calls all registered callbacks with the data
    func handlePCMData(_ data: Data) async {
        logger.info("AudioCaptureActor: Received PCM data of size \(data.count)")
        print("AudioCaptureActor: Sending PCM data of size \(data.count) to \(callbacks.count) callbacks")
        
        // Call each registered callback with the data
        for (id, callback) in callbacks {
            print("AudioCaptureActor: Calling callback \(id) with data")
            callback(data)
        }
    }
}