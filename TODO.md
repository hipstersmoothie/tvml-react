# TODO

Known gaps and missing features, roughly in priority order within each section.

## Verification

- [ ] **Remote interactions in an automated test.** `onSelect`, `onPlay` and
      `onHoldSelect` are only covered by unit tests against the fake DOM. Add an
      XCUITest target to `examples/hello/tvos` that drives `XCUIRemote` (select,
      swipe between segments, long press) and asserts the screen changed. Run it in
      CI on a tvOS simulator.
- [ ] **tvOS 26 sweep of every template and element.** Only `<shelf>`/`<row>`
      were confirmed to hit the `UIScreen.focusedView` crash that
      `TVMLKitCompatibility` patches. Render each template (`catalogTemplate`,
      `productTemplate`, `showcaseTemplate`, `grid`, `carousel`, ...) and note what
      works, what crashes and what needs a workaround.
- [ ] **Real hardware.** The extracted package and example have only run in the
      simulator. Check on an Apple TV, especially layout (`stackTemplate` and
      `divTemplate` have been seen to differ between device and simulator) and
      `FocusBridgeWindow`.
- [ ] **`<head><style>` and `className`.** Document-level stylesheets are typed
      and should work, but haven't been tried.
- [ ] **Older tvOS.** The Swift package declares tvOS 15 and the bundle targets
      Safari 15, but nothing older than tvOS 26 has been run.

## Features

- [ ] **Live reload.** `tvml-react dev` rebuilds but the app has to be relaunched.
      Have the bootstrap poll the dev server (or listen to esbuild's change
      stream) and call `App.reload()`.
- [ ] **Navigation helpers.** Pushing a screen or presenting a modal means
      creating a root and calling `navigationDocument` yourself, and nothing
      unmounts the root when the user backs out with Menu. Add
      `push(<Screen />)` / `presentModal(<Screen />)` that clean up on the
      document's `unload` event, and maybe a `useNavigation()` hook.
- [ ] **Keyboard / search.** `searchTemplate` and `textField` need the TVJS
      `Keyboard` feature (`getFeature("Keyboard")`, `onTextChange`). Add a
      `useKeyboard(ref)` hook and an `onTextChange` prop.
- [ ] **Media playback.** Wrap TVJS `Player` / `Playlist` / `MediaItem` in a hook
      or component.
- [ ] **Other TVJS APIs.** Typed wrappers for `Device`, `Settings`,
      `localStorage`, `App.onResume` / `onSuspend` lifecycle hooks.
- [ ] **Load and change events.** Only `select`, `highlight`, `play` and
      `holdselect` are delegated. Consider `load`, `change` and `unload`, and
      whether any of them need per-element listeners instead of delegation.
- [ ] **Suspense.** `maySuspendCommit` is hard-coded to `false`. Image
      preloading or suspending on data would need real support for it in the
      host config.
- [ ] **Multiple roots into one document / portals.** Not supported.

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
      `origin`/`port`. Check whether TVJS provides `fetch`, `TextEncoder`,
      `AbortController`, `structuredClone`, and polyfill or document the gaps.
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
- [ ] **`TVMLKitCompatibility` swizzles a private path.** It replaces
      `-[UIScreen focusedView]` globally. Remove it once Apple fixes TVMLKit, and
      keep checking new tvOS releases for other crashes.

## Developer experience

- [ ] **Docs site / API reference.** The README is the only documentation.
- [ ] **More examples.** A kitchen-sink app showing every template (doubles as
      the tvOS 26 sweep above), plus a data-fetching example.
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
