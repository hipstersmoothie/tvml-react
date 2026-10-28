# TV Shows

A TV show catalog for tvml-react, built on the free [TVMaze API](https://www.tvmaze.com/api).

<img src="screenshot.jpg" width="640" alt="The Popular tab: a native menu bar over a catalogTemplate of show posters" />

## What it shows

- **Native tab bar.** `menuBarTemplate` with three tabs (Tonight, Popular and
  Search), using tvml-react's `MenuBar`/`MenuBarItem`. Each tab renders into
  its own TVML document from the app's single React tree. Tabs mount the first
  time they're shown and then stay mounted, so they keep their state. (This
  app's prototype became the library component.)
- **Tonight.** `stackTemplate` shelves of today's US schedule, grouped by time
  slot and starting with "On Now". Your watchlist is shown at the top.
- **Popular.** A `catalogTemplate` with categories on the left (Most Popular,
  Top Rated, genres) and a `grid` of posters for each.
- **Search.** A `searchTemplate` with a debounced `onTextChange`. Before you
  type anything it shows a shelf of trending shows.
- **Show detail** (`productTemplate`). Shows the summary (select it to read the
  whole thing in a modal), genres and network in an `infoList`, a `ratingBadge`,
  a shelf of seasons and a cast shelf of `monogramLockup`s. A Watchlist button
  saves the show to `useLocalStorage`, and every tab and screen sees the change.
- **Three levels of `useNavigation().push`.** Show, then season (a
  `listTemplate` that previews the highlighted episode through
  `relatedContent`), then episode. "Next Episode" swaps the episode screen in
  place with `navigation.replace()`.
- **Data loading without `fetch`.** [`src/api.ts`](src/api.ts) wraps
  `XMLHttpRequest` with an in-memory cache. [`src/useApi.ts`](src/useApi.ts)
  switches between `loadingTemplate`, an error alert with Retry, and the
  loaded screen.

## Run it

```sh
pnpm dev   # serves http://localhost:9103/
```

Then launch the examples shell (`examples/shell`) pointed at it:

```sh
xcrun simctl launch <udid> dev.tvml-react.examples -TVMLServerURL http://localhost:9103/
```

`pnpm build` writes `dist/app.js` and `dist/Application.js`.
