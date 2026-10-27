import TVMLKit
import TVMLReactExtras
import UIKit

@main
class AppDelegate: UIResponder, UIApplicationDelegate, TVApplicationControllerDelegate {
  var window: UIWindow?
  var appController: TVApplicationController?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    // Keeps TVMLKit's shelves/grids from crashing on tvOS 26.
    TVMLKitCompatibility.install()

    // Optional: lets focus jump between the segmentBar nav and the content.
    window = FocusBridgeWindow(frame: UIScreen.main.bounds, headerHeight: 130)

    // Optional: the native <simplifiedList> element. Custom elements must be
    // registered before the TVApplicationController is created.
    SimplifiedListElement.register()

    let serverURL =
      Bundle.main.object(forInfoDictionaryKey: "TVMLServerURL") as? String
      ?? "http://localhost:9001/"
    let base = serverURL.hasSuffix("/") ? serverURL : serverURL + "/"

    guard let baseURL = URL(string: base), let window else {
      NSLog("HelloTVML: invalid TVMLServerURL %@", serverURL)
      return true
    }

    let context = TVApplicationControllerContext()
    context.javaScriptApplicationURL = baseURL.appendingPathComponent("Application.js")
    context.launchOptions["BASEURL"] = base

    appController = TVApplicationController(context: context, window: window, delegate: self)
    window.makeKeyAndVisible()
    return true
  }

  func appController(
    _ appController: TVApplicationController, didFail error: Error
  ) {
    NSLog("HelloTVML: failed to launch: %@", error.localizedDescription)
  }
}
