import Foundation
import ScreenCaptureKit
import CoreMedia
import AVFoundation
import OSLog

class AudioCaptureDelegate: NSObject, SCStreamDelegate, SCStreamOutput {
    private let logger = Logger(subsystem: "io.cajias.audora", category: "AudioCaptureDelegate")
    weak var audioActor: AudioCaptureActor?
    var audioFormat: AVAudioFormat?
    
    func stream(_ stream: SCStream, didOutputSampleBuffer sampleBuffer: CMSampleBuffer, of type: SCStreamOutputType) {
        print("AudioCaptureDelegate didOutput type: \(type)")
        switch type {
        case .screen:
            print("Not handling screen output")
        case .audio:
            // Debug audio format if we haven't already
            if audioFormat == nil, let formatDescription = CMSampleBufferGetFormatDescription(sampleBuffer) {
                let asbd = CMAudioFormatDescriptionGetStreamBasicDescription(formatDescription)
                if let asbd = asbd {
                    print("Audio format: \(asbd.pointee.mSampleRate) Hz, \(asbd.pointee.mChannelsPerFrame) channels, format ID: \(asbd.pointee.mFormatID)")
                    audioFormat = AVAudioFormat(streamDescription: asbd)
                    print("AVAudioFormat: \(String(describing: audioFormat))")
                }
            }
            
            // Check if the sample buffer has actual data
            let hasDataBuffer = CMSampleBufferGetDataBuffer(sampleBuffer) != nil
            let numSamples = CMSampleBufferGetNumSamples(sampleBuffer)
            print("Sample buffer has data attachment: \(hasDataBuffer), number of samples: \(numSamples)")
            
            // Create a dummy data packet for testing
            let dummyData = Data([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16])
            print("Created dummy data of size: \(dummyData.count)")
            
            // Try to extract real PCM data
            if let realData = extractPCMData(from: sampleBuffer) {
                print("Extracted real PCM data of size: \(realData.count)")
                
                // Create a new task detached from the current context
                Task.detached { [weak audioActor] in
                    await audioActor?.handlePCMData(realData)
                }
            } else {
                print("Failed to extract real PCM data, using dummy data")
                
                // Use dummy data if real extraction fails
                Task.detached { [weak audioActor] in
                    await audioActor?.handlePCMData(dummyData)
                }
            }
        case .microphone:
            print("Not handling microphone output")
        @unknown default:
            print("Not handling \(type) output")
        }
    }
    
    // Extract PCM data from a CMSampleBuffer
    private func extractPCMData(from sampleBuffer: CMSampleBuffer) -> Data? {
        guard let blockBuffer = CMSampleBufferGetDataBuffer(sampleBuffer) else {
            print("No block buffer in sample buffer")
            return nil
        }
        
        var length = 0
        var dataPointer: UnsafeMutablePointer<Int8>?
        
        // Get a pointer to the data in the CMBlockBuffer
        let status = CMBlockBufferGetDataPointer(
            blockBuffer,
            atOffset: 0,
            lengthAtOffsetOut: nil,
            totalLengthOut: &length,
            dataPointerOut: &dataPointer
        )
        
        if status != kCMBlockBufferNoErr {
            print("Error getting data pointer: \(status)")
            return nil
        }
        
        // Create a Data object from the pointer
        guard let pointer = dataPointer else {
            print("Data pointer is nil")
            return nil
        }
        
        return Data(bytes: pointer, count: length)
    }
}