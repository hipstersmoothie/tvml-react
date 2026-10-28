import AVFoundation
import JavaScriptCore
import Network
import TVMLKit
import UIKit

// Exposes platform state TVJS doesn't have (appearance, accessibility,
// network, display) to JavaScript as the `TVMLReactNative` global, and pushes
// updates when it changes. The tvml-react hooks (useColorScheme,
// useAccessibility, useNetworkStatus, useDisplay, useKeepAwake) read from it.
//
// JS shape:
//   TVMLReactNative.state               current snapshot (plain object)
//   TVMLReactNative.onChange            set by JS; called after `state` changes
//   TVMLReactNative.setIdleTimerDisabled(bool)
@MainActor
final class NativeBridge {
  private static let globalName = "TVMLReactNative"

  weak var controller: TVApplicationController? {
    didSet { webSockets.controller = controller }
  }
  private nonisolated let webSockets = WebSocketBridge()
  private weak var window: UIWindow?
  private let pathMonitor = NWPathMonitor()
  private var observers: [NSObjectProtocol] = []
  private var traitRegistration: Any?

  // Read from the JavaScript thread, written on main.
  private nonisolated let lock = NSLock()
  private nonisolated(unsafe) var cachedState: [String: Any] = [:]
  private nonisolated(unsafe) var network: [String: Any] = [
    "online": true, "expensive": false, "constrained": false,
  ]

  init(window: UIWindow) {
    self.window = window
    cachedState = readState()
  }

  /// Called on the JavaScript thread before the app's JS runs.
  nonisolated func install(in context: JSContext) {
    guard let bridge = JSValue(newObjectIn: context) else { return }
    bridge.setValue(state(), forProperty: "state")

    let setIdleTimerDisabled: @convention(block) (Bool) -> Void = { disabled in
      DispatchQueue.main.async { UIApplication.shared.isIdleTimerDisabled = disabled }
    }
    bridge.setValue(setIdleTimerDisabled, forProperty: "setIdleTimerDisabled")
    webSockets.install(on: bridge)

    // measureText(text, fontSize, fontWeight) -> { width, height } in points,
    // for sizing TVML cells to their text (TVML has no intrinsic sizing).
    let measureText: @convention(block) (String, Double, String) -> [String: Double] = {
      text, fontSize, weight in
      let font = UIFont.systemFont(ofSize: CGFloat(fontSize), weight: Self.fontWeight(weight))
      let size = (text as NSString).boundingRect(
        with: CGSize(width: CGFloat.greatestFiniteMagnitude, height: .greatestFiniteMagnitude),
        options: [.usesLineFragmentOrigin, .usesFontLeading],
        attributes: [.font: font], context: nil
      ).size
      return ["width": Double(ceil(size.width)), "height": Double(ceil(size.height))]
    }
    bridge.setValue(measureText, forProperty: "measureText")

    context.setObject(bridge, forKeyedSubscript: Self.globalName as NSString)
  }

  /// Start watching for changes. Call on the main thread.
  func startObserving() {
    let center = NotificationCenter.default
    let names: [Notification.Name] = [
      UIAccessibility.reduceMotionStatusDidChangeNotification,
      UIAccessibility.voiceOverStatusDidChangeNotification,
      UIAccessibility.boldTextStatusDidChangeNotification,
      UIAccessibility.reduceTransparencyStatusDidChangeNotification,
      UIAccessibility.closedCaptioningStatusDidChangeNotification,
      UIAccessibility.darkerSystemColorsStatusDidChangeNotification,
      AVPlayer.eligibleForHDRPlaybackDidChangeNotification,
    ]
    observers = names.map { name in
      center.addObserver(forName: name, object: nil, queue: .main) { [weak self] _ in
        MainActor.assumeIsolated { self?.refresh() }
      }
    }

    if #available(tvOS 17.0, *), let window {
      traitRegistration = window.registerForTraitChanges([UITraitUserInterfaceStyle.self]) {
        [weak self] (_: UIWindow, _: UITraitCollection) in
        self?.refresh()
      }
    }

    pathMonitor.pathUpdateHandler = { [weak self] path in
      DispatchQueue.main.async {
        guard let self else { return }
        self.lock.lock()
        self.network = [
          "online": path.status == .satisfied,
          "expensive": path.isExpensive,
          "constrained": path.isConstrained,
        ]
        self.lock.unlock()
        self.refresh()
      }
    }
    pathMonitor.start(queue: DispatchQueue(label: "tvml-react.network"))
  }

  private nonisolated static func fontWeight(_ name: String) -> UIFont.Weight {
    switch name.lowercased() {
    case "ultralight": return .ultraLight
    case "thin": return .thin
    case "light": return .light
    case "medium": return .medium
    case "semibold": return .semibold
    case "bold": return .bold
    case "heavy": return .heavy
    case "black": return .black
    default: return .regular
    }
  }

  private nonisolated func state() -> [String: Any] {
    lock.lock()
    defer { lock.unlock() }
    return cachedState
  }

  // Main thread: re-read everything and push it to JS if it changed.
  private func refresh() {
    let next = readState()
    lock.lock()
    let changed = !NSDictionary(dictionary: cachedState).isEqual(to: next)
    cachedState = next
    lock.unlock()
    guard changed else { return }

    controller?.evaluate(inJavaScriptContext: { context in
      guard let bridge = context.objectForKeyedSubscript(Self.globalName),
        !bridge.isUndefined
      else { return }
      bridge.setValue(next, forProperty: "state")
      if let onChange = bridge.objectForKeyedSubscript("onChange"),
        !onChange.isUndefined, !onChange.isNull
      {
        onChange.call(withArguments: [])
      }
    }, completion: nil)
  }

  private func readState() -> [String: Any] {
    let style = window?.traitCollection.userInterfaceStyle ?? .unspecified
    let screen = window?.screen ?? UIScreen.main
    lock.lock()
    let network = self.network
    lock.unlock()

    return [
      "colorScheme": style == .light ? "light" : "dark",
      "accessibility": [
        "reduceMotion": UIAccessibility.isReduceMotionEnabled,
        "voiceOver": UIAccessibility.isVoiceOverRunning,
        "boldText": UIAccessibility.isBoldTextEnabled,
        "reduceTransparency": UIAccessibility.isReduceTransparencyEnabled,
        "closedCaptioning": UIAccessibility.isClosedCaptioningEnabled,
        "darkerSystemColors": UIAccessibility.isDarkerSystemColorsEnabled,
      ],
      "network": network,
      "display": [
        "width": screen.bounds.width,
        "height": screen.bounds.height,
        "scale": screen.scale,
        "nativeScale": screen.nativeScale,
        "maximumFramesPerSecond": screen.maximumFramesPerSecond,
        "hdr": AVPlayer.eligibleForHDRPlayback,
      ],
    ]
  }

  deinit {
    pathMonitor.cancel()
  }
}

// TVApplicationController holds its delegate weakly and only calls the
// evaluate hook on its delegate, so TVMLReact sits in front of the app's own
// delegate and forwards everything.
final class ControllerDelegateProxy: NSObject, TVApplicationControllerDelegate {
  let bridge: NativeBridge
  weak var forward: TVApplicationControllerDelegate?

  init(bridge: NativeBridge, forward: TVApplicationControllerDelegate?) {
    self.bridge = bridge
    self.forward = forward
  }

  func appController(
    _ appController: TVApplicationController, evaluateAppJavaScriptIn jsContext: JSContext
  ) {
    bridge.install(in: jsContext)
    forward?.appController?(appController, evaluateAppJavaScriptIn: jsContext)
  }

  func appController(
    _ appController: TVApplicationController,
    didFinishLaunching options: [String: Any]?
  ) {
    forward?.appController?(appController, didFinishLaunching: options)
  }

  func appController(_ appController: TVApplicationController, didFail error: Error) {
    forward?.appController?(appController, didFail: error)
  }

  func appController(
    _ appController: TVApplicationController, didStop options: [String: Any]?
  ) {
    forward?.appController?(appController, didStop: options)
  }
}
