import XCTest

// Remote input that TVMLKit handles itself: menu bar focus, the play/pause
// button, long presses and the fullscreen player. Uses the kitchen-sink
// example's menuBarTemplate, Events and Player screens.
final class InteractionTests: KitchenSinkTestCase {
  override func setUpWithError() throws {
    continueAfterFailure = true
    launch()
  }

  // Focusing a menu item switches tabs; no select press needed. Menu from a
  // tab's content goes back to the menu bar, and again pops the screen.
  func testMenuBarFocusSwitchesTabs() {
    open("menuBarTemplate", marker: "First tab")
    XCTAssert(focused("menuBarTemplate").waitForExistence(timeout: 5), "first menu item focused")

    press(.right)
    XCTAssert(focused("Second").waitForExistence(timeout: 5))
    XCTAssert(element("Second tab").waitForExistence(timeout: 10), "tab switched on focus")

    // Focus moves geometrically: to the grid item below the focused tab.
    press(.down)
    XCTAssert(focused("Item ").waitForExistence(timeout: 5), "focus in the tab's grid")

    press(.menu)
    XCTAssert(focused("Second").waitForExistence(timeout: 5), "Menu returns to the menu bar")

    press(.menu)
    XCTAssert(element("Tabs, each its own document.").waitForExistence(timeout: 10), "Menu pops")
  }

  // onPlay, onHoldSelect, onHighlight and onSelect from real presses.
  func testLockupEvents() {
    open("Events", marker: "Last event")
    XCTAssert(focused("Lockup A").waitForExistence(timeout: 5))

    press(.playPause)
    XCTAssert(element("Last event: play A").waitForExistence(timeout: 5), "onPlay")

    remote.press(.select, forDuration: 1.5)
    XCTAssert(element("Last event: holdselect A").waitForExistence(timeout: 5), "onHoldSelect")

    press(.right)
    XCTAssert(element("Last event: highlight B").waitForExistence(timeout: 5), "onHighlight")

    press(.select)
    XCTAssert(element("Last event: select B").waitForExistence(timeout: 5), "onSelect")
  }

  // Menu during audio returns to the app with the audio still playing (like
  // the Music app), so no itemEnd. present() shows the player again; stop()
  // ends the item.
  func testAudioContinuesAfterMenu() {
    open("Player", marker: "Last ended")
    XCTAssert(focused("Play audio").waitForExistence(timeout: 5))
    press(.select)
    sleep(6)
    leavePlayer()

    let first = playerTime()
    sleep(5)
    let second = playerTime()
    XCTAssert(element("Player: playing").exists, "still playing")
    XCTAssertGreaterThan(second ?? 0, (first ?? .max) + 3, "audio advanced after Menu")
    XCTAssert(element("Last ended: none").exists, "no itemEnd yet")

    press(.right, times: 2)
    XCTAssert(focused("Show player").waitForExistence(timeout: 5))
    press(.select)
    XCTAssert(
      app.descendants(matching: .any).matching(identifier: "AXElapsedTime").firstMatch
        .waitForExistence(timeout: 10), "present() showed the player")
    leavePlayer()

    press(.right)
    XCTAssert(focused("Stop").waitForExistence(timeout: 5))
    press(.select)
    XCTAssert(
      element("Last ended: Kitchen Sink Song (stopped)").waitForExistence(timeout: 5), "itemEnd")
    XCTAssert(element("Player: end").exists, "state after stop()")
  }

  // Menu during video ends playback.
  func testMenuEndsVideo() {
    open("Player", marker: "Last ended")
    press(.right)
    XCTAssert(focused("Play video").waitForExistence(timeout: 5))
    press(.select)
    sleep(8)
    leavePlayer()
    attach("video-after-menu", app.debugDescription)
    XCTAssert(
      element("Last ended: Kitchen Sink Clip").waitForExistence(timeout: 10), "itemEnd for the video")
  }

  // With the audio background mode (examples/shell/project.yml), audio keeps
  // playing while the app is in the background.
  func testAudioKeepsPlayingInBackground() {
    open("Player", marker: "Last ended")
    press(.select)
    sleep(6)
    leavePlayer()
    let before = playerTime()

    remote.press(.home)
    sleep(12)
    app.activate()
    XCTAssert(element("Last ended").waitForExistence(timeout: 10))
    sleep(2)
    let after = playerTime()
    attach("background-audio", "before: \(String(describing: before)) after: \(String(describing: after))")
    XCTAssertGreaterThan(after ?? 0, (before ?? .max) + 10, "audio advanced in the background")
  }

  /// Presses Menu until the Player screen is showing (the first press may
  /// only hide the transport bar).
  private func leavePlayer() {
    var left = false
    for _ in 0..<3 where !left {
      press(.menu)
      left = element("Last ended").waitForExistence(timeout: 5)
    }
    XCTAssert(left, "Menu left the player")
  }

  /// Seconds played, from the Player screen's "Player: playing t=12" banner.
  private func playerTime() -> Int? {
    let label = element("Player: ").label
    guard let range = label.range(of: #"t=(\d+)"#, options: .regularExpression) else { return nil }
    return Int(label[range].dropFirst(2))
  }
}
