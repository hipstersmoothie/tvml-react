# __APP__

An Apple TV app built with [tvml-react](https://github.com/hipstersmoothie/tvml-react).

```sh
__PM__ install
__PM__ run dev        # serves the app on http://0.0.0.0:9001/ with live reload
open tvos/__APP__.xcodeproj
```

Run the `__APP__` scheme on an Apple TV simulator. The app loads
`http://localhost:9001/` by default (set `TVMLServerURL` in
`tvos/__APP__/Info.plist`). On a real Apple TV, use your Mac's LAN address and
set a development team.

- `src/` is the React app; `src/main.tsx` is the entry.
- `tvos/` is the tvOS app that hosts it. JavaScript changes don't need an Xcode
  rebuild.
- `__PM__ run build` writes `dist/app.js` and `dist/Application.js` for hosting.
