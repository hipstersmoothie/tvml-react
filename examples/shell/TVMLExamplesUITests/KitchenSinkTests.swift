import XCTest

// Opens every screen of the kitchen-sink example with the Siri Remote and
// checks that it renders without crashing TVMLKit. One screenshot per screen
// is attached to the test results, and written to a folder on the Mac if
// TEST_RUNNER_KITCHEN_SINK_SCREENSHOTS is set (xcodebuild passes TEST_RUNNER_*
// variables to the test runner without the prefix).
//
// Needs the kitchen-sink dev server: `cd examples/kitchen-sink && pnpm dev`
// (port 9108). Override with TEST_RUNNER_KITCHEN_SINK_URL.
final class KitchenSinkTests: XCTestCase {
  // In the order of the index list (examples/kitchen-sink/src/screens.tsx).
  // `marker` is text the screen shows (nil if it shows none until you
  // interact); `row` is the index row's description, which goes away once the
  // screen is pushed over the index.
  private let screens: [(name: String, marker: String?, row: String)] = [
    ("alertTemplate", "alertTemplate", "A message with buttons."),
    ("catalogTemplate", "Drama", "Categories beside a grid."),
    ("compilationTemplate", "Track 1", "An album or season."),
    ("descriptiveAlertTemplate", "Agree", "Long text with buttons."),
    ("divTemplate", "Nine regions", "Free-form nine-region layout."),
    ("formTemplate", "Enter a display name", "A single text field."),
    ("listTemplate", "Episode 1", "A list with a preview panel."),
    ("loadingTemplate", "loadingTemplate", "A spinner."),
    ("menuBarTemplate", "Second", "Tabs, each its own document."),
    ("oneupTemplate", nil, "Fullscreen images, one at a time."),
    ("paradeTemplate", "Family", "A list beside an image deck."),
    ("productBundleTemplate", "In this bundle", "A bundle of items."),
    ("productTemplate", "Viewers also watched", "A single item's page."),
    ("ratingTemplate", "ratingTemplate", "Rate an item."),
    ("searchTemplate", "Popular", "A search field and results."),
    ("showcaseTemplate", "Photo 1", "A carousel of images."),
    ("stackTemplate", "A shelf", "Carousel, shelf and grid."),
    ("Lockups", "monogramLockup", "Overlays, badges, monograms, cards."),
    ("mediaContent", "playbackMode", "Auto-playing previews."),
  ]

  private var app: XCUIApplication!
  private let remote = XCUIRemote.shared

  private func launch() {
    app = XCUIApplication()
    let server = ProcessInfo.processInfo.environment["KITCHEN_SINK_URL"] ?? "http://localhost:9108/"
    app.launchArguments = ["-TVMLServerURL", server]
    app.launch()
    XCTAssert(element("Kitchen sink").waitForExistence(timeout: 20), "index list")
  }

  private func element(_ text: String) -> XCUIElement {
    app.descendants(matching: .any)
      .matching(NSPredicate(format: "label CONTAINS %@", text)).firstMatch
  }

  private func focused(_ text: String) -> XCUIElement {
    app.descendants(matching: .any)
      .matching(NSPredicate(format: "hasFocus == true AND label CONTAINS %@", text)).firstMatch
  }

  private func press(_ button: XCUIRemote.Button, times: Int = 1) {
    for _ in 0..<times {
      remote.press(button)
      usleep(400_000)
    }
  }

  private func screenshot(_ name: String) {
    guard app.state == .runningForeground else { return }
    let shot = app.screenshot()
    let attachment = XCTAttachment(screenshot: shot)
    attachment.name = name
    attachment.lifetime = .keepAlways
    add(attachment)
    if let dir = ProcessInfo.processInfo.environment["KITCHEN_SINK_SCREENSHOTS"] {
      try? shot.pngRepresentation.write(to: URL(fileURLWithPath: dir).appendingPathComponent("\(name).png"))
    }
  }

  func testEveryScreenRenders() {
    continueAfterFailure = true
    launch()

    // TEST_RUNNER_KITCHEN_SINK_ONLY=name,name opens just those screens.
    let only = ProcessInfo.processInfo.environment["KITCHEN_SINK_ONLY"]?
      .split(separator: ",").map(String.init)

    for (index, screen) in screens.enumerated() {
      if let only, !only.contains(screen.name) {
        press(.down)
        continue
      }
      XCTContext.runActivity(named: screen.name) { _ in
        // Back on the index with this screen's row focused. After a crash,
        // relaunch and walk down to it.
        if app.state != .runningForeground {
          launch()
          press(.down, times: index)
        }
        guard focused(screen.name).waitForExistence(timeout: 5) else {
          XCTFail("\(screen.name): row not focused on the index")
          return
        }

        press(.select)
        let rendered = screen.marker.map { element($0).waitForExistence(timeout: 15) } ?? true
        sleep(2)  // let images load for the screenshot
        screenshot(screen.name)

        if app.state != .runningForeground {
          XCTFail("\(screen.name): app crashed")
          return
        }
        XCTAssert(rendered, "\(screen.name): shows \"\(screen.marker ?? "")\"")
        XCTAssertFalse(element(screen.row).exists, "\(screen.name): pushed over the index")

        // Some screens take more than one Menu press to leave (e.g. from a
        // tab bar).
        var back = false
        for _ in 0..<3 where !back {
          press(.menu)
          back = element(screen.row).waitForExistence(timeout: 6)
        }
        XCTAssert(back, "\(screen.name): back on the index")
        press(.down)
      }
    }
  }
}
