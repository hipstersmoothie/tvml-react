// Per-document ("screen") context and lifecycle. Every TVML document tvml-react
// renders into — the root one and each pushed screen or modal — is tracked
// here so hooks can tell which screen they're on and whether it's visible.

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useSyncExternalStore,
} from "react";

import type { TVMLDocument, TVMLEvent } from "./dom.js";

/** Document lifecycle events TVMLKit dispatches on a document. */
export type ScreenEvent = "load" | "appear" | "disappear" | "unload";

export const ScreenContext = createContext<TVMLDocument | null>(null);

const visible = new WeakMap<TVMLDocument, boolean>();
const visibilityListeners = new WeakMap<TVMLDocument, Set<() => void>>();

/** Start tracking a document's visibility. Returns a function to stop. */
export function trackScreen(doc: TVMLDocument): () => void {
  const set = (value: boolean) => () => {
    visible.set(doc, value);
    for (const listener of visibilityListeners.get(doc) ?? []) {
      listener();
    }
  };
  const onAppear = set(true);
  const onDisappear = set(false);
  doc.addEventListener("appear", onAppear);
  doc.addEventListener("disappear", onDisappear);
  doc.addEventListener("unload", onDisappear);
  return () => {
    doc.removeEventListener("appear", onAppear);
    doc.removeEventListener("disappear", onDisappear);
    doc.removeEventListener("unload", onDisappear);
  };
}

/** The TVML document the calling component renders into. */
export function useScreenDocument(): TVMLDocument {
  const doc = useContext(ScreenContext);
  if (!doc) {
    throw new Error("tvml-react: screen hooks must be used inside a tvml-react root");
  }
  return doc;
}

/**
 * Run `handler` when this component's screen is loaded, appears, disappears
 * (another screen is pushed on top, or it's popped) or is unloaded.
 */
export function useScreenEvent(
  type: ScreenEvent,
  handler: (event: TVMLEvent) => void,
): void {
  const doc = useScreenDocument();
  const latest = useRef(handler);
  latest.current = handler;

  useEffect(() => {
    const listener = (event: TVMLEvent) => latest.current(event);
    doc.addEventListener(type, listener);
    return () => doc.removeEventListener(type, listener);
  }, [doc, type]);
}

/** Whether this component's screen is the one currently on the TV. */
export function useIsScreenVisible(): boolean {
  const doc = useScreenDocument();
  return useSyncExternalStore(
    (onChange) => {
      let set = visibilityListeners.get(doc);
      if (!set) {
        set = new Set();
        visibilityListeners.set(doc, set);
      }
      set.add(onChange);
      return () => set.delete(onChange);
    },
    () => visible.get(doc) ?? false,
  );
}
