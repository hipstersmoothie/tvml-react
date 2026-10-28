import UIKit

// A single focusable row in the SimplifiedList table: artwork, a two-line
// title/subtitle column, and a right-aligned accessory label.
final class SimplifiedListCell: UITableViewCell {
  private static let imageCache = NSCache<NSURL, UIImage>()
  private static let artSize: CGFloat = 100
  // Horizontal inset so content isn't flush with the cell edge — and, when
  // focused, sits comfortably inside the system's white focus background.
  private static let hInset: CGFloat = 40

  private let artworkView = UIImageView()
  private let titleLabel = UILabel()
  private let subtitleLabel = UILabel()
  private let accessoryLabelView = UILabel()
  private var imageTask: URLSessionDataTask?

  override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
    super.init(style: style, reuseIdentifier: reuseIdentifier)
    setUp()
  }

  required init?(coder: NSCoder) {
    super.init(coder: coder)
    setUp()
  }

  private func setUp() {
    backgroundColor = .clear
    selectionStyle = .none

    artworkView.translatesAutoresizingMaskIntoConstraints = false
    artworkView.contentMode = .scaleAspectFill
    artworkView.clipsToBounds = true
    artworkView.layer.cornerRadius = 6
    artworkView.backgroundColor = UIColor(white: 1, alpha: 0.08)

    titleLabel.translatesAutoresizingMaskIntoConstraints = false
    titleLabel.font = .systemFont(ofSize: 34, weight: .medium)

    subtitleLabel.translatesAutoresizingMaskIntoConstraints = false
    subtitleLabel.font = .systemFont(ofSize: 26)

    accessoryLabelView.translatesAutoresizingMaskIntoConstraints = false
    accessoryLabelView.font = .systemFont(ofSize: 26)
    accessoryLabelView.textAlignment = .right
    accessoryLabelView.setContentHuggingPriority(.required, for: .horizontal)
    accessoryLabelView.setContentCompressionResistancePriority(.required, for: .horizontal)

    applyFocusColors(false)

    let textColumn = UIStackView(arrangedSubviews: [titleLabel, subtitleLabel])
    textColumn.axis = .vertical
    textColumn.spacing = 6
    textColumn.alignment = .leading
    textColumn.translatesAutoresizingMaskIntoConstraints = false

    contentView.addSubview(artworkView)
    contentView.addSubview(textColumn)
    contentView.addSubview(accessoryLabelView)

    NSLayoutConstraint.activate([
      artworkView.leadingAnchor.constraint(
        equalTo: contentView.leadingAnchor, constant: Self.hInset),
      artworkView.centerYAnchor.constraint(equalTo: contentView.centerYAnchor),
      artworkView.widthAnchor.constraint(equalToConstant: Self.artSize),
      artworkView.heightAnchor.constraint(equalToConstant: Self.artSize),

      textColumn.leadingAnchor.constraint(
        equalTo: artworkView.trailingAnchor, constant: 28),
      textColumn.centerYAnchor.constraint(equalTo: contentView.centerYAnchor),

      accessoryLabelView.leadingAnchor.constraint(
        greaterThanOrEqualTo: textColumn.trailingAnchor, constant: 24),
      accessoryLabelView.trailingAnchor.constraint(
        equalTo: contentView.trailingAnchor, constant: -Self.hInset),
      accessoryLabelView.centerYAnchor.constraint(equalTo: contentView.centerYAnchor),
    ])
  }

  func configure(with row: SimplifiedListRowModel) {
    titleLabel.text = row.title
    subtitleLabel.text = row.subtitle
    accessibilityLabel = [row.title, row.subtitle, row.accessory]
      .compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: ", ")
    subtitleLabel.isHidden = (row.subtitle?.isEmpty ?? true)
    accessoryLabelView.text = row.accessory
    loadArtwork(row.imageURL)
  }

  private func loadArtwork(_ url: URL?) {
    imageTask?.cancel()
    imageTask = nil
    artworkView.image = nil

    guard let url else {
      artworkView.isHidden = true
      return
    }
    artworkView.isHidden = false

    if let cached = Self.imageCache.object(forKey: url as NSURL) {
      artworkView.image = cached
      return
    }

    let task = URLSession.shared.dataTask(with: url) { [weak self] data, _, _ in
      guard let data, let image = UIImage(data: data) else { return }
      Self.imageCache.setObject(image, forKey: url as NSURL)
      DispatchQueue.main.async {
        // Guard against cell reuse: only apply if still showing this URL.
        guard let self, self.imageTask != nil else { return }
        self.artworkView.image = image
      }
    }
    imageTask = task
    task.resume()
  }

  override func prepareForReuse() {
    super.prepareForReuse()
    imageTask?.cancel()
    imageTask = nil
    artworkView.image = nil
    applyFocusColors(false)
  }

  // The focused cell gets the system's white focus background, so invert the
  // text to dark to stay legible (white-on-white is otherwise invisible).
  override func didUpdateFocus(
    in context: UIFocusUpdateContext,
    with coordinator: UIFocusAnimationCoordinator
  ) {
    super.didUpdateFocus(in: context, with: coordinator)
    let focused = (context.nextFocusedView == self)
    coordinator.addCoordinatedAnimations {
      self.applyFocusColors(focused)
    }
  }

  private func applyFocusColors(_ focused: Bool) {
    titleLabel.textColor = focused ? .black : .white
    subtitleLabel.textColor =
      focused ? UIColor(white: 0, alpha: 0.6) : UIColor(white: 1, alpha: 0.55)
    accessoryLabelView.textColor =
      focused ? UIColor(white: 0, alpha: 0.5) : UIColor(white: 1, alpha: 0.45)
  }
}
