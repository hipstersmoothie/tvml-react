# TODO

Known gaps and missing features, roughly in priority order within each section.

## Verification

- [ ] **Hooks the simulator can't change.** `useColorScheme` and
      `useNetworkStatus` updates haven't been seen live, because the tvOS
      simulator can't switch appearance and the host network can't be toggled.
      They use the same bridge path as accessibility changes, which were
      verified. Check on hardware.
- [ ] **Typing.** `onTextChange` was verified by setting the keyboard's text
      from JS; real typing on the on-screen keyboard is untested.

- [ ] **Remote interactions in an automated test.** Synthetic events
      (`tvml-react/testing`) exercise the handlers, but not TVMLKit's own focus
      and press handling. Add an XCUITest target to `examples/shell` that drives
      `XCUIRemote` (select, swipe, long press, Menu) and run it in CI. Open
      questions: does focusing a `menuItem` fire `select`, and what does Menu do
      from the player and from tabs?
- [ ] **tvOS 26 sweep of every template and element.** Only `<shelf>`/`<row>`
      were confirmed to hit the `UIScreen.focusedView` crash that
      `TVMLReact.install()` works around. Render each template (`catalogTemplate`,
      `productTemplate`, `showcaseTemplate`, `grid`, `carousel`, ...) and note what
      works, what crashes and what needs a workaround.
- [ ] **Real hardware.** The extracted package and example have only run in the
      simulator. Check on an Apple TV, especially layout (`stackTemplate` and
      `divTemplate` have been seen to differ between device and simulator) and
      `FocusBridgeWindow`.
- [ ] **Older tvOS.** The Swift package declares tvOS 15 and the bundle targets
      Safari 15, but nothing older than tvOS 26 has been run.

## Features

- [ ] **Layout helpers.** `divTemplate` is a region flow layout with many
      no-op styles (see docs/platform-notes.md). Ship `tvml-react/layout`
      (`Row`, `Cell`, `Columns`, safe-area constants), starting from
      `examples/dashboard/src/layout.tsx`.
- [ ] **Native visual elements.** Register through `TVMLReact.install()`:
  - `Backdrop`: a crossfading background image with a scrim. TVML's
    `<background>` is frozen once presented.
  - `Panel`: a blurred, rounded `UIVisualEffectView`.
  - `measureText()` on the native bridge, for cells sized to their text.
- [ ] **WebSocket.** TVJS has neither `WebSocket` nor `EventSource`. Provide a
      native-bridge `WebSocket` (`URLSessionWebSocketTask`) so real-time
      services work (stream.place chat currently polls third-party indexes).
- [ ] **`Slideshow` wrapper.** A typed `startSlideshow(images, options)`.
      Blank in the simulator; needs a hardware check.
- [ ] **Keyboard suggestions.** Expose the Keyboard feature's `suggestions` on
      `searchField`.
- [ ] **Top Shelf.** `userDefaults` (shared with a Top Shelf extension) and
      `App.noteTopShelfDataChanged`.
- [ ] **Remote input.** A `useRemote()` hook over the Game Controller
      framework (the Siri Remote appears as a micro gamepad) for swipes and
      buttons TVML doesn't surface.
- [ ] **Deep links.** Forward `application(_:open:options:)` from Swift into a
      `useOpenURL()` hook.
- [ ] **Now Playing.** Publish what's playing to Control Center through
      `MPNowPlayingInfoCenter` (`useNowPlaying()`).
- [ ] **Current user.** Per-profile data on multi-user Apple TVs.
- [ ] **Focus helpers.** `useFocusedElement()` built on `highlight`, and a way
      to focus inside `formTemplate`.
- [ ] **Suspense.** `maySuspendCommit` is hard-coded to `false`. Image
      preloading or suspending on data would need real support for it in the
      host config.
- [ ] **Context in pushed screens.** Pushed screens only see providers in
      `launch`'s `wrapper`, not ones inside `<App>`. Consider capturing context
      at the `push()` call site, or warning in development.

## Typings

- [ ] **Per-element attributes are approximate.** The catalog in
      `src/elements.ts` covers the common tags and attributes from Apple's TVML
      reference, but not all of them. Audit it against the docs (e.g.
      `lockup` `type`, `img` `srcset` formats, `mediaContent`, `ratingTemplate`).
- [ ] **Style typing.** `TVMLStyle` lists the well-known properties but accepts
      any key. Consider stricter value types (`tvAlign`, `tvPosition` unions).
- [ ] **TVJS globals.** Apps currently need `lib: ["DOM"]` for `setTimeout` and
      `XMLHttpRequest`, which also drags in browser-only types. Ship a
      `tvml-react/globals` declaration file for what TVJS actually provides.

## Runtime

- [ ] **Polyfills are minimal.** `URL` doesn't resolve relative URLs and has no
      `origin`/`port`. The `fetch` polyfill has no streaming or blob bodies.
      `TextEncoder` and `structuredClone` are missing.
- [ ] **Scheduler latency.** Without `MessageChannel`, React's scheduler falls
      back to `setTimeout`. Measure whether updates feel sluggish on hardware
      and whether a `queueMicrotask`-based shim is better.
- [ ] **Bootstrap.** `Application.js` loads the bundle with XHR plus indirect
      `eval`. Compare with TVJS's `evaluateScripts`, which gives nicer stack
      traces in the Safari inspector.
- [ ] **Build target.** `safari15` is conservative. Confirm the oldest tvOS we
      support and raise the target to match.

## Native extras

- [ ] **`SimplifiedList` rows can't be selected.** Rows are native table cells
      and don't dispatch TVML events back to JS. Fire `select` / `highlight` on
      the row elements (or expose a callback) so `onSelect` works.
- [ ] **`SimplifiedList` styling is hard-coded.** Row height, fonts, colours
      and artwork size are fixed in Swift. Read them from TVML attributes or
      styles.
- [ ] **`FocusBridgeWindow` is geometry-based.** It splits header and body by a
      fixed Y. Look for a way to find the header views directly.
- [ ] **The tvOS 26 workaround swizzles UIKit.** It replaces
      `-[UIScreen focusedView]` globally. Remove it once Apple fixes TVMLKit, and
      keep checking new tvOS releases for other crashes.

## Developer experience

- [ ] **Docs site / API reference.** The README is the only documentation.
- [ ] **More examples.** A kitchen-sink app showing every template (doubles as
      the tvOS 26 sweep above).
- [ ] **Template generator.** `npm create tvml-react` that scaffolds the JS app
      and an Xcode shell.
- [ ] **React DevTools.** Not wired up; see whether a standalone DevTools
      backend can connect from TVJS.
- [ ] **Lint/format config.** None in the repo yet.

## Release

- [ ] **Publish to npm.** Not published yet. Add a changelog (changesets), a
      release workflow, and a `0.x` stability note in the README.
- [ ] **Move vinyl-scrobbler onto the package.** It still has its own copy of
      the renderer and its Swift extras, so fixes made here (cleared handlers,
      `"true"` booleans, render-error alert, tvOS 26 compatibility) don't reach
      it.
