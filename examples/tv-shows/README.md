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
- **Data loading with [TanStack Query](https://tanstack.com/query)** through
  `tvml-react/query`. [`src/api.ts`](src/api.ts) has one `queryOptions` per
  TVMaze endpoint (query key, `queryFn` passing TanStack's `signal` to the
  polyfilled `fetch`) and the app's `QueryClient` (catalog data is fresh for an
  hour; 404s aren't retried). `TVMLQueryProvider` goes in `launch`'s `wrapper`,
  so tabs and pushed screens share one cache: going back to a screen, or
  Search's Trending shelf reusing Popular's first page, doesn't refetch.
  - Screens use `useScreenQuery`, which only stays subscribed while the screen
    is on the TV: hidden tabs and covered screens don't refetch, and stale data
    refreshes when they come back (Tonight's schedule also refreshes when the
    app resumes). Popular combines three page queries with `useQueries` +
    `combine`, subscribed via `useIsScreenVisible`.
  - `select` turns responses into what each screen renders (time slots,
    categories, search results).
  - Resting on a poster prefetches that show (`queryClient.prefetchQuery`), so
    its detail screen usually opens with cast and seasons already there.
  - Search debounces typing, then keeps the previous results on screen
    (`placeholderData: keepPreviousData`) while the next query loads.
  - `QueryFallback` in [`src/components.tsx`](src/components.tsx) shows the
    `loadingTemplate`, or an error alert whose Try Again calls `refetch()`.

## Run it

```sh
pnpm dev   # serves http://localhost:9103/
```

Then launch the examples shell (`examples/shell`) pointed at it:

```sh
xcrun simctl launch <udid> dev.tvml-react.examples -TVMLServerURL http://localhost:9103/
```

`pnpm build` writes `dist/app.js` and `dist/Application.js`.
