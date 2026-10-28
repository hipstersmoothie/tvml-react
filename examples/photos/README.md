# photos

The app the [tutorial](https://github.com/hipstersmoothie/tvml-react/tree/main/site/src/content/docs/learn/tutorial.mdx)
builds: a grid of photos from [Lorem Picsum](https://picsum.photos), a detail
screen for each, and favorites saved on the Apple TV, in two tabs.

```sh
pnpm install && pnpm build   # from the repo root
cd examples/photos
pnpm dev                     # serves http://0.0.0.0:9109/
xcrun simctl launch booted dev.tvml-react.examples -TVMLServerURL http://localhost:9109/
```
