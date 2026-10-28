// Document-level event delegation. TVMLKit reliably dispatches events at the
// document, so each root registers one listener per event type and walks up
// from the event target to the nearest element with a handler. Handlers are
// keyed by element reference (not id) so components don't need to invent
// unique ids.

import type { TVMLDocument, TVMLElement, TVMLEvent } from "./dom.js";
import { runDiscrete } from "./sync.js";

export type TVMLEventHandler = (event: TVMLEvent) => void;

/** React prop name → TVML event type. */
export const EVENT_PROPS = {
  // A focusable control (button, lockup, ...) was pressed.
  onSelect: "select",
  // Focus moved onto the element. segmentBar/segmentBarItem never fire
  // "select", so this is the hook for switching content between segments.
  onHighlight: "highlight",
  // The play/pause button was pressed while the element had focus.
  onPlay: "play",
  // A long press on a focusable control.
  onHoldSelect: "holdselect",
  // A value changed, e.g. a `ratingBadge` in a `ratingTemplate`.
  onChange: "change",
} as const;

export type TVMLEventProp = keyof typeof EVENT_PROPS;

const EVENT_TYPES = Object.values(EVENT_PROPS);

const handlers = new WeakMap<TVMLElement, Map<string, TVMLEventHandler>>();

export function isEventProp(key: string): key is TVMLEventProp {
  return Object.prototype.hasOwnProperty.call(EVENT_PROPS, key);
}

export function setEventHandler(
  element: TVMLElement,
  prop: TVMLEventProp,
  handler: unknown,
): void {
  const type = EVENT_PROPS[prop];
  let byType = handlers.get(element);

  if (typeof handler !== "function") {
    byType?.delete(type);
    return;
  }

  if (!byType) {
    byType = new Map();
    handlers.set(element, byType);
  }
  byType.set(type, handler as TVMLEventHandler);
}

export function clearEventHandlers(element: TVMLElement): void {
  handlers.delete(element);
}

/**
 * Install the delegating listeners on a document. Returns a function that
 * removes them again.
 */
export function attachEventDelegation(doc: TVMLDocument): () => void {
  const listener = (event: TVMLEvent) => {
    let target = event.target;
    while (target) {
      const handler = handlers.get(target)?.get(event.type);
      if (handler) {
        runDiscrete(() => handler(event));
        return;
      }
      target = target.parentNode;
    }
  };

  for (const type of EVENT_TYPES) {
    doc.addEventListener(type, listener);
  }

  return () => {
    for (const type of EVENT_TYPES) {
      doc.removeEventListener(type, listener);
    }
  };
}
