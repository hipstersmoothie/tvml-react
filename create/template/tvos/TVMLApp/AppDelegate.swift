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
    // The folder serving Application.js and app.js: `npm run dev` locally, or
    // wherever you host `npm run build`'s output. A `-TVMLServerURL <url>`
    // launch argument overrides Info.plist.
    let configured = UserDefaults.standard.string(forKey: "TVMLServerURL")
      ?? Bundle.main.object(forInfoDictionaryKey: "TVMLServerURL") as? String
    let serverURL = configured.flatMap(URL.init(string:)) ?? URL(string: "http://localhost:9001/")!

    // FocusBridgeWindow(frame:headerHeight:) instead lets focus move between a
    // header nav (a segmentBar) and the content below it.
    let window = UIWindow(frame: UIScreen.main.bounds)
    self.window = window

    appController = TVMLReact.launch(serverURL: serverURL, window: window, delegate: self)
    return true
  }

  func appController(_ appController: TVApplicationController, didFail error: Error) {
    NSLog("Failed to launch: %@", error.localizedDescription)
  }
}
