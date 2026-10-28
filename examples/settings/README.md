# settings: forms, settings and onboarding

<img src="screenshot.jpg" width="640" alt="The Settings listTemplate with On/Off rows and a relatedContent panel" />

An "account & preferences" app for a made-up streaming service, Couch. It shows
how to build input-heavy tvOS screens with tvml-react:

- **Onboarding.** A stack of pushed screens: Welcome → name → email → parental
  PIN → favorite genres → done. Each text step is a `formTemplate` with live
  validation shown in the banner. When onboarding finishes, the root screen
  swaps from `alertTemplate` to the settings `listTemplate` in place.
- **Text input.** `<textField onTextChange>` with `keyboardType="emailAddress"`,
  and `keyboardType="numberPad"` plus `secure` for the PIN. The field's
  children are its placeholder, and `defaultValue` fills it in, so the edit
  screens open with the current value.
- **Settings without switches.** TVML has no toggle, so toggles are
  `listItemLockup`s whose `decorationLabel` shows On/Off. Single-choice lists
  (Subtitles, Video Quality) mark the current option with a checkmark
  `decorationImage` and use `autoHighlight` so it starts focused. Genres are a
  multi-select list of checkmark rows. A `relatedContent` panel describes
  whichever row has focus.
- **Rating.** `ratingTemplate` with an interactive `ratingBadge`, saved from
  its `onChange`.
- **Confirmations.** "Reset all settings?", "Sign out?" and "Turn off PIN?"
  are `alertTemplate`s shown with `navigation.presentModal`. Cancel has focus
  by default.
- **Persistence.** The profile and preferences are stored with
  `useLocalStorage`. If you quit in the middle of onboarding, you pick up
  where you left off with your answers filled in.

```
src/
  main.tsx, App.tsx       launch; root switches Welcome ↔ Settings
  store.ts                useProfile / usePreferences (useLocalStorage), option lists
  validation.ts           name / email / PIN validators
  components/FormScreen   one formTemplate step with validation feedback
  components/Rows         ToggleRow, ValueRow, CheckRow (listItemLockup patterns)
  screens/                Onboarding, Settings, OptionPicker, GenrePicker, RateApp, ConfirmAlert
```

## Run it

```sh
pnpm dev   # builds, watches and serves on http://localhost:9107/
```

Then launch the shared example shell (`examples/shell`) in the tvOS
simulator, pointed at this server:

```sh
xcrun simctl launch <udid> dev.tvml-react.examples -TVMLServerURL http://localhost:9107/
```

The app reloads after every change, and its `console` output shows up in the
terminal. To see onboarding again, choose **Sign Out** in Settings.

## TVML notes learned here

- A `formTemplate` only shows its **first** `textField`, so a form with
  several fields has to be a sequence of screens.
- The text inside `<textField>` is its placeholder. Setting `defaultValue` (or
  `value`) fills the field but doesn't fire `onTextChange`, so state that
  mirrors the field has to start from the same value.
- On a presented `listTemplate`, `focus(element)` moves focus to that element.
  Inside a `formTemplate`, the keyboard keeps focus.
- `ratingTemplate` ignores DOM changes once it's on screen, so this app saves
  the rating and pops the screen instead of showing a "thanks" state.
- `listTemplate`'s banner `<description>` renders as tiny text in the corner,
  so use `relatedContent` for status text instead.
