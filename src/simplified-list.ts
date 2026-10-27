// Components for the native `<simplifiedList>` view element shipped in the
// TVMLReactExtras Swift package (see native/). They only render if the tvOS
// app calls `SimplifiedListElement.register()`; plain TVMLKit ignores the tags.

import { nativeComponent } from "./native-component.js";

export interface SimplifiedListProps {
  /** Non-focusable header text shown above the rows. */
  summary?: string;
}

export interface SimplifiedListRowProps {
  title?: string;
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
export const SimplifiedList = nativeComponent<SimplifiedListProps>(
  "simplifiedList",
  "SimplifiedList",
);

/** A row of a {@link SimplifiedList}. */
export const SimplifiedListRow = nativeComponent<SimplifiedListRowProps>(
  "simplifiedListRow",
  "SimplifiedListRow",
);
