# shell

The tvOS app every example runs in. It's a thin `TVMLReact.launch` wrapper
(see `TVMLExamples/AppDelegate.swift`) that loads `Application.js` from a dev
server, so one build runs any example.

```sh
open TVMLExamples.xcodeproj   # run the TVMLExamples scheme
```

The server defaults to `TVMLServerURL` in `project.yml`
(`http://localhost:9001/`). Point it at another example with a launch argument,
either in the scheme's arguments or from the command line:

```sh
xcrun simctl launch booted dev.tvml-react.examples -TVMLServerURL http://localhost:9100/
```

Each example's `pnpm dev` serves on its own port (see its `package.json`). For
a real Apple TV, use your Mac's LAN address and set a development team.

`ui-tests.sh` runs the remote-driven UI tests (`TVMLExamplesUITests`):
`HelloTests` against the hello example and `KitchenSinkTests` against the
kitchen-sink example. Extra arguments go to `xcodebuild`, e.g.
`-only-testing:TVMLExamplesUITests/KitchenSinkTests`. Set
`TEST_RUNNER_KITCHEN_SINK_SCREENSHOTS=/some/dir` to save a screenshot of every
template.

The Xcode project is generated from `project.yml` with
[XcodeGen](https://github.com/yonaskolb/XcodeGen).
