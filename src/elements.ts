// JSX typings for TVML elements. Every TVML tag gets its own entry so typos and
// attributes that don't belong are caught at compile time.
//
// Custom elements (e.g. ones registered natively with TVElementFactory) are
// added by merging into the runtime's JSX namespace:
//
//   import type { TVMLAttributes } from "tvml-react";
//
//   declare module "tvml-react/jsx-runtime" {
//     namespace JSX {
//       interface IntrinsicElements {
//         myWidget: TVMLAttributes & { value?: string };
//       }
//     }
//   }

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
  src?: string;
  srcset?: string;
  width?: string | number;
  height?: string | number;
  aspectFill?: BooleanAttribute;
  contentsMode?: "aspectFit" | "aspectFill";
  /** Used by `<img>` inside a lockup or banner. */
  alt?: string;
}

export interface ShelfAttributes extends TVMLAttributes {
  centered?: BooleanAttribute;
}

export interface TextFieldAttributes extends TVMLAttributes {
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
  info: TVMLAttributes;
  infoList: TVMLAttributes;
  infoTable: TVMLAttributes;
  list: TVMLAttributes;
  menuBar: TVMLAttributes;
  menuItem: FocusableAttributes;
  organizer: TVMLAttributes;
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
  description: TVMLAttributes & { allowsZooming?: BooleanAttribute };
  fullscreenImg: ImageAttributes;
  heroImg: ImageAttributes;
  img: ImageAttributes;
  mediaContent: TVMLAttributes & { playbackMode?: "always" | "focus" | "focusAndPlay" };
  monogram: TVMLAttributes & {
    firstName?: string;
    lastName?: string;
    src?: string;
  };
  ordinal: TVMLAttributes;
  placeholder: TVMLAttributes;
  progressBar: ProgressBarAttributes;
  ratingBadge: RatingBadgeAttributes;
  ratingButton: FocusableAttributes;
  subtitle: TVMLAttributes;
  text: TVMLAttributes;
  textBadge: TVMLAttributes;
  textField: TextFieldAttributes;
  title: TVMLAttributes;
  video: MediaAttributes;
}
