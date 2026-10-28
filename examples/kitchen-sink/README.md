# kitchen-sink

A minimal but realistic screen for every TVML template, plus lockup variants
and `mediaContent` previews. Pick a row to open that screen.

`KitchenSinkTests` in the [shell](../shell) opens every screen with the remote
and checks that it renders on the current tvOS. It's the quickest way to
catch a TVMLKit regression. See [platform notes](../../docs/platform-notes.md)
for what it found.

```sh
pnpm install && pnpm build   # from the repo root
cd examples/kitchen-sink
pnpm dev                     # serves http://0.0.0.0:9108/
xcrun simctl launch booted dev.tvml-react.examples -TVMLServerURL http://localhost:9108/
```
