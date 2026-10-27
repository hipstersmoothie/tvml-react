import TVMLKit
import UIKit

/// Native setup for a tvml-react app.
///
///     TVMLReact.register("gauge") { element, existingView in
///       let view = existingView as? GaugeView ?? GaugeView()
///       view.value = Double(element.attributes?["value"] ?? "") ?? 0
///       return view
///     }
///     appController = TVMLReact.launch(serverURL: url, window: window, delegate: self)
public enum TVMLReact {
  public typealias MakeView = (_ element: TVViewElement, _ existingView: UIView?) -> UIView?

  private static let registry = ElementRegistry()
  private static var installed = false

  /// Register a custom TVML element rendered by a UIKit view. `makeView` runs
  /// when TVMLKit lays the element out and again when it changes; reuse
  /// `existingView` when you can. Read attributes and `children` off
  /// `element`.
  ///
  /// Tags listed in `childElements` are registered too, so TVMLKit keeps them
  /// as children of the element instead of dropping them.
  ///
  /// Must be called before the TVApplicationController is created.
  public static func register(
    _ name: String,
    childElements: [String] = [],
    makeView: @escaping MakeView
  ) {
    for tag in [name] + childElements {
      TVElementFactory.registerViewElementClass(TVViewElement.self, elementName: tag)
    }
    registry.makers[name] = makeView
    TVInterfaceFactory.shared().extendedInterfaceCreator = registry
  }

  /// Install TVMLKit workarounds and the elements tvml-react ships with
  /// (`SimplifiedList`). Safe to call more than once; `launch` calls it.
  public static func install() {
    guard !installed else { return }
    installed = true

    TVMLKitCompatibility.install()

    register(
      SimplifiedListElement.list,
      childElements: [SimplifiedListElement.row]
    ) { element, existingView in
      let view = existingView as? SimplifiedListView ?? SimplifiedListView()
      view.update(with: element)
      return view
    }
  }

  /// Install everything and start the app from `<serverURL>/Application.js`,
  /// the bootstrap `tvml-react build`/`dev` writes next to your bundle.
  public static func launch(
    serverURL: URL,
    window: UIWindow,
    delegate: TVApplicationControllerDelegate? = nil
  ) -> TVApplicationController {
    install()

    let base = serverURL.absoluteString.hasSuffix("/")
      ? serverURL
      : serverURL.appendingPathComponent("")
    let context = TVApplicationControllerContext()
    context.javaScriptApplicationURL = base.appendingPathComponent("Application.js")
    context.launchOptions["BASEURL"] = base.absoluteString

    let controller = TVApplicationController(context: context, window: window, delegate: delegate)
    window.makeKeyAndVisible()
    return controller
  }
}

// TVInterfaceFactory accepts a single extended creator, so every element
// registered through TVMLReact shares this one and is dispatched by name.
private final class ElementRegistry: NSObject, TVInterfaceCreating {
  var makers: [String: TVMLReact.MakeView] = [:]

  func makeView(element: TVViewElement, existingView: UIView?) -> UIView? {
    makers[element.name]?(element, existingView)
  }
}
