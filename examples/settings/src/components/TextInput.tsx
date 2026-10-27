import { useLayoutEffect, useRef } from "react";
import { getKeyboard, type TVMLElement, type TVMLIntrinsicElements } from "tvml-react";

type TextFieldProps = TVMLIntrinsicElements["textField"];

export interface TextInputProps extends Omit<TextFieldProps, "children" | "onTextChange" | "ref"> {
  /** Shown while the field is empty (TVML uses the textField's text content). */
  placeholder?: string;
  /** Text the field starts with. TVML has no attribute for this. */
  defaultValue?: string;
  onChangeText?: (text: string) => void;
}

/**
 * An uncontrolled `<textField>` that can start with a value.
 *
 * TVML has no `value` attribute: the textField's text content is its
 * placeholder, and the typed text lives on its Keyboard feature. So the initial
 * value is written to the keyboard once the element is in the document.
 * Writing `keyboard.text` doesn't fire `onTextChange`, so callers should seed
 * their own state with the same `defaultValue`.
 */
export function TextInput({ placeholder, defaultValue, onChangeText, ...props }: TextInputProps) {
  const ref = useRef<TVMLElement>(null);

  useLayoutEffect(() => {
    const keyboard = ref.current && getKeyboard(ref.current);
    if (keyboard && defaultValue) {
      keyboard.text = defaultValue;
    }
    // Only on mount, like a DOM input's defaultValue.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <textField ref={ref} onTextChange={onChangeText} {...props}>
      {placeholder}
    </textField>
  );
}
