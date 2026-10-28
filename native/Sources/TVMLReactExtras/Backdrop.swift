import TVMLKit
import UIKit

// <backdrop src dim crossfade>: a full-bleed background image that can change
// after the screen is presented (TVML's <background> can't), cross-fading
// between images and dimming them for legible text on top.
//
// The element itself is an invisible 1pt view, so it doesn't affect layout.
// The image layer goes at the very back of the screen's view controller,
// behind everything TVMLKit renders for the template (including a header
// segmentBar), and is removed with the element.
final class BackdropView: UIView {
  private let layerView = BackdropLayerView()

  override init(frame: CGRect) {
    super.init(frame: frame)
    isUserInteractionEnabled = false
  }

  required init?(coder: NSCoder) { fatalError() }

  func update(with element: TVViewElement) {
    layerView.update(with: element)
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    guard window != nil, let host = hostView() else {
      layerView.removeFromSuperview()
      return
    }
    if layerView.superview !== host {
      layerView.frame = host.bounds
      layerView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
      host.insertSubview(layerView, at: 0)
    }
  }

  // The view of the view controller presenting this template.
  private func hostView() -> UIView? {
    var responder: UIResponder? = self
    while let current = responder {
      if let controller = current as? UIViewController { return controller.view }
      responder = current.next
    }
    return nil
  }
}

private final class BackdropLayerView: UIView {
  private let imageViews = [UIImageView(), UIImageView()]
  private var front = 0
  private let scrim = UIView()
  private var currentURL: URL?
  private var task: URLSessionDataTask?

  override init(frame: CGRect) {
    super.init(frame: frame)
    clipsToBounds = true
    isUserInteractionEnabled = false
    for view in imageViews {
      view.contentMode = .scaleAspectFill
      view.frame = bounds
      view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
      view.alpha = 0
      addSubview(view)
    }
    scrim.frame = bounds
    scrim.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    scrim.backgroundColor = .black
    scrim.alpha = 0
    addSubview(scrim)
  }

  required init?(coder: NSCoder) { fatalError() }

  func update(with element: TVViewElement) {
    let attributes = element.attributes ?? [:]
    scrim.alpha = CGFloat(Double(attributes["dim"] ?? "") ?? 0)
    let duration = Double(attributes["crossfade"] ?? "") ?? 0.6

    guard let src = attributes["src"], let url = URL(string: src), url != currentURL else { return }
    currentURL = url
    task?.cancel()
    task = ImageLoader.shared.load(url) { [weak self] image in
      guard let self, let image, self.currentURL == url else { return }
      let next = 1 - self.front
      let incoming = self.imageViews[next]
      let outgoing = self.imageViews[self.front]
      incoming.image = image
      self.front = next
      self.insertSubview(incoming, belowSubview: self.scrim)
      UIView.animate(withDuration: duration) {
        incoming.alpha = 1
        outgoing.alpha = 0
      }
    }
  }
}
