import ObjectiveC
import UIKit

// Workarounds for TVMLKit bugs on newer tvOS releases.
enum TVMLKitCompatibility {
  private static var installed = false

  /// Installs every workaround. Call once, before creating the
  /// TVApplicationController.
  static func install() {
    guard !installed else { return }
    installed = true
    patchScreenFocusedView()
  }

  // TVMLKit's collection elements (<shelf>, <grid>, <row>, ...) still read
  // `UIScreen.focusedView` while laying out. In apps built with the tvOS 26 SDK
  // that accessor throws "Accessing the focus system through UIScreen is no
  // longer supported" and the app crashes as soon as one of those elements is
  // rendered. Answer it through UIFocusSystem instead.
  private static func patchScreenFocusedView() {
    let selector = NSSelectorFromString("focusedView")
    guard let method = class_getInstanceMethod(UIScreen.self, selector) else { return }

    let block: @convention(block) (UIScreen) -> UIView? = { screen in
      focusedView(on: screen)
    }
    method_setImplementation(method, imp_implementationWithBlock(block))
  }

  private static func focusedView(on screen: UIScreen) -> UIView? {
    let windows = UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .filter { $0.screen === screen }
      .flatMap(\.windows)

    for window in windows.sorted(by: { $0.isKeyWindow && !$1.isKeyWindow }) {
      if let item = UIFocusSystem.focusSystem(for: window)?.focusedItem {
        return item as? UIView
      }
    }
    return nil
  }
}
