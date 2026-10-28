import TVMLKit
import UIKit

// Row model parsed out of a <simplifiedListRow> element.
struct SimplifiedListRowModel {
  let title: String
  let subtitle: String?
  let accessory: String?
  let imageURL: URL?
}

// A custom TVML *view* element (<simplifiedList>) backed by a UITableView, so a
// long list scrolls and manages focus natively. It is dropped into a
// normal divTemplate as a child, which lets the nav stay a real native
// <segmentBar tvPosition="header"> rendered by TVMLKit in the header slot —
// divTemplate itself has no scroll region, but this view scrolls internally.
//
// TVMLKit applies the element's TVML style (width/height) to this view's frame;
// the table fills those bounds. The factory calls `update(with:)` on creation
// and again whenever TVMLKit re-runs the interface creator for the element, so
// the view is safe to reuse across updates.
final class SimplifiedListView: UIView {
  private var rows: [SimplifiedListRowModel] = []
  // The <simplifiedListRow> elements, so presses and focus can be reported
  // back to JavaScript (onSelect / onHighlight on SimplifiedListRow).
  private var rowElements: [TVViewElement] = []
  private let tableView = UITableView(frame: .zero, style: .plain)
  private let summaryLabel = UILabel()
  private static let cellReuseID = "SimplifiedListCell"
  private static let summaryHeight: CGFloat = 100

  override init(frame: CGRect) {
    super.init(frame: frame)
    setUp()
  }

  required init?(coder: NSCoder) {
    super.init(coder: coder)
    setUp()
  }

  private func setUp() {
    backgroundColor = .clear

    // Static, non-focusable summary line shown above the rows. Table header
    // views are not part of the focus chain on tvOS, so it can't be selected.
    summaryLabel.font = .systemFont(ofSize: 44, weight: .semibold)
    summaryLabel.textColor = .white
    summaryLabel.textAlignment = .center
    summaryLabel.numberOfLines = 1

    tableView.translatesAutoresizingMaskIntoConstraints = false
    tableView.backgroundColor = .clear
    tableView.dataSource = self
    tableView.delegate = self
    tableView.rowHeight = 132
    tableView.register(SimplifiedListCell.self, forCellReuseIdentifier: Self.cellReuseID)
    addSubview(tableView)

    NSLayoutConstraint.activate([
      tableView.topAnchor.constraint(equalTo: topAnchor),
      tableView.leadingAnchor.constraint(equalTo: leadingAnchor),
      tableView.trailingAnchor.constraint(equalTo: trailingAnchor),
      tableView.bottomAnchor.constraint(equalTo: bottomAnchor),
    ])
  }

  func update(with element: TVViewElement) {
    let summary = element.attributes?["summary"]
    summaryLabel.text = summary
    tableView.tableHeaderView = (summary?.isEmpty == false) ? summaryLabel : nil

    rowElements = (element.children ?? []).filter { $0.name == SimplifiedListElement.row }
    rows =
      rowElements.compactMap { child in
        let image = child.attributes?["image"].flatMap(URL.init(string:))
        return SimplifiedListRowModel(
          title: child.attributes?["title"] ?? "",
          subtitle: child.attributes?["subtitle"],
          accessory: child.attributes?["accessory"],
          imageURL: image)
      }
    tableView.reloadData()
    setNeedsLayout()
  }

  // A tableHeaderView needs an explicit frame; size it to the table width once
  // the table has been laid out.
  override func layoutSubviews() {
    super.layoutSubviews()
    guard let header = tableView.tableHeaderView else { return }
    let width = tableView.bounds.width
    if header.frame.width != width || header.frame.height != Self.summaryHeight {
      header.frame = CGRect(x: 0, y: 0, width: width, height: Self.summaryHeight)
      tableView.tableHeaderView = header
    }
  }
}

extension SimplifiedListView: UITableViewDataSource, UITableViewDelegate {
  func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
    rows.count
  }

  func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath)
    -> UITableViewCell
  {
    let cell =
      tableView.dequeueReusableCell(withIdentifier: Self.cellReuseID, for: indexPath)
      as! SimplifiedListCell
    cell.configure(with: rows[indexPath.row])
    return cell
  }

  func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
    dispatch(.select, at: indexPath)
  }

  func tableView(
    _ tableView: UITableView, didUpdateFocusIn context: UITableViewFocusUpdateContext,
    with coordinator: UIFocusAnimationCoordinator
  ) {
    if let indexPath = context.nextFocusedIndexPath {
      dispatch(.highlight, at: indexPath)
    }
  }

  // TVMLKit handles the select press itself, so the table never calls
  // didSelectRowAt. Catch it here, on the way up the responder chain from the
  // focused cell.
  override func pressesEnded(_ presses: Set<UIPress>, with event: UIPressesEvent?) {
    if presses.contains(where: { $0.type == .select }),
      let cell = UIFocusSystem.focusSystem(for: self)?.focusedItem as? UITableViewCell,
      let indexPath = tableView.indexPath(for: cell)
    {
      dispatch(.select, at: indexPath)
      return
    }
    super.pressesEnded(presses, with: event)
  }

  private func dispatch(_ type: TVElementEventType, at indexPath: IndexPath) {
    guard rowElements.indices.contains(indexPath.row) else { return }
    rowElements[indexPath.row].dispatchEvent(
      type: type, canBubble: true, cancellable: false, extraInfo: nil, completion: nil)
  }
}
