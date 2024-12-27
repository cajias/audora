//
//  AudioCaptureActorTests.swift
//  ScreenCaptureKitBindings
//
//  Created by Cajias, Raul on 27.12.24.
//


import Testing
@testable import ScreenCaptureKitBindings
@preconcurrency import Combine
import Foundation

actor AudioCaptureActorTests {

    // MARK: - 1) Verifying Publisher Emission
    
    /// Ensures that calling `handlePCMData(_:)` publishes the data to subscribers.
    @Test func testPublisherEmitsData() async throws {
        // 1. Create an instance of AudioCaptureActor
        let audioCapture = AudioCaptureActor()

        // 2. Subscribe to the publisher
        let subscriptionID = UUID()
        var receivedDataList = [Data]()
        await audioCapture.onData(subscriptionID, { data in
            receivedDataList.append(data)
        })

        // 3. Emit fake PCM data (as if from ScreenCaptureKit)
        let testData = Data([0xDE, 0xAD, 0xBE, 0xEF])
        await audioCapture.handlePCMData(testData)

        // 4. Verify subscriber receives exactly one piece of data
        #expect(
            receivedDataList.count == 1,
            "Expected exactly 1 data packet, got \(receivedDataList.count)."
        )
        #expect(
            receivedDataList.first == testData,
            "Subscriber data mismatch: expected \(testData), got \(String(describing: receivedDataList.first))."
        )

        // 5. Cancel the subscription to clean up
        await audioCapture.unsubscribeFromAudioData(subscriptionID)
    }

    // MARK: - 2) Multiple Subscribers

    /// Ensures multiple subscribers each receive emitted data.
    @Test func testMultipleSubscribers() async throws {
        let audioCapture = AudioCaptureActor()

        // We'll have two subscribers capturing different arrays of data
        var subscriberOneData = [Data]()
        let subscriberOneID = UUID()
        var subscriberTwoData = [Data]()
        let subscriberTwoID = UUID()


        // Subscribe #1
        await audioCapture.onData(subscriberOneID, { data in
            subscriberOneData.append(data)
        })

        // Subscribe #2
        await audioCapture.onData(subscriberTwoID, { data in
            subscriberTwoData.append(data)
        })

        // Emit two different data packets
        let packetA = Data([0x01, 0x02])
        let packetB = Data([0x03, 0x04])
        
        await audioCapture.handlePCMData(packetA)
        await audioCapture.handlePCMData(packetB)

        #expect(
            subscriberOneData.count == 2 && subscriberTwoData.count == 2,
            """
            Each subscriber should have received 2 packets.
            subscriberOneData = \(subscriberOneData)
            subscriberTwoData = \(subscriberTwoData)
            """
        )

        // Check actual data contents
        #expect(subscriberOneData[0] == packetA && subscriberOneData[1] == packetB,
                "Subscriber 1 did not receive the correct packets: \(subscriberOneData)")
        #expect(subscriberTwoData[0] == packetA && subscriberTwoData[1] == packetB,
                "Subscriber 2 did not receive the correct packets: \(subscriberTwoData)")

        // Clean up
        await audioCapture.unsubscribeFromAudioData(subscriberOneID)
        await audioCapture.unsubscribeFromAudioData(subscriberTwoID)
    }

    // MARK: - 3) Start Capture with Invalid Bundle ID

    /// Tries starting capture with a bogus bundle ID and expects an error.
    @Test func testStartCaptureWithInvalidBundleID() async throws {
        let audioCapture = AudioCaptureActor()

        do {
            // Attempt to start capture on a non-existent app
            try await audioCapture.startCapture(for: "com.invalid.bundle")
            // If no error is thrown, fail
            #expect(false, "Expected an error for invalid bundle ID, but capture started successfully.")
        } catch {
            // We expected an error
            #expect(true, "Received expected error: \(error)")
        }

        // Ensure stopping capture doesn't crash (even if never started successfully)
        await audioCapture.stopCapture()
        #expect(true, "Stop capture called safely.")
    }

    // MARK: - 4) Stop Capture with No Active Stream

    /// Calls `stopCapture()` when there's no active stream and expects no crash/error.
    @Test func testStopCaptureWithoutActiveStream() async throws {
        let audioCapture = AudioCaptureActor()

        // No capture has started, so scStream is nil
        await audioCapture.stopCapture()
        // If we reach here, there's presumably no crash/exception
        #expect(true, "Called stopCapture() with no active stream; no errors encountered.")
    }

    // MARK: - 5) (Optional) Start Capture with a Valid Bundle ID

    /// Uncomment if you have a real, accessible app (e.g., "com.apple.Notes") you can capture.
    /// This may require user/system permissions and won't run well in CI.
    /*
    @Test func testStartCaptureWithValidBundleID() async throws {
        let audioCapture = AudioCaptureActor()
        do {
            try await audioCapture.startCapture(for: "com.apple.Notes")
            #expect(true, "Successfully started capture for com.apple.Notes.")
        } catch {
            #expect(false, "Failed to start capture for com.apple.Notes: \(error)")
        }

        // Clean up
        await audioCapture.stopCapture()
        #expect(true, "Stopped capture without error.")
    }
    */
}
