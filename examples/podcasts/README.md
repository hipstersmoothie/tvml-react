# podcasts

A podcast player for Apple TV built with tvml-react: browse Apple's charts,
search the iTunes directory, read show feeds, subscribe, and listen with resume.

![Home screen](screenshot.jpg)

## What it shows

- **Home** (`stackTemplate`): *Continue Listening* (lockups with a
  `progressBar` overlay), *Your Shows*, then Apple Podcasts top charts overall
  and by genre. Each shelf loads on its own.
- **Search** (`searchTemplate`): `<searchField onTextChange>` with a 400 ms
  debounce, cancelled in-flight requests, and loading and empty states.
- **Show detail** (`listTemplate`): a Resume / Play Latest row, a Subscribe
  toggle, and episode rows (`listItemLockup` with `subtitle`, `decorationLabel`
  and per-row `relatedContent` show notes). Episodes load 40 at a time.
- **Episode actions**: long press (`onHoldSelect`) opens a modal with
  *Play from Beginning*, *Mark as Played/Unplayed* and *Go to Show*.
- **Playback**: one `usePlayer()` in a `PlayerProvider` passed as `launch`'s
  `wrapper`, so every screen shares one player. Audio items get a React-rendered
  artwork overlay (`Player.overlayDocument`), and playback resumes where you
  left off. Pressing play/pause on a focused episode (`onPlay`) starts it.
- **Persistence** with `useLocalStorage`: subscriptions, plus each episode's
  position and played state. The position is saved every 5 s of playback and
  on pause or end.
- **Data**: iTunes Search/Lookup and the `toppodcasts` RSS-JSON charts. Show
  feeds are fetched with `XMLHttpRequest` and parsed with TVJS's own
  `DOMParser`. Dates use `Intl.DateTimeFormat`/`RelativeTimeFormat`.

## Run it

```sh
pnpm dev   # builds, watches, and serves on http://localhost:9102/
```

Then launch the [shell app](../shell) pointed at it:

```sh
xcrun simctl launch booted dev.tvml-react.examples -TVMLServerURL http://localhost:9102/
```

After changing JavaScript, relaunch the app; you don't need to rebuild in
Xcode.

## Notes

- **RSS in TVJS.** `DOMParser` (and `XMLHttpRequest.responseXML`) parse real
  feeds quickly: a 3.3 MB, 735-episode feed parses in about 50 ms. There are
  some gaps, though. `getElementsByTagName("itunes:duration")` matches nothing,
  and there's no `getElementsByTagNameNS`, so `src/rss.ts` walks child nodes
  and compares `nodeName` instead. Malformed XML throws an `IKDOMException`.
- **Resuming.** Setting `MediaItem.resumeTime` makes TVMLKit show its own
  *Resume Playback / Start from Beginning* prompt and wait for an answer. This
  app skips that prompt by seeking once playback reaches `"playing"`.
- **Audio artwork.** On their own, audio items play over a black screen.
  `usePlayer()` doesn't expose the TVJS `Player`, so `src/tvjsPlayer.ts`
  captures it in order to set `overlayDocument`. The overlay document is
  rendered with `createPortal`.
- **Icons.** There's no `resource://button-search` image, so the Search button
  uses `symbol://magnifyingglass`.
