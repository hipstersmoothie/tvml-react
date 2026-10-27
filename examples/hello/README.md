# hello

A small tour of tvml-react:
- **Albums:** a shelf of albums that push a detail screen with playback.
- **Search:** filters the albums as you type.
- **Native list:** the `SimplifiedList` component, with the screen kept awake.
- **Platform:** live values from every platform hook.

```sh
pnpm install && pnpm build   # from the repo root
cd examples/hello
pnpm dev                     # serves http://0.0.0.0:9100/
xcrun simctl launch booted dev.tvml-react.examples -TVMLServerURL http://localhost:9100/
```

The tvOS app is the shared [shell](../shell).
