import type { ReactNode, ReactPortal } from "react";
import ReactReconciler from "react-reconciler";

import type { TVMLElement } from "./dom.js";
import { hostConfig } from "./host-config.js";
import { setFlushSync } from "./sync.js";

export const reconciler = ReactReconciler(
  hostConfig as unknown as Parameters<typeof ReactReconciler>[0],
);

setFlushSync((fn) => reconciler.flushSyncFromReconciler(fn));

/** Render `children` into another TVML container from the same React tree. */
export function createPortal(
  children: ReactNode,
  container: TVMLElement,
  key?: string,
): ReactPortal {
  return reconciler.createPortal(children, container, null, key ?? null) as unknown as ReactPortal;
}
