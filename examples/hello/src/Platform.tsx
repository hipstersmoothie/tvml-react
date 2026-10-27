import {
  hasNativeBridge,
  useAccessibility,
  useAppState,
  useColorScheme,
  useDevice,
  useDisplay,
  useIsScreenVisible,
  useLocalStorage,
  useNetworkStatus,
  usePlatformSettings,
  useTraitCollection,
} from "tvml-react";

const on = (value: boolean) => (value ? "on" : "off");

// Everything tvml-react can read from the Apple TV, live.
export function Platform() {
  const device = useDevice();
  const settings = usePlatformSettings();
  const traits = useTraitCollection();
  const scheme = useColorScheme();
  const a11y = useAccessibility();
  const network = useNetworkStatus();
  const display = useDisplay();
  const appState = useAppState();
  const visible = useIsScreenVisible();
  const [launches, setLaunches] = useLocalStorage("launches", 0);

  const rows: Array<[string, string]> = [
    ["Device", `${device.model} (${device.productType}) · tvOS ${device.systemVersion}`],
    ["App", `${device.appIdentifier} ${device.appVersion}`],
    ["Language / storefront", `${settings.language} · ${settings.storefrontCountryCode}`],
    ["Restrictions", `explicit ${on(settings.restrictions.allowsExplicit ?? true)}`],
    ["Screen", `${traits.screenWidth}×${traits.screenHeight} @${traits.displayScale}x · ${traits.layoutDirection}`],
    ["Display", `${display.maximumFramesPerSecond} fps · HDR ${on(display.hdr)}`],
    ["Appearance", scheme],
    ["Accessibility", `reduce motion ${on(a11y.reduceMotion)} · VoiceOver ${on(a11y.voiceOver)} · bold ${on(a11y.boldText)} · contrast ${on(a11y.darkerSystemColors)}`],
    ["Network", network.online ? "online" : "offline"],
    ["App state", `${appState} · screen ${visible ? "visible" : "hidden"}`],
    ["Native bridge", hasNativeBridge() ? "installed" : "missing"],
  ];

  return (
    <stack style={{ tvPosition: "top", margin: "200 0 0 0", width: 1920 }}>
      {rows.map(([label, value]) => (
        <text key={label} style={{ color: "white", fontSize: 30, margin: "6 120" }}>
          {`${label}: ${value}`}
        </text>
      ))}
      <button style={{ margin: "30 120" }} onSelect={() => setLaunches((n) => n + 1)}>
        <text>{`Saved counter: ${launches}`}</text>
      </button>
    </stack>
  );
}
