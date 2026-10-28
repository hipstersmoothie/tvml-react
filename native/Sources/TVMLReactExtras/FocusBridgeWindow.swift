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
// Before the other region has been focused, it routes to the first focusable
// view found there (e.g. the selected segment of a header segmentBar), so focus
// that starts in the body can still reach the nav.
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
    observeFocus()
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

  // UIWindow.didUpdateFocus isn't called for focus changes inside TVMLKit's
  // views on tvOS 26, so listen to the focus system's notification instead.
  private var focusObserver: NSObjectProtocol?

  private func observeFocus() {
    focusObserver = NotificationCenter.default.addObserver(
      forName: UIFocusSystem.didUpdateNotification, object: nil, queue: .main
    ) { [weak self] notification in
      guard let context = notification.userInfo?[UIFocusSystem.focusUpdateContextUserInfoKey]
        as? UIFocusUpdateContext
      else { return }
      MainActor.assumeIsolated { self?.focusDidUpdate(context) }
    }
  }

  private func focusDidUpdate(_ context: UIFocusUpdateContext) {
    guard let next = context.nextFocusedView, next.window === self else { return }
    let frame = next.convert(next.bounds, to: self)
    let inHeader = frame.midY < headerHeight

    if inHeader {
      headerView = next
    } else {
      bodyView = next
    }

    // The last view focused in the other region, if it's still on screen
    // (switching tabs replaces the body), else the first one found there.
    let remembered = (inHeader ? bodyView : headerView).flatMap { $0.window === self ? $0 : nil }
    let target = remembered ?? firstFocusableView(inHeader: !inHeader)
    bridge.preferredFocusEnvironments = [target].compactMap { $0 }
  }

  // The outermost visible, focusable view whose center is in the header band
  // (or below it).
  private func firstFocusableView(inHeader: Bool) -> UIView? {
    var candidates: [UIView] = []
    func visit(_ view: UIView) {
      guard !view.isHidden, view.alpha > 0.01 else { return }
      if view.canBecomeFocused {
        let midY = view.convert(view.bounds, to: self).midY
        if (midY < headerHeight) == inHeader { candidates.append(view) }
      }
      view.subviews.forEach(visit)
    }
    visit(self)
    // Outermost first: e.g. a UISegmentedControl rather than one of its
    // segments, which then puts focus on its selected segment itself.
    return candidates.first
  }
}
