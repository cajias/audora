//
//  AudioCaptureDelegate.swift
//  -----------------------------------------------------------------------------
//  An NSObject that implements SCStreamDelegate. Receives sample buffers,
//  extracts PCM data, and notifies AudioCaptureActor.
//
import Foundation
import ScreenCaptureKit
import CoreMedia

final class AudioCaptureDelegate: NSObject, SCStreamDelegate {
    // A weak reference to the actor so we don’t create a retain cycle
    weak var audioActor: AudioCaptureActor?

    func stream(_ stream: SCStream, didOutput sampleBuffer: CMSampleBuffer, of type: SCStreamOutputType) async {
        print("AudioCaptureDelegate didOutput \(sampleBuffer)")
        guard type == .audio else { return }
        guard let data = extractPCMData(from: sampleBuffer) else { return }
        await audioActor?.handlePCMData(data)
    }

    func streamDidBecomeActive(_ stream: SCStream){
        print("AudioCaptureDelegate streamDidBecomeActive")
    }

    private func extractPCMData(from sampleBuffer: CMSampleBuffer) -> Data? {
        print("AudioCaptureDelegate extractPCMData \(sampleBuffer)")
        guard let blockBuffer = CMSampleBufferGetDataBuffer(sampleBuffer) else {
            return nil
        }

        var lengthAtOffset = 0
        var totalLength = 0
        var dataPointer: UnsafeMutablePointer<Int8>?

        let status = CMBlockBufferGetDataPointer(
            blockBuffer,
            atOffset: 0,
            lengthAtOffsetOut: &lengthAtOffset,
            totalLengthOut: &totalLength,
            dataPointerOut: &dataPointer
        )
        guard status == kCMBlockBufferNoErr, let dataPointer = dataPointer else {
            return nil
        }

        return Data(bytes: dataPointer, count: totalLength)
    }
}