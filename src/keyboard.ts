// Text input for `<searchField>` / `<textField>` through the element's TVJS
// "Keyboard" feature.

import type { TVMLElement } from "./dom.js";

export interface TVMLKeyboard {
  text: string;
  onTextChange?: () => void;
}

const handlers = new WeakMap<TVMLElement, (text: string) => void>();
const hooked = new WeakSet<TVMLElement>();

/** The Keyboard feature of a `searchField`/`textField` element, if it has one. */
export function getKeyboard(element: TVMLElement): TVMLKeyboard | undefined {
  try {
    return (element.getFeature?.("Keyboard") as TVMLKeyboard | undefined) ?? undefined;
  } catch {
    return undefined;
  }
}

export function setTextChangeHandler(element: TVMLElement, handler: unknown): void {
  if (typeof handler === "function") {
    handlers.set(element, handler as (text: string) => void);
    if (element.parentNode) {
      attachKeyboard(element);
    }
  } else {
    handlers.delete(element);
  }
}

/** Connect the element's keyboard once it's part of a document. */
export function attachKeyboard(element: TVMLElement): void {
  if (hooked.has(element) || !handlers.has(element)) {
    return;
  }
  const keyboard = getKeyboard(element);
  if (!keyboard) {
    return;
  }
  hooked.add(element);
  keyboard.onTextChange = () => handlers.get(element)?.(keyboard.text ?? "");
}
