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
export { createRoot, launch } from "./root.js";
export type { LaunchOptions, RootOptions, TVMLRoot } from "./root.js";
export { serializeStyle } from "./style.js";
export type { TVMLStyle, TVMLStyleValue } from "./style.js";

/** Options the bootstrap `Application.js` passes to your bundle's `start()`. */
export interface StartOptions {
  /** URL of the folder the bundle was served from, with a trailing slash. */
  baseUrl: string;
  /** The raw TVApplicationController launch options. */
  launchOptions: Record<string, string>;
}
