// Components for the native view elements TVMLReact.install() registers in
// the tvOS app (TVMLReactExtras). Each is a leaf: TVMLKit lays it out by its
// `style` width/height, and it draws its own content from props.

import { createElement } from "react";

import type { TVMLAttributes } from "./elements.js";

export { SimplifiedList, SimplifiedListRow } from "./simplified-list.js";
export type { SimplifiedListProps, SimplifiedListRowProps } from "./simplified-list.js";

export interface BackdropProps extends Omit<TVMLAttributes, "children"> {
  /** Image URL. Changing it cross-fades to the new image. */
  src?: string;
  /** Darken the image for legible text on top, 0–1. */
  dim?: number;
  /** Cross-fade duration in seconds. Defaults to 0.6. */
  crossfade?: number;
}

/**
 * A full-bleed background image that, unlike TVML's `<background>`, can
 * change after the screen is presented. Render it first in a `divTemplate`;
 * it covers the whole window behind everything after it and takes no layout
 * space.
 */
export function Backdrop({ style, ...props }: BackdropProps) {
  return createElement("backdrop", {
    ...props,
    // A 1pt box: the view draws over the whole window from there, without
    // pushing the template's regions around.
    style: { width: 1, height: 1, tvPosition: "top-left", ...(typeof style === "object" ? style : {}) },
  });
}

export interface QRCodeProps extends Omit<TVMLAttributes, "children"> {
  /** The text or URL to encode. */
  value: string;
  /** Module color, "#rrggbb" or "#rrggbbaa". Defaults to black. */
  foreground?: string;
  /** Background color. Defaults to white. */
  background?: string;
}

/**
 * A QR code drawn natively: works offline and stays sharp at any size. Size
 * it with `style={{ width, height }}`.
 */
export function QRCode(props: QRCodeProps) {
  return createElement("qrCode", props);
}

export interface AvatarProps extends Omit<TVMLAttributes, "children"> {
  /** Image URL. The initials show while it loads, or if it fails. */
  src?: string;
  /** Initials are shown while the image loads, or when there isn't one. */
  name?: string;
  /** Corner radius in points. Defaults to a circle. */
  radius?: number;
}

/** A rounded image (TVML ignores border-radius on images). Size it with `style`. */
export function Avatar(props: AvatarProps) {
  return createElement("avatar", props);
}

export interface CardProps extends Omit<TVMLAttributes, "children"> {
  /** Bold first line. */
  title?: string;
  /** Second line, dimmed. */
  subtitle?: string;
  /** Body text. */
  body?: string;
  /** Square image on the left. */
  image?: string;
  /** Blur material behind the content. Defaults to "dark". */
  material?: "dark" | "light" | "regular";
  /** Corner radius in points. Defaults to 24. */
  radius?: number;
  /** Max body lines (0 = unlimited). */
  lines?: number;
}

/**
 * A blurred, rounded panel with an image and text. Native elements can't hold
 * TVML children, so the content comes from props. Size it with `style`.
 */
export function Card(props: CardProps) {
  return createElement("materialCard", props);
}
