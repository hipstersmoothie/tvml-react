export {
  createDocument,
  escapeXml,
  getNavigationDocument,
  parseDocument,
  presentDocument,
  presentMessage,
} from "./dom.js";
export type {
  TVMLDocument,
  TVMLElement,
  TVMLEvent,
  TVMLNavigationDocument,
} from "./dom.js";
export type {
  FocusableAttributes,
  ImageAttributes,
  TemplateAttributes,
  TVMLAttributes,
  TVMLIntrinsicElements,
} from "./elements.js";
export type { TVMLEventHandler, TVMLEventProp } from "./events.js";
export { getKeyboard } from "./keyboard.js";
export type { TVMLKeyboard } from "./keyboard.js";
export {
  hasNativeBridge,
  useAccessibility,
  useColorScheme,
  useDisplay,
  useKeepAwake,
  useNetworkStatus,
} from "./native.js";
export type {
  AccessibilitySettings,
  ColorScheme,
  DisplayInfo,
  NetworkStatus,
} from "./native.js";
export { useNavigation } from "./navigation.js";
export type { Navigation } from "./navigation.js";
export {
  canOpenURL,
  openURL,
  reloadApp,
  useAppEvent,
  useAppState,
  useDevice,
  useLocalStorage,
  usePlatformSettings,
  useTraitCollection,
} from "./platform.js";
export type {
  AppState,
  DeviceInfo,
  PlatformSettings,
  Restrictions,
  TVMLTraitCollection,
} from "./platform.js";
export { usePlayer } from "./player.js";
export type { MediaItemInput, PlaybackState, PlayerControls } from "./player.js";
export { createPortal } from "./reconciler.js";
export { createRoot, launch } from "./root.js";
export type { LaunchOptions, RootOptions, TVMLRoot } from "./root.js";
export {
  useIsScreenVisible,
  useScreenDocument,
  useScreenEvent,
} from "./screen.js";
export type { ScreenEvent } from "./screen.js";
export { serializeStyle } from "./style.js";
export type { TVMLStyle, TVMLStyleValue } from "./style.js";

/** Options the bootstrap `Application.js` passes to your bundle's `start()`. */
export interface StartOptions {
  /** URL of the folder the bundle was served from, with a trailing slash. */
  baseUrl: string;
  /** The raw TVApplicationController launch options. */
  launchOptions: Record<string, string>;
}
