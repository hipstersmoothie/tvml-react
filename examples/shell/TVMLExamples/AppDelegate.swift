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
    // Folder serving Application.js and app.js (see `tvml-react dev`). A
    // `-TVMLServerURL <url>` launch argument wins over Info.plist, so one build
    // of this shell can run any example.
    let configured = UserDefaults.standard.string(forKey: "TVMLServerURL")
      ?? Bundle.main.object(forInfoDictionaryKey: "TVMLServerURL") as? String
    let serverURL = configured.flatMap(URL.init(string:)) ?? URL(string: "http://localhost:9001/")!

    // Optional: lets focus jump between the segmentBar nav and the content.
    let window = FocusBridgeWindow(frame: UIScreen.main.bounds, headerHeight: 130)
    self.window = window

    appController = TVMLReact.launch(serverURL: serverURL, window: window, delegate: self)
    return true
  }

  func appController(_ appController: TVApplicationController, didFail error: Error) {
    NSLog("tvml-react examples: failed to launch: %@", error.localizedDescription)
  }
}
