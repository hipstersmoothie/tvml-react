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

/**
 * Mark a document visible or hidden. tvml-react calls this when it presents a
 * screen (TVMLKit's own `appear` comes a little later) and when menu bar tabs
 * switch, where TVMLKit's appear/disappear events aren't reliable.
 */
export function setScreenVisible(doc: TVMLDocument, value: boolean): void {
  if (visible.get(doc) === value) {
    return;
  }
  visible.set(doc, value);
  for (const listener of visibilityListeners.get(doc) ?? []) {
    listener();
  }
}

const tracked = new Set<TVMLDocument>();

/** Screen documents currently marked visible (root, tabs, pushed screens, modals). */
export function visibleScreens(): Array<TVMLDocument> {
  return [...tracked].filter((doc) => visible.get(doc));
}

/** Start tracking a document's visibility. Returns a function to stop. */
export function trackScreen(doc: TVMLDocument): () => void {
  tracked.add(doc);
  const onAppear = () => setScreenVisible(doc, true);
  const onDisappear = () => setScreenVisible(doc, false);
  doc.addEventListener("appear", onAppear);
  doc.addEventListener("disappear", onDisappear);
  doc.addEventListener("unload", onDisappear);
  return () => {
    tracked.delete(doc);
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
