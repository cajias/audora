//
//  AudioRingBuffer.swift
//  Simple ring buffer with NSLock for thread safety.
//  Used exclusively inside the AudioCaptureActor.
//
import Foundation

final class AudioRingBuffer {
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
                // Overwrite the oldest data if the buffer is full
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