import XCTest

// Drives the hello example with the Siri Remote, the way a user would: real
// focus movement and presses through TVMLKit, not synthetic JS events.
//
// Needs the hello dev server: `cd examples/hello && pnpm dev` (port 9100).
// Override with TEST_RUNNER_TVML_SERVER_URL (xcodebuild passes TEST_RUNNER_*
// variables to the test runner without the prefix).
final class HelloTests: XCTestCase {
  private var app: XCUIApplication!
  private let remote = XCUIRemote.shared

  override func setUpWithError() throws {
    continueAfterFailure = false
    app = XCUIApplication()
    let server = ProcessInfo.processInfo.environment["TVML_SERVER_URL"] ?? "http://localhost:9100/"
    app.launchArguments = ["-TVMLServerURL", server]
    app.launch()
    XCTAssert(element("Kind of Blue, Miles Davis").waitForExistence(timeout: 20), "albums shelf")
  }

  /// First element whose label contains `text`.
  private func element(_ text: String) -> XCUIElement {
    app.descendants(matching: .any)
      .matching(NSPredicate(format: "label CONTAINS %@", text)).firstMatch
  }

  private func press(_ button: XCUIRemote.Button, times: Int = 1) {
    for _ in 0..<times {
      remote.press(button)
      usleep(400_000)
    }
  }

  private func waitForFocus(_ text: String, timeout: TimeInterval = 5) -> Bool {
    let focused = app.descendants(matching: .any)
      .matching(NSPredicate(format: "hasFocus == true AND label CONTAINS %@", text)).firstMatch
    return focused.waitForExistence(timeout: timeout)
  }

  // onSelect from a real press pushes a screen; Menu pops it (and tvml-react
  // unmounts it on unload).
  func testSelectPushesDetailAndMenuGoesBack() {
    XCTAssert(waitForFocus("Kind of Blue"))
    press(.select)
    XCTAssert(element("Played").waitForExistence(timeout: 10), "album detail pushed")

    press(.menu)
    XCTAssert(element("Kind of Blue, Miles Davis").waitForExistence(timeout: 10), "back on the shelf")
    XCTAssertFalse(element("Played").exists, "detail screen gone")
  }

  // segmentBarItem onHighlight switches tabs as focus moves; a SimplifiedList
  // row's onSelect (dispatched from the native table) opens the album.
  func testTabsAndNativeListRowSelect() {
    press(.up)
    XCTAssert(waitForFocus("Albums"), "focus on the tab bar")
    press(.right)
    XCTAssert(waitForFocus("Native list"))
    XCTAssert(element("Kind of Blue").waitForExistence(timeout: 10), "native list rows")

    press(.down)
    XCTAssert(waitForFocus("Kind of Blue"), "focus moved into the native list")
    press(.select)
    XCTAssert(element("Played").waitForExistence(timeout: 10), "row select opened the album")
    press(.menu)
  }

  // Typing on the system keyboard reaches onTextChange.
  func testSearchTyping() {
    press(.right, times: 6)
    XCTAssert(waitForFocus("Search"))
    press(.select)
    XCTAssert(element("All albums").waitForExistence(timeout: 10), "search screen")

    app.typeText("ra")
    XCTAssert(element("results for").waitForExistence(timeout: 10), "results header updated")
    XCTAssert(element("OK Computer").exists, "filtered results")
  }

  // The native view elements render inside a tab.
  func testElementsTab() {
    press(.up)
    XCTAssert(waitForFocus("Albums"))
    press(.right, times: 2)
    XCTAssert(waitForFocus("Elements"))
    XCTAssert(element("Native elements").waitForExistence(timeout: 10))
  }
}
