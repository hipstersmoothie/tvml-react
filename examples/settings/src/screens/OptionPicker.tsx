import { useNavigation } from "tvml-react";

import { CheckRow } from "../components/Rows";
import type { Option } from "../store";

/**
 * A single-choice selection list, like tvOS Settings: the current choice has a
 * checkmark and starts focused (autoHighlight); choosing a row saves it and
 * goes back.
 */
export function OptionPicker<T extends string>({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: ReadonlyArray<Option<T>>;
  value: T;
  onChange: (value: T) => void;
}) {
  const navigation = useNavigation();
  return (
    <listTemplate theme="dark">
      <banner>
        <title>{title}</title>
      </banner>
      <list>
        <section>
          {options.map((option) => (
            <CheckRow
              key={option.value}
              title={option.label}
              about={option.detail}
              checked={option.value === value}
              autoHighlight={option.value === value}
              onSelect={() => {
                onChange(option.value);
                navigation.pop();
              }}
            />
          ))}
        </section>
      </list>
    </listTemplate>
  );
}
