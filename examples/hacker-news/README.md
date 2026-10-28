# Hacker News

A Hacker News reader for Apple TV, built with tvml-react.

<img src="screenshot.jpg" width="640" alt="A story's threaded comments, with the highlighted comment's full text on the left" />

## What it shows

- **Tabs with `menuBarTemplate`.** Top, New, Best, Ask and Show live in the
  system tab bar, built with `<MenuBar>` and `<MenuBarItem>` (`src/App.tsx`).
  Each tab mounts the first time it's selected and stays mounted, so switching
  back keeps its stories and scroll position.
- **Data fetching.** TVJS only has `XMLHttpRequest`; tvml-react polyfills
  `fetch` and `AbortController` on top of it. `src/lib/http.ts` adds a timeout,
  typed JSON and error messages worth showing on screen. `src/lib/query.ts` is a
  small `useQuery`: results are cached per key and shared between screens,
  duplicate requests are merged, a request is cancelled when its last screen
  unmounts, and stale data is refetched when the screen appears again
  (`useScreenEvent("appear")`) or the app comes back from the background
  (`useAppEvent("resume")`, visible screens only).
- **Story lists** in a `listTemplate`: rank, title and score in each
  `listItemLockup`, with a `relatedContent` preview of the highlighted story
  (domain, points, comments, author, relative age via `Intl.RelativeTimeFormat`,
  and the text of Ask HN posts). It loads 30 stories at a time from the Firebase API, and
  the next page starts loading when focus gets within five rows of the end.
- **Story detail** with the whole comment tree from one Algolia request,
  flattened and indented by depth. The highlighted comment's full text shows in
  `relatedContent` (`tv-text-max-lines: 16`). Selecting a comment opens it in a
  `descriptiveAlertTemplate`, which scrolls long text. Links show as a QR code
  you can scan with your phone, since tvOS has no web browser.
- **HTML to text** (`src/text.ts`). TVML text elements can't render HTML, so
  `<p>` becomes a blank line, links become their full URL, and entities are
  decoded.
- **Loading, error and retry.** Screens swap between `loadingTemplate`,
  `alertTemplate` (with a Try Again button) and the list. If a background
  refresh fails, the old data stays on screen and the header says the refresh failed.

## Run it

```sh
pnpm dev   # builds, watches and serves on http://localhost:9104/
```

Then launch the examples shell app pointed at it:

```sh
xcrun simctl launch <udid> dev.tvml-react.examples -TVMLServerURL http://localhost:9104/
```

The app reloads itself after every successful rebuild, and its `console` output
shows up in the terminal running `pnpm dev`.
