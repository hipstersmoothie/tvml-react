// Components for the native list view shipped in the TVMLReactExtras Swift
// package (see native/). `TVMLReact.install()` registers the element natively.

import { createElement } from "react";

import type { TVMLAttributes } from "./elements.js";

export interface SimplifiedListProps extends TVMLAttributes {
  /** Non-focusable header text shown above the rows. */
  summary?: string;
}

export interface SimplifiedListRowProps extends TVMLAttributes {
  /** The row's main text. */
  title?: string;
  /** Secondary text under the title. */
  subtitle?: string;
  /** Right-aligned trailing label. */
  accessory?: string;
  /** Artwork URL. */
  image?: string;
}

/**
 * A natively scrolling list (a UITableView) for use inside a `divTemplate`.
 * Size it with `style={{ width, height }}`.
 */
export function SimplifiedList(props: SimplifiedListProps) {
  return createElement("simplifiedList", props);
}

/** A row of a {@link SimplifiedList}. */
export function SimplifiedListRow(props: SimplifiedListRowProps) {
  return createElement("simplifiedListRow", props);
}
