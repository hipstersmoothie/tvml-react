import XCTest

// Captures every docs example for the docs site. Opens each row of the
// docs-gallery example with the remote, waits for its images, and saves a
// screenshot named after the example to TEST_RUNNER_SCREENSHOTS. Run it with
// site/scripts/capture.sh, which converts them for the site.
//
// Needs the docs-gallery dev server: `cd examples/docs-gallery && pnpm dev`
// (port 9110).
final class DocsGalleryTests: KitchenSinkTestCase {
  private var focusedLabel: String? {
    let focused = app.descendants(matching: .any).matching(NSPredicate(format: "hasFocus == true")).firstMatch
    return focused.exists ? focused.label : nil
  }

  func testCaptureEveryExample() {
    continueAfterFailure = true
    launch(
      server: ProcessInfo.processInfo.environment["DOCS_GALLERY_URL"] ?? "http://localhost:9110/",
      waitingFor: "Docs gallery")
    sleep(1)

    var captured: Set<String> = []
    while let name = focusedLabel, !captured.contains(name) {
      captured.insert(name)
      XCTContext.runActivity(named: name) { _ in
        press(.select)
        XCTAssert(
          app.descendants(matching: .any)
            .matching(NSPredicate(format: "hasFocus == true AND label == %@", name)).firstMatch
            .waitForNonExistence(timeout: 10), "\(name) opened")
        sleep(4)  // images
        XCTAssertEqual(app.state, .runningForeground, "\(name) didn't crash")
        screenshot(name)

        var back = false
        for _ in 0..<3 where !back {
          press(.menu)
          back = focused(name).waitForExistence(timeout: 5)
        }
        XCTAssert(back, "\(name): back on the index")
      }
      press(.down)
      usleep(500_000)
    }
    XCTAssertGreaterThan(captured.count, 0)
  }
}
