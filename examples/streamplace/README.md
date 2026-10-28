# streamplace

A [stream.place](https://stream.place) client: live streams from the AT Protocol, on Apple TV.

![Home screen](screenshot.jpg)

- **Home:** a "Live now" shelf (live thumbnail, LIVE badge, streamer avatar, title, viewers), refreshed every 30 s while the screen is visible and the app is in the foreground. Below it, "Recently live" streamers remembered in `localStorage`. When nobody is live, that shelf becomes "Streamers you might like". Loading and error templates are handled, and a failed refresh keeps the last list.
- **Stream page:** title, streamer, activity, tags, uptime and live viewer count, plus a shelf of recent chat (`<reviewCard>`s). Offline streamers get a profile page with "Check Again".
- **Watching:** plays the live HLS (CMAF) playlist with `usePlayer`, keeps the screen awake with `useKeepAwake`, and draws a live chat panel **over the video** with `<PlayerOverlay>`.

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

- `api.ts`: a `fetch` client. A 404 from `/api/livestream` means the streamer is offline; requests time out after 15 s and take an `AbortSignal`.
- `hooks.ts`: `useLiveData`, which polls only while the screen is visible and the app is active, and cancels the previous request on each refresh. Presenting the player fires `disappear` on the stream page, so `keepAlive` keeps the chat overlay's data fresh while watching.
- `store.tsx`: profiles and "recently live" history, provided through `launch`'s `wrapper`.
- `StreamScreen.tsx`: the stream page and the chat overlay. The `<PlayerOverlay>` is mounted only while the player is up, because TVMLKit doesn't draw an overlay document assigned before the player is presented.
