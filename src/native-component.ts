import { createElement, type ReactElement } from "react";

import type { TVMLAttributes } from "./elements.js";

/**
 * Wrap a natively registered TVML element (one you registered with
 * `TVElementFactory` and render from a `TVInterfaceCreating`) in a React
 * component. Built-in TVML elements are lowercase JSX tags; custom ones are
 * imported components, so it's clear which tags need native code.
 *
 *   export const Gauge = nativeComponent<{ value: number }>("gauge", "Gauge");
 *   <Gauge value={0.4} style={{ width: 400 }} />
 */
export function nativeComponent<Props extends object = {}>(
  tagName: string,
  displayName: string = tagName,
): (props: Props & TVMLAttributes) => ReactElement {
  const Component = (props: Props & TVMLAttributes) =>
    createElement(tagName, props);
  Component.displayName = displayName;
  return Component;
}
