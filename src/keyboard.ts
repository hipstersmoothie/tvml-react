// Text input for `<searchField>` / `<textField>` through the element's TVJS
// "Keyboard" feature: the `onTextChange`, `value` and `defaultValue` props.
// The field's children are its placeholder text.

import type { TVMLElement } from "./dom.js";
import { runDiscrete } from "./sync.js";

export interface TVMLKeyboard {
  /** `null` until something is typed. */
  text: string | null;
  onTextChange?: () => void;
}

interface FieldState {
  onTextChange?: (text: string) => void;
  value?: string;
  defaultValue?: string;
  appliedDefault?: boolean;
  hooked?: boolean;
}

const fields = new WeakMap<TVMLElement, FieldState>();

export const KEYBOARD_PROPS = new Set(["onTextChange", "value", "defaultValue"]);

/** The Keyboard feature of a `searchField`/`textField` element, if it has one. */
export function getKeyboard(element: TVMLElement): TVMLKeyboard | undefined {
  try {
    return (element.getFeature?.("Keyboard") as TVMLKeyboard | undefined) ?? undefined;
  } catch {
    return undefined;
  }
}

function state(element: TVMLElement): FieldState {
  let field = fields.get(element);
  if (!field) {
    field = {};
    fields.set(element, field);
  }
  return field;
}

export function setKeyboardProp(element: TVMLElement, key: string, value: unknown): void {
  const field = state(element);
  if (key === "onTextChange") {
    field.onTextChange = typeof value === "function" ? (value as (text: string) => void) : undefined;
  } else if (key === "value") {
    field.value = value == null ? undefined : String(value);
  } else if (key === "defaultValue") {
    field.defaultValue = value == null ? undefined : String(value);
  }
  // Updates to a field that's already in a document apply right away; the
  // first render waits for commitMount.
  if (element.parentNode) {
    syncKeyboard(element);
  }
}

/** Connect the element's keyboard once it's part of a document. */
export function syncKeyboard(element: TVMLElement): void {
  const field = fields.get(element);
  if (!field) return;
  const keyboard = getKeyboard(element);
  if (!keyboard) return;

  if (!field.hooked && field.onTextChange) {
    field.hooked = true;
    keyboard.onTextChange = () => {
      const current = fields.get(element);
      if (!current) return;
      runDiscrete(() => current.onTextChange?.(keyboard.text ?? ""));
      // Controlled field: the update has committed, so `value` is current. If
      // the handler rejected the keystroke (state unchanged), put it back.
      if (current.value !== undefined && (keyboard.text ?? "") !== current.value) {
        keyboard.text = current.value;
      }
    };
  }

  // Writing keyboard.text doesn't fire onTextChange, so this can't loop.
  if (field.value !== undefined) {
    if ((keyboard.text ?? "") !== field.value) {
      keyboard.text = field.value;
    }
  } else if (field.defaultValue !== undefined && !field.appliedDefault) {
    field.appliedDefault = true;
    keyboard.text = field.defaultValue;
  }
}

/** Whether a new element needs commitMount to hook up its keyboard. */
export function needsKeyboard(props: Record<string, unknown>): boolean {
  return (
    typeof props.onTextChange === "function" ||
    props.value !== undefined ||
    props.defaultValue !== undefined
  );
}
