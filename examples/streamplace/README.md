# streamplace

A [stream.place](https://stream.place) client: live streams from the AT Protocol, on Apple TV.

![Home screen](screenshot.jpg)

- **Home:** a "Live now" shelf (live thumbnail, LIVE badge, streamer avatar, title, viewers), refreshed every 30 s while the screen is visible and the app is in the foreground. Below it, "Recently live" streamers remembered in `localStorage`. When nobody is live, that shelf becomes "Streamers you might like". Loading and error templates are handled, and a failed refresh keeps the last list.
- **Stream page:** title, streamer, activity, tags, uptime and live viewer count, plus a shelf of recent chat (`<reviewCard>`s). Offline streamers get a profile page with "Check Again".
- **Watching:** plays the live HLS (CMAF) playlist with `usePlayer`, keeps the screen awake with `useKeepAwake`, and draws a live chat panel **over the video** through the player's `overlayDocument`, rendered by React through a portal.

```sh
pnpm install && pnpm build   # from the repo root
cd examples/streamplace
pnpm dev                     # serves http://0.0.0.0:9101/
xcrun simctl launch booted dev.tvml-react.examples -TVMLServerURL http://localhost:9101/
```

The tvOS app is the shared [shell](../shell).

## Endpoints

| What | Where |
| --- | --- |
| Live streams | `stream.place/xrpc/place.stream.live.getLiveUsers` |
| One stream / viewers | `stream.place/api/livestream/{did}`, `/api/view-count/{did}` (404 = offline) |
| Thumbnail | `stream.place/api/playback/{did}/stream.jpg` |
| HLS | `stream.place/xrpc/place.stream.playback.getLivePlaylist?streamer={did}` |
| Avatars, bios | `public.api.bsky.app/xrpc/app.bsky.actor.getProfiles` |
| Chat | `constellation.microcosm.blue/links` (newest `place.stream.chat.message` backlinks to the streamer) + `slingshot.microcosm.blue` (`getRecord`, handle resolution) |

stream.place sends chat only over its WebSocket, and TVJS has neither `WebSocket`
nor `EventSource`. Chat messages are ordinary AT Protocol records, though, so
the app polls them from Microcosm's public indexes every 8 s. That chat isn't
moderated by stream.place, so hidden or banned messages can still show up.

## Files

- `api.ts`: an XHR-based client. TVJS fires `error` instead of `load` for HTTP 404s, and the wrapper handles both.
- `hooks.ts`: `useLiveData`, which polls only while the screen is visible and the app is active, with `keepAlive` for while the player is up.
- `store.tsx`: profiles and "recently live" history, provided through `launch`'s `wrapper`.
- `playerOverlay.tsx`: the chat overlay. `usePlayer` keeps its `Player` private, so this wraps the global `Player` constructor to get at `overlayDocument`.
