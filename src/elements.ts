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
  /** React's key, for lists. */
  key?: string | number | bigint | null;
  /** The underlying TVML element. */
  ref?: Ref<TVMLElement>;
  /** Child elements and text. */
  children?: ReactNode;
  /** The element's id. */
  id?: string;
  /** Serialized to the `class` attribute. */
  className?: string;
  /** Same as `className`. */
  class?: string;
  /** A TVML style string, or an object with camelCase keys (`{ tvAlign: "center" }`). */
  style?: string | TVMLStyle;
  /** What VoiceOver reads for the element. */
  accessibilityText?: string;
  /** The user selected the element (clicked the remote's touch surface). */
  onSelect?: TVMLEventHandler;
  /** The element got focus. */
  onHighlight?: TVMLEventHandler;
  /** The user pressed play/pause while the element had focus. */
  onPlay?: TVMLEventHandler;
  /** The user pressed and held select on the element (a long press). */
  onHoldSelect?: TVMLEventHandler;
  /** e.g. a `ratingBadge` in a `ratingTemplate` changing value. */
  onChange?: TVMLEventHandler;
  /** Arbitrary data attributes are passed straight through. */
  [dataAttribute: `data-${string}`]: string | number | boolean | undefined;
}

export interface TemplateAttributes extends TVMLAttributes {
  /** Light or dark, regardless of the system appearance. */
  theme?: Theme;
}

export interface FocusableAttributes extends TVMLAttributes {
  /** Makes the element unfocusable and dims it. */
  disabled?: BooleanAttribute;
  /** Focus this element when the screen appears. */
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
  /** Width in points. */
  width?: string | number;
  /** Height in points. */
  height?: string | number;
  /** Fill the size, cropping the image, instead of fitting it. */
  aspectFill?: BooleanAttribute;
  /** How the image fills its size. */
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
  /** Which on-screen keyboard to show. */
  keyboardType?:
    | "default"
    | "emailAddress"
    | "numberPad"
    | "url"
    | "decimalPad";
  /** Hide what's typed, for passwords. */
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
  /** Holds a `<style>` block for the template. */
  head: TVMLAttributes;
  /** A `<style>` block inside `<head>`; children are the stylesheet text. */
  style: Omit<TVMLAttributes, "style">;

  // Templates
  /** A message with buttons, centered on screen. */
  alertTemplate: TemplateAttributes;
  /** Categories in a list beside a grid of the selected category's items. */
  catalogTemplate: TemplateAttributes;
  /** An album or season: a header, a list of tracks or episodes, and artwork. */
  compilationTemplate: TemplateAttributes;
  /** Long text, like terms or a synopsis, with buttons. */
  descriptiveAlertTemplate: TemplateAttributes;
  /** A free-form screen laid out in nine regions. See tvml-react/layout. */
  divTemplate: TemplateAttributes;
  /** A single text field with a banner and buttons. */
  formTemplate: TemplateAttributes;
  /** A list beside a panel showing the focused item's related content. */
  listTemplate: TemplateAttributes;
  /** A spinner with a title, while something loads. */
  loadingTemplate: TemplateAttributes;
  /** A tab bar; each tab shows its own document. See `MenuBar`. */
  menuBarTemplate: TemplateAttributes;
  /** Fullscreen images or videos, one at a time. */
  oneupTemplate: TemplateAttributes & { mode?: string };
  /** A list beside a deck of images. */
  paradeTemplate: TemplateAttributes;
  /** A bundle of items, like a box set. */
  productBundleTemplate: TemplateAttributes;
  /** One item's page: info, a description, buttons, and related shelves. */
  productTemplate: TemplateAttributes;
  /** Rate an item with stars. */
  ratingTemplate: TemplateAttributes;
  /** A search field with a keyboard, and results below. */
  searchTemplate: TemplateAttributes;
  /** A carousel of large images, for slideshows and screensavers. */
  showcaseTemplate: TemplateAttributes & { mode?: string };
  /** Rows of shelves, grids and carousels: the usual home screen. */
  stackTemplate: TemplateAttributes;

  // Lockups
  /** A round button with a symbol (`<badge>`) and a label (`<title>`). */
  buttonLockup: FocusableAttributes;
  /** Children arranged with `tv-position`/`tv-align` styles. */
  card: FocusableAttributes;
  /** A row in a list. */
  listItemLockup: FocusableAttributes;
  /** A focusable image with a title and subtitle: the building block of shelves and grids. */
  lockup: FocusableAttributes;
  /** A person, shown with a photo or their initials. */
  monogramLockup: FocusableAttributes;

  // Containers
  /** The template's background, usually an `<img>`. Read once, when the screen appears. */
  background: TVMLAttributes;
  /** The header area at the top of a template. */
  banner: TVMLAttributes;
  /** Large items, one centered at a time. */
  carousel: TVMLAttributes;
  /** The rows (shelves, grids, carousels) in a `stackTemplate` or `searchTemplate`. */
  collectionList: TVMLAttributes;
  /** Content at the bottom of a template, like a form's buttons. */
  footer: TVMLAttributes;
  /** Items in rows that wrap, scrolling vertically. */
  grid: TVMLAttributes;
  /** A title for a shelf, grid or list. */
  header: TVMLAttributes;
  /** A stack of images, e.g. in a `paradeTemplate`'s `relatedContent`. */
  imgDeck: TVMLAttributes;
  /** A heading and values, in an `infoList` or `infoTable`. */
  info: TVMLAttributes;
  /** A banner for an item, e.g. in a `compilationTemplate`'s related content. */
  itemBanner: TVMLAttributes;
  /** Labeled values beside a product's description, like Director and Starring. */
  infoList: TVMLAttributes;
  /** Labeled values in a table, in `productInfo`. */
  infoTable: TVMLAttributes;
  /** A vertical list of `listItemLockup`s in sections. */
  list: TVMLAttributes;
  /** The tab bar in a `menuBarTemplate`. */
  menuBar: TVMLAttributes;
  /** A tab in a `menuBar`. */
  menuItem: FocusableAttributes;
  /** Arranges its children with `tv-position`. Works as a column inside a `<row>`; see `Stack` and `Box`. */
  organizer: TVMLAttributes;
  /** `infoTable`s at the bottom of a `productTemplate`. */
  productInfo: TVMLAttributes;
  /** Content over a lockup's image, like a progress bar or a badge. */
  overlay: TVMLAttributes;
  /** Templates for data-bound items. */
  prototypes: TVMLAttributes;
  /** What a list item shows in the panel beside the list when focused. */
  relatedContent: TVMLAttributes;
  /** Children side by side. */
  row: TVMLAttributes;
  /** A group of items in a shelf, grid, list or carousel. */
  section: TVMLAttributes;
  /** A segmented control, e.g. in a template's header. */
  segmentBar: TVMLAttributes;
  /** A segment in a `segmentBar`. Switch content on `onHighlight`. */
  segmentBarItem: FocusableAttributes;
  /** A divider line. */
  separator: TVMLAttributes;
  /** A row of items that scrolls horizontally. */
  shelf: ShelfAttributes;
  /** Children stacked vertically. Needs a width in a `divTemplate`, and doesn't render inside a `<row>`. */
  stack: TVMLAttributes;

  // Elements
  /** A spinner. */
  activityIndicator: TVMLAttributes;
  /** A media asset's URL, in a `<video>` or `<audio>`. */
  asset: MediaAttributes;
  /** Audio, e.g. inside `mediaContent`. */
  audio: TVMLAttributes;
  /** A small image, like a rating or a symbol in a `buttonLockup`. */
  badge: ImageAttributes;
  /** A plain text button. */
  button: FocusableAttributes;
  /** A small image at the trailing edge of a list item. */
  decorationImage: ImageAttributes;
  /** Text at the trailing edge of a list item, like a count or a duration. */
  decorationLabel: TVMLAttributes;
  description: LongTextAttributes & { allowsZooming?: BooleanAttribute };
  /** A full-screen image. */
  fullscreenImg: ImageAttributes;
  /** A large image in a banner. */
  heroImg: ImageAttributes;
  /** An image. `resource://` and `symbol://` names work too. */
  img: ImageAttributes;
  /** Plays a video preview inside a lockup. */
  mediaContent: TVMLAttributes & { playbackMode?: "always" | "focus" | "focusAndPlay" };
  /** A person's initials, or their photo. */
  monogram: TVMLAttributes & {
    firstName?: string;
    lastName?: string;
    src?: string;
  };
  /** `minLength` pads the number with leading zeros. */
  ordinal: TVMLAttributes & { minLength?: string | number };
  /** Shown in place of an image that hasn't loaded. */
  placeholder: TVMLAttributes;
  /** A progress bar, `value` from 0 to 1. */
  progressBar: ProgressBarAttributes;
  /** Stars for a rating, `value` from 0 to 1. */
  ratingBadge: RatingBadgeAttributes;
  /** A button that opens a rating. */
  ratingButton: FocusableAttributes;
  /** An average rating, in a shelf of ratings and reviews. */
  ratingCard: FocusableAttributes;
  /** A review, in a shelf of ratings and reviews. */
  reviewCard: FocusableAttributes;
  /** A season number badge. */
  seasonBadge: ImageAttributes;
  /** Secondary text. */
  subtitle: TVMLAttributes;
  /** Text. */
  text: LongTextAttributes;
  /** Text in a badge outline, like "4K" or "LIVE". */
  textBadge: TVMLAttributes;
  /** A text field. Children are the placeholder. */
  textField: TextFieldAttributes;
  /** A search field. Children are the placeholder. */
  searchField: Omit<TextFieldAttributes, "secure">;
  /** A title. */
  title: LongTextAttributes;
  /** Video, e.g. inside `mediaContent`. */
  video: MediaAttributes;
}
