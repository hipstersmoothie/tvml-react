import type { ReactNode } from "react";

// TVML has no switch or checkbox. The idiomatic stand-ins inside a
// listTemplate are a listItemLockup whose decorationLabel shows the current
// value ("On"/"Off", "English", ...) and a checkmark decorationImage for the
// chosen row of a selection list.

interface RowProps {
  title: string;
  /** Right-hand panel shown while the row is focused. */
  about?: string;
  onSelect: () => void;
  autoHighlight?: boolean;
  disabled?: boolean;
}

function About({ title, text }: { title: string; text?: string }) {
  if (!text) return null;
  return (
    <relatedContent>
      <lockup>
        <title style={{ fontSize: 44, fontWeight: "bold", color: "white" }}>{title}</title>
        <description style={{ fontSize: 30, tvTextMaxLines: 6 }}>{text}</description>
      </lockup>
    </relatedContent>
  );
}

/** A setting that flips between On and Off when selected. */
export function ToggleRow({ value, ...row }: RowProps & { value: boolean }) {
  return (
    <listItemLockup
      onSelect={row.onSelect}
      autoHighlight={row.autoHighlight}
      disabled={row.disabled}
      accessibilityText={`${row.title}, ${value ? "on" : "off"}`}
    >
      <title>{row.title}</title>
      <decorationLabel>{value ? "On" : "Off"}</decorationLabel>
      <About title={row.title} text={row.about} />
    </listItemLockup>
  );
}

/** A setting that opens another screen; shows its current value. */
export function ValueRow({ value, ...row }: RowProps & { value?: string }) {
  return (
    <listItemLockup onSelect={row.onSelect} autoHighlight={row.autoHighlight} disabled={row.disabled}>
      <title>{row.title}</title>
      {value ? <decorationLabel>{value}</decorationLabel> : null}
      <About title={row.title} text={row.about} />
    </listItemLockup>
  );
}

/** One option in a selection list; checked rows get a checkmark. */
export function CheckRow({
  checked,
  children,
  ...row
}: RowProps & { checked: boolean; children?: ReactNode }) {
  return (
    <listItemLockup
      onSelect={row.onSelect}
      autoHighlight={row.autoHighlight}
      accessibilityText={`${row.title}${checked ? ", selected" : ""}`}
    >
      <title>{row.title}</title>
      {checked ? <decorationImage src="resource://button-checkmark" /> : null}
      <About title={row.title} text={row.about} />
      {children}
    </listItemLockup>
  );
}
