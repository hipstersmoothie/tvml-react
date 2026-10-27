import UIKit

// Emulates a native focus link between a top nav (e.g. a segmentBar in the
// template header) and the body content below it. TVML's focus engine is purely
// geometric and TVJS has no API to move focus, so a control with nothing
// directly above it (say, a right-aligned button under a centered nav) can get
// "trapped": pressing up finds nothing to focus.
//
// This window installs a full-width UIFocusGuide on the boundary between the
// header band and the body. On every focus change the guide is pointed at the
// *opposite* region from where focus currently is, bridging both directions:
//   - focus in the body, press up     → guide → last focused header view
//   - focus in the header, press down → guide → last focused body view
// Until the other region has been focused once, the guide is inert and normal
// geometric navigation applies.
//
// Use it as the window you hand to TVApplicationController:
//
//     window = FocusBridgeWindow(frame: UIScreen.main.bounds, headerHeight: 130)
open class FocusBridgeWindow: UIWindow {
  /// Views whose vertical center is above this (in window points) count as the
  /// header band; everything below is body. Match it to your nav's height.
  public var headerHeight: CGFloat {
    didSet { bridgeTop?.constant = headerHeight }
  }

  private let bridge = UIFocusGuide()
  private var bridgeTop: NSLayoutConstraint?
  private weak var headerView: UIView?
  private weak var bodyView: UIView?

  public init(frame: CGRect, headerHeight: CGFloat = 130) {
    self.headerHeight = headerHeight
    super.init(frame: frame)
    setUpBridge()
  }

  public override convenience init(frame: CGRect) {
    self.init(frame: frame, headerHeight: 130)
  }

  public required init?(coder: NSCoder) {
    self.headerHeight = 130
    super.init(coder: coder)
    setUpBridge()
  }

  private func setUpBridge() {
    addLayoutGuide(bridge)
    let top = bridge.topAnchor.constraint(equalTo: topAnchor, constant: headerHeight)
    bridgeTop = top
    NSLayoutConstraint.activate([
      bridge.leadingAnchor.constraint(equalTo: leadingAnchor),
      bridge.trailingAnchor.constraint(equalTo: trailingAnchor),
      top,
      bridge.heightAnchor.constraint(equalToConstant: 2),
    ])
  }

  open override func didUpdateFocus(
    in context: UIFocusUpdateContext,
    with coordinator: UIFocusAnimationCoordinator
  ) {
    super.didUpdateFocus(in: context, with: coordinator)

    guard let next = context.nextFocusedView else { return }
    let frame = next.convert(next.bounds, to: self)
    let inHeader = frame.midY < headerHeight

    if inHeader {
      headerView = next
    } else {
      bodyView = next
    }

    let target = inHeader ? bodyView : headerView
    bridge.preferredFocusEnvironments = [target].compactMap { $0 }
  }
}
