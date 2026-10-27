// The JSX runtime selected by `"jsxImportSource": "tvml-react"`. At runtime it
// is React's own runtime; it exists so TypeScript resolves the JSX namespace
// below, whose IntrinsicElements are the TVML tags instead of HTML.

import type * as React from "react";

import type { TVMLIntrinsicElements } from "./elements.js";

export { Fragment, jsx, jsxs } from "react/jsx-runtime";

// The automatic JSX runtime looks up intrinsic element types through this
// namespace; a module declaration can't express it.
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace JSX {
  export type ElementType = React.JSX.ElementType;
  export type Element = React.JSX.Element;
  export type ElementClass = React.JSX.ElementClass;
  export type LibraryManagedAttributes<C, P> =
    React.JSX.LibraryManagedAttributes<C, P>;

  export interface ElementAttributesProperty
    extends React.JSX.ElementAttributesProperty {}
  export interface ElementChildrenAttribute
    extends React.JSX.ElementChildrenAttribute {}
  export interface IntrinsicAttributes extends React.JSX.IntrinsicAttributes {}
  export interface IntrinsicClassAttributes<T>
    extends React.JSX.IntrinsicClassAttributes<T> {}
  export interface IntrinsicElements extends TVMLIntrinsicElements {}
}
