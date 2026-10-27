import { useState, type ReactNode } from "react";
import type { TVMLIntrinsicElements } from "tvml-react";

import type { Validator } from "../validation";
import { TextInput } from "./TextInput";

export interface FormScreenProps {
  title: string;
  /** Shown under the title until there's something to say about the input. */
  hint: string;
  placeholder: string;
  initialValue?: string;
  keyboardType?: TVMLIntrinsicElements["textField"]["keyboardType"];
  secure?: boolean;
  validate: Validator;
  /** Shown under the title once the input is valid. */
  validMessage?: (value: string) => string;
  submitLabel: string;
  onSubmit: (value: string) => void;
  /** Extra footer buttons (e.g. "Skip"). */
  secondary?: ReactNode;
}

/**
 * One `formTemplate` step: a title, a single text field, live validation
 * feedback and a footer button. TVML's formTemplate only shows one textField,
 * so multi-field forms are a sequence of these.
 */
export function FormScreen({
  title,
  hint,
  placeholder,
  initialValue = "",
  keyboardType,
  secure,
  validate,
  validMessage,
  submitLabel,
  onSubmit,
  secondary,
}: FormScreenProps) {
  const [value, setValue] = useState(initialValue);
  // Don't nag before the user has typed or tried to continue.
  const [touched, setTouched] = useState(initialValue !== "");
  const error = validate(value);

  const change = (text: string) => {
    setValue(text);
    setTouched(true);
  };

  const submit = () => {
    setTouched(true);
    if (!error) onSubmit(value.trim());
  };

  let feedback = hint;
  let color: string | undefined;
  if (touched && error) {
    feedback = error;
    color = "rgb(255, 120, 110)";
  } else if (touched && validMessage) {
    feedback = validMessage(value.trim());
    color = "rgb(120, 220, 140)";
  }

  return (
    <formTemplate theme="dark">
      <banner>
        <title>{title}</title>
        <description style={{ color }}>{feedback}</description>
      </banner>
      <TextInput
        placeholder={placeholder}
        defaultValue={initialValue}
        keyboardType={keyboardType}
        secure={secure}
        onChangeText={change}
      />
      <footer>
        <button onSelect={submit}>
          <text>{submitLabel}</text>
        </button>
        {secondary}
      </footer>
    </formTemplate>
  );
}
