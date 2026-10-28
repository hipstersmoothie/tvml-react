// Drive a running tvml-react app from JavaScript, on a device or simulator,
// without XCUITest. TVJS supports synthetic events: a dispatched `select`
// reaches the same handlers a remote press does.
//
//   import { fireSelect, queryByText, typeText } from "tvml-react/testing";
//   fireSelect(queryByText("Settings")!);
//   typeText(queryAll("searchField")[0], "miles");

import type { TVMLDocument, TVMLElement } from "./dom.js";
import { getKeyboard } from "./keyboard.js";
import { visibleScreens } from "./screen.js";

interface TestGlobals {
  Event?: new (type: string, init?: { bubbles?: boolean }) => unknown;
  getActiveDocument?: () => TVMLDocument;
}

const globals = globalThis as unknown as TestGlobals;

// Visible screens first (in tab apps the active document is often the menu
// bar's, not the selected tab's), then TVJS's active document.
function searchRoots(): Array<TVMLElement> {
  const roots = visibleScreens().map((doc) => doc.documentElement);
  // getActiveDocument() can return undefined on tvOS 26; fall back to the top
  // of the navigation stack.
  const navigation = (globalThis as { navigationDocument?: { documents: Array<TVMLDocument> } })
    .navigationDocument;
  const active = globals.getActiveDocument?.() ?? navigation?.documents.at(-1);
  if (active && !roots.includes(active.documentElement)) {
    roots.push(active.documentElement);
  }
  if (roots.length === 0) {
    throw new Error("tvml-react/testing: no visible screen");
  }
  return roots;
}

function isDisabled(element: TVMLElement | null): boolean {
  for (let node = element; node; node = node.parentNode) {
    if (node.getAttribute?.("disabled") === "true") return true;
  }
  return false;
}

/**
 * Dispatch a bubbling TVML event (select, highlight, play, holdselect, change).
 * Throws for disabled elements, which a real remote can't reach.
 */
export function fireEvent(element: TVMLElement, type: string): void {
  if (!globals.Event || !element.dispatchEvent) {
    throw new Error("tvml-react/testing: synthetic events need TVJS");
  }
  if (isDisabled(element)) {
    throw new Error(`tvml-react/testing: can't ${type} a disabled element`);
  }
  element.dispatchEvent(new globals.Event(type, { bubbles: true }));
}

export const fireSelect = (element: TVMLElement) => fireEvent(element, "select");
export const fireHighlight = (element: TVMLElement) => fireEvent(element, "highlight");
export const fireHoldSelect = (element: TVMLElement) => fireEvent(element, "holdselect");
export const firePlay = (element: TVMLElement) => fireEvent(element, "play");

/** Set a searchField/textField's text and notify `onTextChange`, like typing. */
export function typeText(field: TVMLElement, text: string): void {
  const keyboard = getKeyboard(field);
  if (!keyboard) {
    throw new Error("tvml-react/testing: element has no keyboard");
  }
  keyboard.text = text;
  keyboard.onTextChange?.();
}

/** Elements with a tag name: in `root`, or across every visible screen. */
export function queryAll(tag: string, root?: TVMLElement): Array<TVMLElement> {
  const out: Array<TVMLElement> = [];
  for (const scope of root ? [root] : searchRoots()) {
    const list = scope.getElementsByTagName?.(tag);
    for (let i = 0; list && i < list.length; i++) {
      const item = list.item(i);
      if (item) out.push(item);
    }
  }
  return out;
}

/**
 * The innermost element whose text contains `text`: in `root`, or across every
 * visible screen. Handy with fireSelect: the event bubbles up to the
 * lockup/button.
 */
export function queryByText(text: string, root?: TVMLElement): TVMLElement | null {
  for (const scope of root ? [root] : searchRoots()) {
    const found = findText(text, scope);
    if (found) return found;
  }
  return null;
}

function findText(text: string, node: TVMLElement): TVMLElement | null {
  const children = node.childNodes;
  for (let i = 0; children && i < children.length; i++) {
    const child = children.item(i);
    if (child && child.nodeType === 1) {
      const found = findText(text, child);
      if (found) return found;
    }
  }
  return node.nodeType === 1 && node.textContent?.includes(text) ? node : null;
}
