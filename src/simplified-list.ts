// JSX types for the native `<simplifiedList>` view element shipped in the
// TVMLReactExtras Swift package (see native/). It has no runtime code; pull the
// tags into JSX with `import type {} from "tvml-react/simplified-list"`.
//
// The element only renders if the tvOS app registers it natively; plain
// TVMLKit ignores unknown tags.

import type { TVMLAttributes } from "./elements.js";

export interface SimplifiedListAttributes extends TVMLAttributes {
  /** Non-focusable header text shown above the rows. */
  summary?: string;
}

export interface SimplifiedListRowAttributes extends TVMLAttributes {
  title?: string;
  subtitle?: string;
  /** Right-aligned trailing label. */
  accessory?: string;
  /** Artwork URL. */
  image?: string;
}

declare module "./jsx-runtime.js" {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      simplifiedList: SimplifiedListAttributes;
      simplifiedListRow: SimplifiedListRowAttributes;
    }
  }
}
