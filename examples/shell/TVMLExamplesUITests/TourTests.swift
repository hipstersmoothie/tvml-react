import XCTest

// Walks any example with a scripted sequence of remote presses, saving
// screenshots along the way. For looking at an app's screens while working on
// its design:
//
//   TEST_RUNNER_TOUR_URL=http://localhost:9101/ \
//   TEST_RUNNER_TOUR_STEPS="wait:8 shot:home down select wait:5 shot:stream" \
//   TEST_RUNNER_SCREENSHOTS=/tmp/tour \
//   ./ui-tests.sh -only-testing:TVMLExamplesUITests/TourTests
//
// Steps: up, down, left, right, select, menu, playpause, hold (long select),
// wait:<seconds>, shot:<name>. Skipped unless TOUR_URL is set.
final class TourTests: KitchenSinkTestCase {
  func testTour() throws {
    let environment = ProcessInfo.processInfo.environment
    guard let url = environment["TOUR_URL"] else { throw XCTSkip("set TEST_RUNNER_TOUR_URL") }
    let steps = (environment["TOUR_STEPS"] ?? "wait:8 shot:launch").split(separator: " ")

    app = XCUIApplication()
    app.launchArguments = ["-TVMLServerURL", url]
    app.launch()

    for step in steps {
      let parts = step.split(separator: ":", maxSplits: 1).map(String.init)
      switch parts[0] {
      case "up": press(.up)
      case "down": press(.down)
      case "left": press(.left)
      case "right": press(.right)
      case "select": press(.select)
      case "menu": press(.menu)
      case "playpause": press(.playPause)
      case "hold": remote.press(.select, forDuration: 1.5)
      case "wait": sleep(UInt32(parts.count > 1 ? Int(parts[1]) ?? 1 : 1))
      case "shot": screenshot(parts.count > 1 ? parts[1] : "shot")
      default: XCTFail("unknown step \(step)")
      }
    }
  }
}
