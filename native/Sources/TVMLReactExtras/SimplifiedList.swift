import TVMLKit
import UIKit

// A scrollable, focusable list as a custom TVML view element. TVMLKit's
// divTemplate has no scroll region; this element renders a UITableView inside
// it, so a long list scrolls natively while the rest of the template (e.g. a
// <segmentBar tvPosition="header"> nav) stays standard TVML.
//
// Expected TVML shape:
//
//     <divTemplate>
//       <segmentBar style="tv-position: header"> … </segmentBar>
//       <simplifiedList summary="Optional header" style="width: 1920; height: 840">
//         <simplifiedListRow title="Song" subtitle="Artist" accessory="now" image="https://…"/>
//         <simplifiedListRow title="Song" subtitle="Artist" accessory="2:14 PM"/>
//       </simplifiedList>
//     </divTemplate>
//
// TVMLKit applies the element's style (width/height) to the view's frame.
public enum SimplifiedListElement {
  public static let list = "simplifiedList"
  public static let row = "simplifiedListRow"

  // TVInterfaceFactory does not retain its extendedInterfaceCreator.
  private static let factory = SimplifiedListInterfaceFactory()

  /// Registers the elements and installs the interface factory. Call before
  /// creating the TVApplicationController.
  ///
  /// This replaces `TVInterfaceFactory.shared().extendedInterfaceCreator`. If
  /// you have your own creator, call `registerElements()` instead and forward
  /// to a `SimplifiedListInterfaceFactory` from it.
  public static func register() {
    registerElements()
    TVInterfaceFactory.shared().extendedInterfaceCreator = factory
  }

  /// Registers the element names with TVElementFactory only.
  public static func registerElements() {
    for name in [list, row] {
      TVElementFactory.registerViewElementClass(TVViewElement.self, elementName: name)
    }
  }
}

public final class SimplifiedListInterfaceFactory: NSObject, TVInterfaceCreating {
  public override init() {
    super.init()
  }

  public func makeView(element: TVViewElement, existingView: UIView?) -> UIView? {
    guard element.name == SimplifiedListElement.list else { return nil }

    let view = existingView as? SimplifiedListView ?? SimplifiedListView()
    view.update(with: element)
    return view
  }
}
