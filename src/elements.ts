// JSX typings for TVML elements. Every TVML tag gets its own entry so typos and
// attributes that don't belong are caught at compile time.
//
// Only TVMLKit's built-in elements are lowercase tags. Natively registered
// elements are exposed as ordinary function components instead.

import type { ReactNode, Ref } from "react";

import type { TVMLElement } from "./dom.js";
import type { TVMLEventHandler } from "./events.js";
import type { TVMLStyle } from "./style.js";

type BooleanAttribute = boolean | "true" | "false";
type Theme = "light" | "dark";

/** Attributes and props accepted by every TVML element. */
export interface TVMLAttributes {
  key?: string | number | bigint | null;
  ref?: Ref<TVMLElement>;
  children?: ReactNode;
  id?: string;
  /** Serialized to the `class` attribute. */
  className?: string;
  class?: string;
  style?: string | TVMLStyle;
  accessibilityText?: string;
  onSelect?: TVMLEventHandler;
  onHighlight?: TVMLEventHandler;
  onPlay?: TVMLEventHandler;
  onHoldSelect?: TVMLEventHandler;
  /** e.g. a `ratingBadge` in a `ratingTemplate` changing value. */
  onChange?: TVMLEventHandler;
  /** Arbitrary data attributes are passed straight through. */
  [dataAttribute: `data-${string}`]: string | number | boolean | undefined;
}

export interface TemplateAttributes extends TVMLAttributes {
  theme?: Theme;
}

export interface FocusableAttributes extends TVMLAttributes {
  disabled?: BooleanAttribute;
  autoHighlight?: BooleanAttribute;
}

export interface ImageAttributes extends TVMLAttributes {
  /** An image URL, or `resource://name` / `symbol://sf-symbol-name`. */
  src?: string;
  /**
   * Resolution variants. The object form (`{ "1x": url, "2x": url2x }`) warns
   * if a URL contains a comma, which TVMLKit can't parse.
   */
  srcset?: string | Partial<Record<"1x" | "2x" | "3x", string>>;
  width?: string | number;
  height?: string | number;
  aspectFill?: BooleanAttribute;
  contentsMode?: "aspectFit" | "aspectFill";
  /** Used by `<img>` inside a lockup or banner. */
  alt?: string;
}

export interface LongTextAttributes extends TVMLAttributes {
  /**
   * Truncate long text with a "MORE" affordance and make it selectable;
   * handle `onSelect` to show the full text (e.g. a descriptiveAlertTemplate).
   */
  handlesOverflow?: BooleanAttribute;
}

export interface ShelfAttributes extends TVMLAttributes {
  centered?: BooleanAttribute;
}

/** `<textField>` / `<searchField>`. Children are the placeholder text. */
export interface TextFieldAttributes extends TVMLAttributes {
  /** Controlled text. Writing it doesn't fire `onTextChange`. */
  value?: string;
  /** Text to start with. */
  defaultValue?: string;
  /** Called with the current text as the user types. */
  onTextChange?: (text: string) => void;
  keyboardType?:
    | "default"
    | "emailAddress"
    | "numberPad"
    | "url"
    | "decimalPad";
  secure?: BooleanAttribute;
}

export interface RatingBadgeAttributes extends TVMLAttributes {
  /** A value between 0 and 1. */
  value?: string | number;
}

export interface ProgressBarAttributes extends TVMLAttributes {
  /** A value between 0 and 1. */
  value?: string | number;
}

export interface MediaAttributes extends TVMLAttributes {
  src?: string;
}

export interface TVMLIntrinsicElements {
  // Document structure
  head: TVMLAttributes;
  /** A `<style>` block inside `<head>`; children are the stylesheet text. */
  style: Omit<TVMLAttributes, "style">;

  // Templates
  alertTemplate: TemplateAttributes;
  catalogTemplate: TemplateAttributes;
  compilationTemplate: TemplateAttributes;
  descriptiveAlertTemplate: TemplateAttributes;
  divTemplate: TemplateAttributes;
  formTemplate: TemplateAttributes;
  listTemplate: TemplateAttributes;
  loadingTemplate: TemplateAttributes;
  menuBarTemplate: TemplateAttributes;
  oneupTemplate: TemplateAttributes & { mode?: string };
  paradeTemplate: TemplateAttributes;
  productBundleTemplate: TemplateAttributes;
  productTemplate: TemplateAttributes;
  ratingTemplate: TemplateAttributes;
  searchTemplate: TemplateAttributes;
  showcaseTemplate: TemplateAttributes & { mode?: string };
  stackTemplate: TemplateAttributes;

  // Lockups
  buttonLockup: FocusableAttributes;
  /** Children arranged with `tv-position`/`tv-align` styles. */
  card: FocusableAttributes;
  listItemLockup: FocusableAttributes;
  lockup: FocusableAttributes;
  monogramLockup: FocusableAttributes;

  // Containers
  background: TVMLAttributes;
  banner: TVMLAttributes;
  carousel: TVMLAttributes;
  collectionList: TVMLAttributes;
  footer: TVMLAttributes;
  grid: TVMLAttributes;
  header: TVMLAttributes;
  /** A stack of images, e.g. in a `paradeTemplate`'s `relatedContent`. */
  imgDeck: TVMLAttributes;
  info: TVMLAttributes;
  itemBanner: TVMLAttributes;
  infoList: TVMLAttributes;
  infoTable: TVMLAttributes;
  list: TVMLAttributes;
  menuBar: TVMLAttributes;
  menuItem: FocusableAttributes;
  organizer: TVMLAttributes;
  /** `infoTable`s at the bottom of a `productTemplate`. */
  productInfo: TVMLAttributes;
  overlay: TVMLAttributes;
  prototypes: TVMLAttributes;
  relatedContent: TVMLAttributes;
  row: TVMLAttributes;
  section: TVMLAttributes;
  segmentBar: TVMLAttributes;
  segmentBarItem: FocusableAttributes;
  separator: TVMLAttributes;
  shelf: ShelfAttributes;
  stack: TVMLAttributes;

  // Elements
  activityIndicator: TVMLAttributes;
  asset: MediaAttributes;
  audio: TVMLAttributes;
  badge: ImageAttributes;
  button: FocusableAttributes;
  decorationImage: ImageAttributes;
  decorationLabel: TVMLAttributes;
  description: LongTextAttributes & { allowsZooming?: BooleanAttribute };
  fullscreenImg: ImageAttributes;
  heroImg: ImageAttributes;
  img: ImageAttributes;
  mediaContent: TVMLAttributes & { playbackMode?: "always" | "focus" | "focusAndPlay" };
  monogram: TVMLAttributes & {
    firstName?: string;
    lastName?: string;
    src?: string;
  };
  /** `minLength` pads the number with leading zeros. */
  ordinal: TVMLAttributes & { minLength?: string | number };
  placeholder: TVMLAttributes;
  progressBar: ProgressBarAttributes;
  ratingBadge: RatingBadgeAttributes;
  ratingButton: FocusableAttributes;
  ratingCard: FocusableAttributes;
  reviewCard: FocusableAttributes;
  seasonBadge: ImageAttributes;
  subtitle: TVMLAttributes;
  text: LongTextAttributes;
  textBadge: TVMLAttributes;
  textField: TextFieldAttributes;
  searchField: Omit<TextFieldAttributes, "secure">;
  title: LongTextAttributes;
  video: MediaAttributes;
}
