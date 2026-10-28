# Changelog

tvml-react is 0.x: minor versions can change APIs. Breaking changes are listed
under **Breaking** for each release.

## 0.1.0

The first release on npm, with `create-tvml-react` for starting a new app:

```sh
npm create tvml-react my-app
```

**What's in it**

- A React renderer for TVMLKit: typed TVML JSX, delegated events
  (`onSelect`, `onHighlight`, `onPlay`, `onHoldSelect`), per-screen error
  boundaries, and screens, modals and tabs (`useNavigation`, `MenuBar`) in one
  React tree.
- `tvml-react/layout`: rows, cells, stacks and boxes for free-form
  `divTemplate` screens, inside the TV-safe area.
- Media: `usePlayer`, a shared `PlayerProvider`, `PlayerOverlay`, and
  `itemEnd` events.
- Data: `tvml-react/query` (TanStack Query that pauses on hidden screens),
  `fetch`, `WebSocket` and other polyfills for TVJS.
- Platform hooks: app state, device, settings, storage, appearance,
  accessibility, network, display, keeping the screen awake, `measureText`.
- `tvml-react/native` components backed by the `TVMLReactExtras` Swift
  package: `Backdrop`, `Card`, `Avatar`, `QRCode`, `SimplifiedList`.
- `tvml-react dev` / `build`: esbuild bundling, a bootstrap `Application.js`,
  live reload and console relay to your terminal.
- `tvml-react/testing` helpers, and the `TVMLReactExtras` Swift package with
  `TVMLReact.launch`, a tvOS 26 TVMLKit crash fix and `FocusBridgeWindow`.

**Since 0.1.0-pre.3**

- `tvml-react/layout` (`Screen`, `Row`, `Cell`, `Image`, `Spacer`,
  `Columns`, `Stack`, `Box`).
- Development warnings for `divTemplate` styles TVMLKit ignores.
- `usePlayer().present()` shows the player again after Menu during audio,
  which keeps playing.
- Fix: after `stop()`, the player's state is `"end"`.

**Breaking since 0.1.0-pre.2**

- The native `Card` renders `<materialCard>` instead of `<card>`, which is a
  built-in TVML element. Update any `TVMLReact.register("card")` overrides.

## 0.1.0-pre.3

Fixes a TVMLKit crash from adjacent text nodes (`Track {n}`), `FocusBridgeWindow`
on tvOS 26, and remote presses on `SimplifiedList` rows.

## 0.1.0-pre.2

WebSockets over the native bridge, the native elements, and `measureText`.

## 0.1.0-pre.1

The first prerelease, as GitHub release tarballs.
