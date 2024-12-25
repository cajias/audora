import Foundation

/// A private struct that wraps the callback and userContext pointer.
/// We mark it as `@unchecked Sendable` to bypass Swift's concurrency checks,
/// acknowledging that raw pointers are not inherently "safe."
struct CallbackContextWrapper: @unchecked Sendable {
    let callback: OnDataCallback
    let userContext: UnsafeMutableRawPointer?
}

/// An actor to store & invoke the global callback. All references to the callback
/// and userContext go through this actor, ensuring concurrency isolation.
actor BridgingCallbackActor {
    private var storedCallback: CallbackContextWrapper?

    func registerCallback(wrapper: CallbackContextWrapper) {
        storedCallback = wrapper
    }

    func handleData(_ data: Data) {
        guard let wrapper = storedCallback else { return }
        data.withUnsafeBytes { ptr in
            guard let base = ptr.baseAddress?.assumingMemoryBound(to: UInt8.self) else { return }
            wrapper.callback(wrapper.userContext, base, Int32(data.count))
        }
    }

    /// Attach a listener to AudioEventEmitter by calling its actor method asynchronously.
    func attachListener() async {
        _ = await AudioEventEmitter.shared.addListener { [weak self] data in
            guard let this = self else { return }
            Task {
                await this.handleData(data)
            }
        }
    }
}