import XCTest

// Shared setup for tests that drive the kitchen-sink example: launching it,
// finding elements by label and focus, and walking its index list.
//
// Needs the kitchen-sink dev server: `cd examples/kitchen-sink && pnpm dev`
// (port 9108). Override with TEST_RUNNER_KITCHEN_SINK_URL (xcodebuild passes
// TEST_RUNNER_* variables to the test runner without the prefix).
class KitchenSinkTestCase: XCTestCase {
  var app: XCUIApplication!
  let remote = XCUIRemote.shared

  func launch() {
    launch(
      server: ProcessInfo.processInfo.environment["KITCHEN_SINK_URL"] ?? "http://localhost:9108/",
      waitingFor: "Kitchen sink")
  }

  /// Launches the shell app against an example's dev server.
  func launch(server: String, waitingFor text: String) {
    app = XCUIApplication()
    app.launchArguments = ["-TVMLServerURL", server]
    app.launch()
    XCTAssert(element(text).waitForExistence(timeout: 20), "\(text) on screen")
  }

  /// First element whose label contains `text`.
  func element(_ text: String) -> XCUIElement {
    app.descendants(matching: .any)
      .matching(NSPredicate(format: "label CONTAINS %@", text)).firstMatch
  }

  /// The focused element, if its label contains `text`.
  func focused(_ text: String) -> XCUIElement {
    app.descendants(matching: .any)
      .matching(NSPredicate(format: "hasFocus == true AND label CONTAINS %@", text)).firstMatch
  }

  func press(_ button: XCUIRemote.Button, times: Int = 1) {
    for _ in 0..<times {
      remote.press(button)
      usleep(400_000)
    }
  }

  /// Moves down the index to the row titled `name` and opens it.
  func open(_ name: String, marker: String) {
    var found = focused(name).exists
    for _ in 0..<30 where !found {
      press(.down)
      found = focused(name).waitForExistence(timeout: 1)
    }
    XCTAssert(found, "\(name) row on the index")
    press(.select)
    XCTAssert(element(marker).waitForExistence(timeout: 15), "\(name) opened")
  }

  /// `screen` captures the whole display (e.g. the Home screen) instead of the app.
  func screenshot(_ name: String, screen: Bool = false) {
    guard screen || app.state == .runningForeground else { return }
    let shot = screen ? XCUIScreen.main.screenshot() : app.screenshot()
    let attachment = XCTAttachment(screenshot: shot)
    attachment.name = name
    attachment.lifetime = .keepAlways
    add(attachment)
    let environment = ProcessInfo.processInfo.environment
    if let dir = environment["SCREENSHOTS"] ?? environment["KITCHEN_SINK_SCREENSHOTS"] {
      try? shot.pngRepresentation.write(to: URL(fileURLWithPath: dir).appendingPathComponent("\(name).png"))
    }
  }

  /// Attaches `text` (e.g. an accessibility hierarchy) to the results.
  func attach(_ name: String, _ text: String) {
    let attachment = XCTAttachment(string: text)
    attachment.name = name
    attachment.lifetime = .keepAlways
    add(attachment)
    let environment = ProcessInfo.processInfo.environment
    if let dir = environment["SCREENSHOTS"] ?? environment["KITCHEN_SINK_SCREENSHOTS"] {
      try? text.write(
        to: URL(fileURLWithPath: dir).appendingPathComponent("\(name).txt"), atomically: true,
        encoding: .utf8)
    }
  }
}
