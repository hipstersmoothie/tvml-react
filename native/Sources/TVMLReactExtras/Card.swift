import TVMLKit
import UIKit

// <materialCard title subtitle body image material radius>: a blurred, rounded panel
// that draws its own content. Native elements can't contain TVML children, so
// the content comes from attributes.
final class CardView: UIView {
  private let blur = UIVisualEffectView()
  private let imageView = UIImageView()
  private let title = UILabel()
  private let subtitle = UILabel()
  private let body = UILabel()
  private let stack = UIStackView()
  private var currentURL: URL?
  private var task: URLSessionDataTask?

  override init(frame: CGRect) {
    super.init(frame: frame)
    clipsToBounds = true
    addSubview(blur)

    imageView.contentMode = .scaleAspectFill
    imageView.clipsToBounds = true
    imageView.layer.cornerRadius = 12

    title.font = .systemFont(ofSize: 34, weight: .semibold)
    subtitle.font = .systemFont(ofSize: 26)
    body.font = .systemFont(ofSize: 26)
    body.numberOfLines = 0
    for label in [title, subtitle, body] { label.textColor = .white }
    subtitle.textColor = UIColor(white: 1, alpha: 0.7)

    let text = UIStackView(arrangedSubviews: [title, subtitle, body])
    text.axis = .vertical
    text.spacing = 8
    stack.addArrangedSubview(imageView)
    stack.addArrangedSubview(text)
    stack.axis = .horizontal
    stack.alignment = .top
    stack.spacing = 28
    blur.contentView.addSubview(stack)
  }

  required init?(coder: NSCoder) { fatalError() }

  override func layoutSubviews() {
    super.layoutSubviews()
    blur.frame = bounds
    stack.frame = bounds.insetBy(dx: 32, dy: 28)
  }

  func update(with element: TVViewElement) {
    let attributes = element.attributes ?? [:]
    let material = attributes["material"] ?? "dark"
    blur.effect = UIBlurEffect(style: material == "light" ? .light : material == "regular" ? .regular : .dark)
    layer.cornerRadius = CGFloat(Double(attributes["radius"] ?? "") ?? 24)

    title.text = attributes["title"]
    subtitle.text = attributes["subtitle"]
    body.text = attributes["body"]
    title.isHidden = (title.text ?? "").isEmpty
    subtitle.isHidden = (subtitle.text ?? "").isEmpty
    body.isHidden = (body.text ?? "").isEmpty
    if let lines = attributes["lines"].flatMap(Int.init) { body.numberOfLines = lines }

    let url = attributes["image"].flatMap(URL.init(string:))
    imageView.isHidden = url == nil
    if url != currentURL {
      currentURL = url
      task?.cancel()
      imageView.image = nil
      if let url {
        task = ImageLoader.shared.load(url) { [weak self] image in
          guard let self, self.currentURL == url else { return }
          self.imageView.image = image
        }
      }
    }
    imageView.translatesAutoresizingMaskIntoConstraints = false
    NSLayoutConstraint.deactivate(imageView.constraints)
    if !imageView.isHidden {
      NSLayoutConstraint.activate([
        imageView.widthAnchor.constraint(equalToConstant: 160),
        imageView.heightAnchor.constraint(equalToConstant: 160),
      ])
    }
    setNeedsLayout()
  }
}
