//
//  AudioEventEmitter.swift
//  -----------------------------------------------------------------------------
//  Manages listeners interested in PCM audio data events.
//  This code was originally duplicating "AudioCaptureActor," causing redeclaration.
//  Now it's a separate actor named "AudioEventEmitter."
//
//  Hardened & Concurrency-safe:
//  - We store closures in an actor to avoid locks or global mutable state.
//  - Each listener is identified by a UUID.
//
import Foundation
import CoreMedia  // If needed by bridging

/// An actor that broadcasts PCM data to registered listeners.
actor AudioEventEmitter {
    static let shared = AudioEventEmitter()

    private var listeners: [UUID: (Data) -> Void] = [:]

    /// Adds a listener closure that is invoked whenever audio data is emitted.
    /// - Parameter listener: A closure accepting `Data` (PCM data).
    /// - Returns: A UUID identifying this listener (for removal later).
    func addListener(_ listener: @escaping (Data) -> Void) -> UUID {
        let id = UUID()
        print("Listener \(id)")
        listeners[id] = listener
        return id
    }

    /// Removes a listener by its UUID.
    /// - Parameter id: The ID returned by `addListener`.
    func removeListener(_ id: UUID) {
        listeners.removeValue(forKey: id)
    }

    // MARK: - Emitting Audio Data

    /// Notifies all registered listeners about new PCM data.
    /// - Parameter data: Raw PCM audio data.
    func emitData(_ data: Data) {
        print(data)
        for listener in listeners.values {
            listener(data)
        }
    }
}