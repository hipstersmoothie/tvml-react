// Render part of the React tree into another TVML document: pushed screens,
// modals, menu bar tabs, player overlays. The document gets the same wiring as
// the root: delegated events (onSelect, ...), screen context for the screen
// hooks, and visibility tracking.

import {
  createElement,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { createDocument, type TVMLDocument } from "./dom.js";
import { attachEventDelegation } from "./events.js";
import { ScreenErrorBoundary } from "./error-boundary.js";
import { createPortal } from "./reconciler.js";
import { ScreenContext, trackScreen } from "./screen.js";

export interface DocumentPortalProps {
  /** The document to render into. Defaults to a new, empty one. */
  document?: TVMLDocument;
  /**
   * Called once the children have been committed into the document, i.e. the
   * first moment it's safe to present it. TVMLKit shows a document that is
   * empty when presented as a blank screen.
   */
  onReady?: (document: TVMLDocument) => void;
  /** The document's content: a template element. */
  children?: ReactNode;
}

/** Render `children` into their own TVML document, as one more screen in the app's React tree. `onReady` gets the document once its content has rendered, to present it however you like (e.g. as a player overlay). */
export function DocumentPortal({ document, onReady, children }: DocumentPortalProps) {
  const [ownDocument] = useState<TVMLDocument | null>(() =>
    document ? null : createDocument(),
  );
  const doc = document ?? ownDocument!;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const readyFor = useRef<TVMLDocument | null>(null);

  // Layout effects run after the portal's children are committed.
  useLayoutEffect(() => {
    const detachEvents = attachEventDelegation(doc);
    const untrack = trackScreen(doc);
    if (readyFor.current !== doc) {
      readyFor.current = doc;
      onReadyRef.current?.(doc);
    }
    return () => {
      untrack();
      detachEvents();
    };
  }, [doc]);

  return createPortal(
    createElement(
      ScreenContext.Provider,
      { value: doc },
      createElement(ScreenErrorBoundary, null, children),
    ),
    doc.documentElement,
  );
}
