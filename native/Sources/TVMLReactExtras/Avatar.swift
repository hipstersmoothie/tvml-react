import TVMLKit
import UIKit

// <avatar src name radius>: a rounded (by default circular) image, with the
// name's initials while it loads or when there's no image. TVML ignores
// border-radius on images, and monograms turn square when focused.
final class AvatarView: UIView {
  private let imageView = UIImageView()
  private let initials = UILabel()
  private var radius: CGFloat?
  private var currentURL: URL?
  private var task: URLSessionDataTask?

  override init(frame: CGRect) {
    super.init(frame: frame)
    clipsToBounds = true
    backgroundColor = UIColor(white: 1, alpha: 0.15)
    initials.textAlignment = .center
    initials.textColor = .white
    imageView.contentMode = .scaleAspectFill
    addSubview(initials)
    addSubview(imageView)
  }

  required init?(coder: NSCoder) { fatalError() }

  override func layoutSubviews() {
    super.layoutSubviews()
    imageView.frame = bounds
    initials.frame = bounds
    initials.font = .systemFont(ofSize: min(bounds.width, bounds.height) * 0.4, weight: .semibold)
    layer.cornerRadius = radius ?? min(bounds.width, bounds.height) / 2
  }

  func update(with element: TVViewElement) {
    let attributes = element.attributes ?? [:]
    radius = attributes["radius"].flatMap(Double.init).map { CGFloat($0) }
    if let color = element.style?.backgroundColor?.color { backgroundColor = color }
    initials.text = Self.initials(attributes["name"] ?? "")
    setNeedsLayout()

    let url = attributes["src"].flatMap(URL.init(string:))
    guard url != currentURL else { return }
    currentURL = url
    task?.cancel()
    imageView.image = nil
    guard let url else { return }
    task = ImageLoader.shared.load(url) { [weak self] image in
      guard let self, self.currentURL == url else { return }
      self.imageView.image = image
    }
  }

  private static func initials(_ name: String) -> String {
    name.split(separator: " ").prefix(2).compactMap(\.first).map(String.init).joined().uppercased()
  }
}
