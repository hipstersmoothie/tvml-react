# tvml-react

A React renderer for Apple TV's [TVMLKit](https://developer.apple.com/documentation/tvmlkit).
Write tvOS screens as React components and the renderer turns them into native
TVML templates, with focus, the remote, and the system look all handled by tvOS.

```tsx
import { launch, type StartOptions } from "tvml-react";
import { useState } from "react";

function Counter() {
  const [count, setCount] = useState(0);
  return (
    <alertTemplate theme="dark">
      <title>{`Pressed ${count} times`}</title>
      <button onSelect={() => setCount((c) => c + 1)}>
        <text>Press me</text>
      </button>
    </alertTemplate>
  );
}

export function start(_options: StartOptions) {
  launch(<Counter />);
}
```

<p>
  <img src="docs/albums.jpg" width="49%" alt="A shelf of album lockups under a segmentBar nav" />
  <img src="docs/native-list.jpg" width="49%" alt="The native simplifiedList element" />
</p>

The [example app](examples/hello) running in the tvOS 26 simulator.

## What's in the box

- **Renderer.** A `react-reconciler` host config that writes straight into the TVJS DOM.
  It handles concurrent rendering, hooks, refs, and swapping templates in place.
- **Typed TVML JSX.** TVMLKit's built-in elements are lowercase tags, each with
  its own type, so `<div>` or `<lockup theme="dark">` won't compile. Styles are
  written as objects (`{ tvAlign: "center" }`). Natively registered elements are
  imported components instead.
- **Events.** `onSelect`, `onHighlight`, `onPlay`, and `onHoldSelect`, delegated
  from the document.
- **Navigation, tabs and platform hooks.** `useNavigation` for pushed screens
  and modals, and `MenuBar` for native tab bars. Hooks for app state, device, settings, storage, the media player and
  search input. Through the native bridge: appearance, accessibility, network,
  display, and keeping the screen awake.
- **JavaScriptCore polyfills.** These cover what React and everyday code expect
  but TVJS lacks: `fetch`, `AbortController`, `queueMicrotask`,
  `performance.now`, `URL` and `URLSearchParams`.
- **CLI.** `tvml-react build` and `tvml-react dev` bundle your app for TVJS using esbuild,
  serve it on your LAN, and ship a bootstrap `Application.js`.
- **Swift package.** One call to launch the app. It also fixes a TVMLKit crash
  on tvOS 26, registers custom native elements for you, and ships a focus
  bridge for header navs and a scrollable native list.

## Getting started

```sh
npm install tvml-react react
npm install -D esbuild typescript @types/react
```

### 1. Point JSX at tvml-react

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "tvml-react",
    "lib": ["ES2022", "DOM"], // DOM for setTimeout/XMLHttpRequest, which TVJS provides
    "moduleResolution": "bundler",
    "strict": true
  }
}
```

### 2. Export `start` from your entry

```tsx
// src/main.tsx
import { launch, type StartOptions } from "tvml-react";
import { App } from "./App";

export function start({ baseUrl }: StartOptions) {
  launch(<App apiBase={baseUrl} />);
}
```

`launch` renders into a new document and presents it. Every screen (the root,
pushed screens, modals, tabs and overlays) has its own error boundary. A screen
that throws while rendering shows an alert with the error and a Try Again
button, and the rest of the app keeps working.

### 3. Build or serve it

```sh
npx tvml-react dev src/main.tsx     # watch + serve on http://0.0.0.0:9001/, with live reload
npx tvml-react build src/main.tsx   # write dist/app.js + dist/Application.js
```

Both put two files in the output folder:

- `app.js`: your bundle.
- `Application.js`: a small bootstrap that shows a spinner, loads `app.js`, and
  calls your `start()`.

`dev` also reloads the app on the Apple TV after every successful rebuild, and
prints the app's `console.*` output in your terminal. The bootstrap turns both on
only when it finds the dev server, so production hosting is unaffected.

### 4. Load it from a tvOS app

Add the `TVMLReactExtras` Swift package (**File → Add Package Dependencies…**,
`https://github.com/hipstersmoothie/tvml-react`) and launch from your app
delegate:

```swift
import TVMLReactExtras

let window = UIWindow(frame: UIScreen.main.bounds)
self.window = window
appController = TVMLReact.launch(
  serverURL: URL(string: "http://192.168.1.42:9001/")!, // your Mac's LAN IP, or localhost in the simulator
  window: window,
  delegate: self
)
```

`TVMLReact.launch` installs tvml-react's native pieces, then points a
`TVApplicationController` at `Application.js`.

[`examples/shell`](examples/shell) is a complete Xcode project you can copy; it
runs every example in this repo.
Allow HTTP to your dev server with `NSAppTransportSecurity` → `NSAllowsLocalNetworking`.
JavaScript changes only need an app relaunch, not an Xcode rebuild.

## API

### `launch(element, options?)`

Creates a root, renders `element`, and presents the document, replacing the
current top of the navigation stack. It returns the `TVMLRoot`, or `undefined`
if the first render failed.

| Option        | Description                                                          |
| ------------- | -------------------------------------------------------------------- |
| `onError`     | Called with every error React reports. Defaults to `console.error`. |
| `errorTitle`  | Title of the default error alert.                                    |
| `renderError` | `(error, retry) => ReactNode`: what a screen shows when it throws. |
| `wrapper`     | A component wrapping the app and every pushed screen; put context providers here. |

### `createRoot(document?, options?)`

Lower-level control. If you don't pass a document, it creates an empty `<document>`.

```ts
const root = createRoot();
root.render(<App />); // flushed synchronously
presentDocument(root.document);
// later
root.unmount();
```

Your components render the document's children: one template element and an
optional `<head>`. Returning a different template element swaps the whole
screen in place (for example, `loadingTemplate` → `stackTemplate`).

The first render is flushed synchronously, which matters. TVMLKit shows an
empty document as a blank screen and ignores later mutations. Once a non-empty
document has been presented, mutations do show up, and state updates render
through React's scheduler as usual.

For more screens, use [`useNavigation`](#navigation) rather than more roots.
The lower-level helpers `getNavigationDocument`, `presentDocument`,
`parseDocument`, `createDocument` and `presentMessage` are exported too.

### Navigation

```tsx
const navigation = useNavigation();

<lockup onSelect={() => navigation.push(<AlbumDetail album={album} />)} />
```

`push`, `presentModal`, `replace`, `pop`, `popToRoot` and `dismissModal`. Each
pushed screen gets its own TVML document but renders from the app's one React
tree (through a portal), so state and context are shared. A screen unmounts
when TVMLKit unloads its document, including when the user presses Menu.
Providers that pushed screens need to see go in `launch`'s `wrapper` option.

### Tabs

```tsx
<menuBarTemplate>
  <MenuBar defaultSelected="home">
    <MenuBarItem id="home" title="Home"><Home /></MenuBarItem>
    <MenuBarItem id="search" title="Search"><Search /></MenuBarItem>
  </MenuBar>
</menuBarTemplate>
```

Each tab gets its own TVML document but renders from the app's one React tree,
so the tabs share context and state. A tab mounts the first time it's selected
and stays mounted, so switching back keeps its scroll position and data.
`useMenuBar().select(id)` switches tabs from code. `useIsScreenVisible()` inside a
tab follows the selected tab.

### `DocumentPortal`

Renders part of the tree into another TVML document, wired up like a screen:
events, `useScreenEvent` and `useIsScreenVisible` all work inside it. Navigation,
tabs and `PlayerOverlay` are built on it. `onReady(doc)` fires once the children
are committed, which is the earliest safe moment to present the document.

```tsx
<DocumentPortal onReady={(doc) => getNavigationDocument().presentModal(doc)}>
  <alertTemplate>…</alertTemplate>
</DocumentPortal>
```

### Events

| Prop           | TVML event   | Fires when                                                           |
| -------------- | ------------ | -------------------------------------------------------------------- |
| `onSelect`     | `select`     | A focusable element is clicked.                                      |
| `onHighlight`  | `highlight`  | Focus moves onto the element. `segmentBarItem` only fires this one.  |
| `onPlay`       | `play`       | Play/pause is pressed while the element has focus.                   |
| `onHoldSelect` | `holdselect` | A long press.                                                        |
| `onChange`     | `change`     | A value changed, e.g. a `ratingBadge` in a `ratingTemplate`.         |

Each screen adds one listener per event type to its document. When an event
fires, it walks up from the target to the nearest element that has a handler.
Handlers receive the `TVMLEvent`. As in React DOM, presses and typing are
discrete input: state updates from these handlers are committed before the
handler returns.

### Attributes and styles

- `style` takes a string or an object. Object keys are converted to kebab case
  and numbers are written without units:
  `{ tvTextMaxLines: 2, fontSize: 40 }` → `tv-text-max-lines: 2; font-size: 40;`.
- `className` becomes `class`. `true` becomes `"true"`. `false`, `null`, and
  `undefined` remove the attribute.
- An attribute is only written when its serialized value changes. This prevents
  TVMLKit from re-decoding images and replaying focus animations on every
  render.
- `ref` gives you the underlying `TVMLElement`.
- `srcset` also takes an object, `{ "1x": url, "2x": url2x }`. It warns when a
  URL contains a comma: TVMLKit splits `srcset` on commas, and the image ends up
  blank.

### Text fields and focus

`<textField>` and `<searchField>` take `onTextChange`, `defaultValue` (set once)
and `value` (controlled). Their children are the placeholder:

```tsx
<searchField value={query} onTextChange={setQuery}>Shows, people, genres</searchField>
```

A controlled field (`value`) always shows `value`. If `onTextChange` rejects a
keystroke, for example by filtering out non-digits, the field reverts to
`value`.

`focus(element)` moves focus to an element in a presented template (TVJS has no
focus API; this re-sets `autoHighlight`). It doesn't work in `formTemplate`,
where the keyboard keeps focus.

### Custom elements

Lowercase tags are reserved for TVMLKit's built-in elements. Anything custom is
an ordinary function component you import.

For an element backed by your own UIKit view, register the view in Swift and
write a component that renders the tag. `TVMLReact` takes care of
`TVElementFactory`, `TVInterfaceFactory` and sharing the single interface
creator TVMLKit allows:

```swift
// Before TVMLReact.launch
TVMLReact.register("gauge") { element, existingView in
  let view = existingView as? GaugeView ?? GaugeView()
  view.value = Double(element.attributes?["value"] ?? "") ?? 0
  return view
}
```

```tsx
import { createElement } from "react";
import type { TVMLAttributes } from "tvml-react";

export function Gauge(props: TVMLAttributes & { value: number }) {
  return createElement("gauge", props);
}

<Gauge value={0.4} style={{ width: 400, height: 40 }} />
```

Props become attributes on the element, and the shared props (`style`,
`onSelect`, `ref`, ...) work as they do on built-in tags.

## Hooks

Hooks for what the Apple TV itself knows. The first group uses APIs TVJS
already provides. The second group reads from a small native bridge that
`TVMLReact.launch` installs, so it needs no Swift from you. Without the bridge
those hooks return defaults.

| Hook | Returns |
| --- | --- |
| `useNavigation()` | `push`, `presentModal`, `replace`, `pop`, `popToRoot`, `dismissModal` |
| `useScreenEvent(type, fn)` | Runs `fn` on this screen's `load`, `appear`, `disappear` or `unload` |
| `useIsScreenVisible()` | Whether this screen is the one on the TV |
| `useAppState()` / `useAppEvent("suspend" \| "resume", fn)` | `"active"` or `"background"`, from `App.onSuspend`/`onResume` |
| `useDevice()` | Model, product type, tvOS version, app id and version, vendor id |
| `usePlatformSettings()` | Language, storefront country and parental restrictions |
| `useTraitCollection()` | Screen size, scale and layout direction |
| `useLocalStorage(key, initial)` | JSON state in TVJS `localStorage`, synced between components |
| `usePlayer()` | See [Media playback](#media-playback) |
| `onTextChange` on `<searchField>`/`<textField>` | The typed text, as the user types |
| **Native bridge** | |
| `useColorScheme()` | `"light"` or `"dark"` |
| `useAccessibility()` | Reduce Motion, VoiceOver, Bold Text, Reduce Transparency, Closed Captions, Increase Contrast |
| `useNetworkStatus()` | `online`, `expensive`, `constrained`. Without the bridge it polls `Device.isNetworkReachable` |
| `useDisplay()` | Size, scale, max refresh rate, HDR support |
| `useKeepAwake(enabled?)` | Stops the screensaver while mounted |

Also exported: `openURL` and `canOpenURL` (to open other apps), `reloadApp()`,
and `getKeyboard(element)` for setting a field's text yourself.

```tsx
function Search() {
  const [query, setQuery] = useState("");
  return (
    <searchTemplate>
      <searchField onTextChange={setQuery} />
      <collectionList>{/* results for query */}</collectionList>
    </searchTemplate>
  );
}

function NowPlaying() {
  useKeepAwake();
  const { reduceMotion } = useAccessibility();
  const player = usePlayer();
  return (
    <buttonLockup onSelect={() => player.play({ url: STREAM, title: "Live" })}>
      <title>{player.state === "playing" ? "Playing" : "Play"}</title>
    </buttonLockup>
  );
}
```

## Media playback

```tsx
const player = usePlayer();

<lockup onSelect={() => player.play({ url, title, artworkImageURL, startTime: saved })} />

<PlayerOverlay player={player}>
  <divTemplate>{/* artwork for audio, live chat, … */}</divTemplate>
</PlayerOverlay>
```

- **`usePlayer()`** returns `play(items, { startIndex })`, `pause`, `resume`,
  `stop` and `seek`, plus `state`, `currentTime`, `duration`, `currentItem` and
  `error`. `nativePlayer()` returns the TVJS `Player` itself, for anything else.
- **Start position.** `startTime` starts playback at a position. `resumeTime`
  instead makes TVMLKit ask "Resume Playback / Start from Beginning" and wait.
- **Last position.** `currentTime` keeps the last real position after playback
  stops, so you can save where the user left off.
- **`<PlayerOverlay>`** renders React over the fullscreen player. It can be
  mounted before or during playback. With `interactive`, the overlay takes focus
  when the user swipes down.
- **One player per `usePlayer` call.** The player stops when its component
  unmounts. Call it once per screen, or share it through `launch`'s `wrapper`,
  not once per row.
- **Visibility.** Presenting the player fires `disappear` on the screen
  underneath, so polling gated on `useIsScreenVisible()` pauses while the video
  is up.

## Data fetching

TVJS has `XMLHttpRequest` but no `fetch`. tvml-react's polyfills install
`fetch`, `Headers`, `Response`, `AbortController` and `AbortSignal` on top of it,
so data libraries like TanStack Query and SWR work. It covers JSON and text
bodies (no streaming or blobs). TVJS's `XMLHttpRequest` fires `error` instead of
`load` for HTTP errors such as 404; the polyfill resolves those as ordinary
responses with `ok: false`. TVJS has no `WebSocket` or `EventSource`.

For timeouts, use `AbortSignal.timeout(ms)`, combined with a caller's signal
via `AbortSignal.any([...])`, or pass the non-standard `timeout` option.

## Testing on the device

TVJS supports synthetic events, so you can drive a running app from JavaScript
without XCUITest. `tvml-react/testing` has the helpers:

```ts
import { fireSelect, queryAll, queryByText, typeText } from "tvml-react/testing";

fireSelect(queryByText("Kind of Blue")!);        // bubbles up to the lockup's onSelect
typeText(queryAll("searchField")[0], "miles");   // sets the text and fires onTextChange
```

- **Where they search.** Queries search every visible screen (including the
  selected tab) unless you pass a root.
- **Disabled elements.** Firing an event at a disabled element throws, since
  a real remote can't reach it.
- **State is up to date.** Handlers run synchronously, so the next query sees
  the new state.

## Swift package

`TVMLReactExtras` (sources in `native/`) is the native half of tvml-react.

- **`TVMLReact.launch(serverURL:window:delegate:)`** installs everything below
  and starts the app.
- **`TVMLReact.install()`** does the installing without launching, if you'd
  rather create the `TVApplicationController` yourself.
- **`TVMLReact.register(_:childElements:makeView:)`** registers custom elements
  (see [Custom elements](#custom-elements)).

`install()` also works around a TVMLKit bug. In apps built with the tvOS 26 SDK,
TVMLKit's own `<shelf>`, `<grid>`, `<row>` and other collection elements crash
with *"Accessing the focus system through UIScreen is no longer supported"*. The
workaround answers that lookup through `UIFocusSystem` instead.

### `FocusBridgeWindow`

TVML focus is purely geometric, and TVJS has no API for moving it. As a result,
a control with nothing directly above it can't get back up to a header
`segmentBar`. Use `FocusBridgeWindow(frame:headerHeight:)` as the controller's
window. It adds a `UIFocusGuide` that connects the header and the body in both
directions.

### `SimplifiedList`

`divTemplate` doesn't scroll. `SimplifiedList` is a custom view element backed
by a `UITableView`: drop it into a `divTemplate` and it scrolls and handles
focus natively. A `segmentBar` header above it stays standard TVML.
`TVMLReact.install()` registers it.

```tsx
import { SimplifiedList, SimplifiedListRow } from "tvml-react/simplified-list";

<SimplifiedList summary="Recently played" style={{ width: 1920, height: 880 }}>
  {tracks.map((t) => (
    <SimplifiedListRow key={t.id} title={t.title} subtitle={t.artist} accessory={t.time} image={t.art} />
  ))}
</SimplifiedList>
```

## Build tooling without the CLI

`tvml-react/build` exports the esbuild preset, so you can add to it yourself:

```js
import { build, serve, tvmlBuildOptions } from "tvml-react/build";

await build({ entry: "src/main.tsx", outdir: "public/tv" });
// or: esbuild.build(tvmlBuildOptions({ entry, outdir, esbuild: { /* overrides */ } }))
```

With a different bundler, you need to:

- Emit one classic script, not ESM.
- Target roughly Safari 15.
- Import `tvml-react/polyfills` before anything else.
- Publish your exports as `globalThis.TVMLReactApp`, or write your own
  `Application.js`.

## Notes

- **Debugging.** `tvml-react dev` prints the app's console output in your
  terminal. For a full Web Inspector on the TVJS context, open Safari →
  Develop → *your Apple TV or simulator*.
- **Template quirks.** [docs/platform-notes.md](docs/platform-notes.md)
  collects what we've learned about TVMLKit on tvOS 26: which styles work in
  `divTemplate`, elements that don't update after presentation, `srcset` and
  comma URLs, `formTemplate` limits, and more.
- **TVMLKit's future.** Apple hasn't put much into TVMLKit for years. This
  renderer works with it as it is and works around what it has to.

## Development

```sh
pnpm install
pnpm test        # vitest, against an in-memory fake TVJS DOM
pnpm typecheck   # includes compile-time checks for the JSX types
pnpm build

cd examples/hello && pnpm dev   # serves on :9100; run examples/shell in Xcode
```

The shell's Xcode project is generated from `examples/shell/project.yml`
with [XcodeGen](https://github.com/yonaskolb/XcodeGen).

## License

MIT
