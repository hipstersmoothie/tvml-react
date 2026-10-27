# hello

A small tvml-react app: an album shelf with `onSelect`/`onHighlight`, a detail
alert with local state, and the native `<simplifiedList>` from TVMLReactExtras.

```sh
pnpm install          # from the repo root
pnpm build            # build tvml-react itself (from the repo root)
cd examples/hello
pnpm dev              # serves http://0.0.0.0:9001/
open tvos/HelloTVML.xcodeproj
```

Run the `HelloTVML` scheme on an Apple TV simulator. For a real Apple TV, set
`TVMLServerURL` in `tvos/project.yml` (or the generated `Info.plist`) to your
Mac's LAN address and set a development team.
