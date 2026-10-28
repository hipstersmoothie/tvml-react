# TVMLKit platform notes

What we learned building the [example apps](../examples) against TVMLKit on
tvOS 26 (simulator unless noted). These are platform behaviours, not
tvml-react bugs, but you'll run into them.

## Runtime (TVJS)

- **Missing globals.** No `fetch`, `AbortController`, `TextEncoder`,
  `structuredClone`, `requestAnimationFrame`, `WebSocket` or `EventSource`.
  tvml-react polyfills `fetch`/`AbortController`, `URL`/`URLSearchParams`,
  `queueMicrotask` and `performance.now`, and provides `WebSocket` through the
  native bridge.
- **What is there.** `XMLHttpRequest`, `Promise`, `Intl` (including
  `RelativeTimeFormat`), timers, `localStorage`/`sessionStorage`,
  `atob`/`btoa`, `Event` and `dispatchEvent`, and `DOMParser` (which parses
  arbitrary XML such as RSS). Also `Device`, `Settings`,
  `Player`/`Playlist`/`MediaItem`, `Slideshow`, `userDefaults`,
  `openURL`/`canOpenURL`, `formatDate`/`formatDuration`/`formatNumber` and
  `getActiveDocument`.
- **HTTP errors arrive as `error`.** `XMLHttpRequest` fires `error`, not `load`,
  for HTTP errors such as 404; the status and body are intact. tvml-react's
  `fetch` handles this.
- **XML namespaces.** `DOMParser` ignores namespaces:
  `getElementsByTagName("itunes:duration")` finds nothing, and there's no
  `getElementsByTagNameNS`. Walk the child nodes and compare `nodeName` instead.
  Malformed XML throws.
- **Live lists.** `getElementsByTagName` returns a live list with `.length` and
  `.item(i)`, not an array.
- **No console in the system log.** `console.*` output doesn't reach the
  simulator's log. Use `tvml-react dev`, which relays it to your terminal, or
  Safari's Web Inspector.

## DOM

- **Adjacent text nodes crash.** Appending a text node next to another one
  merges them (libxml2 frees the added node), but its JS wrapper still points
  at it. When the wrapper is garbage collected the node is freed again: a
  malloc abort in `-[IKDOMNode dealloc]`, often seconds later and on another
  screen. Plain TVJS reproduces it within a few pushes. tvml-react writes
  text-only children (`Track {n}`) as one text node and warns when adjacent
  text sits next to elements; join those into one string.
- **Custom tag names.** Give natively registered elements names that aren't
  in the TVML catalog, since `TVElementFactory` is keyed by tag name. `card`,
  for one, is a built-in element, which is why tvml-react's native `Card`
  renders `<materialCard>`.

## Documents and focus

- **Lifecycle events.** Documents get `load`, `appear`, `disappear` and
  `unload`. Suspending and resuming the app doesn't fire
  `disappear`/`appear`; use `useAppState`/`useAppEvent` for that.
- **The player covers screens.** Presenting the fullscreen player fires
  `disappear` on the screen underneath, and `appear` when the player closes.
- **Moving focus.** Re-setting `autoHighlight` moves focus (`focus(element)`),
  except in `formTemplate`.
- **Focus callbacks.** On tvOS 26, `UIWindow.didUpdateFocus(in:with:)` isn't
  called for focus changes inside TVMLKit's views. Observe
  `UIFocusSystem.didUpdateNotification` instead; `FocusBridgeWindow` does.
- **Select presses in native views.** TVMLKit handles the select press itself,
  so a `UITableView` inside a custom element never gets `didSelectRowAt`.
  Catch `pressesEnded` on the way up the responder chain; `SimplifiedList`
  does.
- **Where focus lands.** It returns to the opening row after `pop`, to where it
  was after a modal is dismissed, and to the first focusable element after the
  root template is swapped. Changing the focused row's content keeps focus on
  it.
- **Menu bars.** The first `menuItem` gets focus at load unless another has
  `autoHighlight`. Calling `setSelectedItem` before the document is presented
  doesn't stick. A menu item with no document shows a spinner.

## Templates

- **Bars cover content.** In `menuBarTemplate` tabs, the floating bar covers a
  `stackTemplate`/`catalogTemplate`/`listTemplate` `<banner><title>`. Leave the
  banner out of tabs.
- **`formTemplate`** shows only its first `textField`. Build multi-field forms as
  a sequence of screens.
- **`ratingTemplate`** ignores DOM changes once it's presented; only the initial
  values show. Pop and push it again instead.
- **`productTemplate`.** A `<subtitle>` in the banner stack renders tiny; use
  `<text>`. `buttonLockup` without a `<badge>` renders an empty white box.
- **`listTemplate`.** The banner `<description>` renders tiny in the corner, so
  use `relatedContent` for side panels. A text-only
  `relatedContent > lockup > description` shows about 4 lines unless you set
  `tvTextMaxLines`. A focused row title marquees, which drops leading
  whitespace.
- **`alertTemplate`.** Titles render small. A modal alert is fully opaque.
- **`oneupTemplate`** hides lockup titles until you interact with it.
- **`card`** needs an explicit `width`/`height`. Its children are placed with
  `tv-position`/`tv-align`, and unstyled text is small and black.
- **Failed images** leave an empty box; there's no placeholder.
- **`textField` placeholders** aren't exposed to accessibility, so UI tests
  can't find a form by its placeholder.
- **Long text.** `handlesOverflow="true"` on `description`/`text` adds a
  "MORE" affordance and makes it selectable. `\n` in text gives line and
  paragraph breaks.

## `divTemplate` layout

`divTemplate` is a 9-region flow layout (`tv-position: top-left` … `bottom-right`),
not absolute positioning.

- **Text is black** unless you set `color`, whatever the `theme` or system
  appearance.
- **Regions stack.** Children in the same region stack vertically.
- **`top`, `center` and `bottom` left-align** their content; add
  `tv-align: center`.
- **Columns size to content.** Left and right columns are as wide as their
  widest child, which shifts the centre column.
- **A predictable recipe.** Full-width `<row>`s in the top, centre and bottom
  regions, made of fixed-width `<text>` cells.
- **`<stack>` is unreliable.** Without an explicit `width` it disappears.
  With several top-level stacks only the last renders. Its children can be
  reordered, a stack inside a `<row>` doesn't render, and its
  `background-color` and `padding` are ignored.

**Styles in `divTemplate`:**

| Works | Doesn't |
| --- | --- |
| `<text>`: `color`, `font-size`, `font-weight`, `font-family`, `width`, `height`, `text-align`, `background-color`, `padding`, horizontal `margin`, `tv-text-max-lines` | `border-radius` on text |
| Vertical margin between items in a region | Vertical `margin` on `<row>` children |
| `tv-interitem-spacing` on `<row>` | `background-color` on `<row>`/`<stack>` |
| `<head><style>` with `className`, `@media tv-template and (tv-theme:dark)` | `font-style: italic` |
| `data:` URI images | `tv-content-align: top` |
| | `tv-tint-color` on images (it repaints them as a mask) |

**Gotchas:**
- An empty `<text>` collapses; render `" "` instead.
- `fontSize` overrides `tvTextStyle`.

## Template sweep

[`examples/kitchen-sink`](../examples/kitchen-sink) has a screen for every
template plus lockup variants and `mediaContent`, and `KitchenSinkTests` opens
each one with the remote. On the tvOS 26.5 simulator all of them render and
pop cleanly: `alertTemplate`, `catalogTemplate`, `compilationTemplate`,
`descriptiveAlertTemplate`, `divTemplate`, `formTemplate`, `listTemplate`,
`loadingTemplate`, `menuBarTemplate`, `oneupTemplate`, `paradeTemplate`
(with `imgDeck`), `productBundleTemplate`, `productTemplate` (with
`ratingCard`, `reviewCard` and `productInfo`), `ratingTemplate`,
`searchTemplate`, `showcaseTemplate` and `stackTemplate`. The only crash it
found was the adjacent text node bug above. Whether `mediaContent` previews
actually play wasn't checked.

## Images

- **`srcset` and commas.** TVMLKit splits `srcset` on every comma. A URL that
  contains one (IIIF `!300,300`, Cloudinary `w_300,h_200`) blanks the image,
  with no fallback to `src`. The object form `srcset={{ "1x": a, "2x": b }}`
  warns about this.
- **Frozen backgrounds.** A `<background>` image can't change once the document
  is presented: not via `src`, not by replacing the node, not with `key`.
  Present a new document to change it.
- **`<img>` in `divTemplate`.** The `width`/`height` attributes are ignored;
  size images with `style`.
- **Caching.** TVMLKit caches images by URL, so add a cache-buster for live
  thumbnails.
- **Icons.** Valid `resource://` names include `button-add`, `button-checkmark`,
  `button-play`, `button-more`, `button-preview`, `button-rate`, `button-remove`
  and `button-shuffle`. There's no `button-search`. `symbol://<sf-symbol>` works
  too, e.g. `symbol://magnifyingglass`.
- **Monograms.** `border-radius` on a `<badge>` is ignored. A focused
  `monogram` draws as a square. `monogramLockup` subtitles are uppercased.

## Media

- **`resumeTime` prompts.** `resumeTime` shows a "Resume Playback / Start from
  Beginning" prompt and waits; use `startTime`.
- **Audio needs an overlay.** Audio plays over a black screen unless you set an
  overlay (`<PlayerOverlay>`).
- **`Slideshow`** is a singleton: `start(images, options?, themeOptions?)`,
  `append(images)`, `dismiss()`. In the tvOS 26.5 simulator it shows a blank
  screen; it's untested on hardware.

## Performance

Measured in the simulator:

| Case | JavaScript time |
| --- | --- |
| `listTemplate`, 372 rows (each with `relatedContent`) | about 130 ms to commit |
| 735 rows | about 220 ms |
| A memoized 36-cell grid page | 9–14 ms per page |

Page long lists. Memoize grid cells.
