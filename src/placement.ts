// Where an element goes in a divTemplate or an organizer. tv-position alone
// leaves an element at the left of its region, so the horizontal part of a
// position is also given as tv-align.

import type { TVMLStyle } from "./style.js";

/** Where an element goes: a corner, an edge, or the center. */
export type Position =
  | "top-left"
  | "top"
  | "top-right"
  | "left"
  | "center"
  | "right"
  | "bottom-left"
  | "bottom"
  | "bottom-right";

export function placement(position: Position | undefined): TVMLStyle {
  if (!position) return {};
  const tvAlign = position.endsWith("left") ? "left" : position.endsWith("right") ? "right" : "center";
  return { tvPosition: position, tvAlign };
}

/** Merges a position into a style prop. */
export function withPlacement(
  style: string | TVMLStyle | undefined,
  position: Position | undefined,
): string | TVMLStyle | undefined {
  if (!position) return style;
  if (typeof style === "string") {
    const { tvPosition, tvAlign } = placement(position);
    return `${style}; tv-position: ${tvPosition}; tv-align: ${tvAlign};`;
  }
  return { ...placement(position), ...style };
}
