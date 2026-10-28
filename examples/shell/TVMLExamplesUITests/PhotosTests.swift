import XCTest

// Walks the photos example, the app the docs tutorial builds, with the remote:
// browse, open a photo, favorite it, and find it in the Favorites tab. With
// TEST_RUNNER_SCREENSHOTS=/some/dir it saves the tutorial's screenshots.
//
// Needs the photos dev server: `cd examples/photos && pnpm dev` (port 9109).
// Override with TEST_RUNNER_PHOTOS_URL.
final class PhotosTests: KitchenSinkTestCase {
  func testTutorialApp() {
    continueAfterFailure = false
    launch(
      server: ProcessInfo.processInfo.environment["PHOTOS_URL"] ?? "http://localhost:9109/",
      waitingFor: "Browse")
    // The first page of Lorem Picsum starts with Alejandro Escamilla's photos.
    XCTAssert(element("Alejandro Escamilla").waitForExistence(timeout: 20), "photos loaded")
    sleep(3)  // images
    screenshot("tutorial-browse")

    press(.down)
    XCTAssert(focused("Alejandro Escamilla").waitForExistence(timeout: 5), "a photo focused")
    press(.select)
    XCTAssert(element("5000 × 3333").waitForExistence(timeout: 10), "detail screen")

    // Start from a photo that isn't a favorite (favorites persist between runs).
    if element("Favorited").exists {
      press(.select)
      XCTAssert(element("Favorite").waitForExistence(timeout: 5))
    }
    sleep(2)
    screenshot("tutorial-detail")

    press(.select)
    XCTAssert(element("Favorited").waitForExistence(timeout: 5), "favorited")
    screenshot("tutorial-favorited")

    press(.menu)
    XCTAssert(element("Browse").waitForExistence(timeout: 10))
    press(.up)
    press(.right)
    XCTAssert(focused("Favorites").waitForExistence(timeout: 5), "Favorites tab")
    XCTAssert(element("Alejandro Escamilla").waitForExistence(timeout: 10), "the favorite is there")
    sleep(2)
    screenshot("tutorial-favorites")
  }
}
