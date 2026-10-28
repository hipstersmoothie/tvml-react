// TVML style objects. Styles are authored as plain objects with camelCase keys
// (`tvAlign`, `fontSize`) and serialized to the TVML `style` attribute string
// (`tv-align: ...; font-size: ...;`). Numbers are emitted unitless, matching
// TVML's point-based layout.

export type TVMLStyleValue = string | number | null | undefined | false;

/** Well-known TVML style properties. Any other kebab-able key is allowed too. */
export interface TVMLKnownStyle {
  backgroundColor?: TVMLStyleValue;
  border?: TVMLStyleValue;
  borderRadius?: TVMLStyleValue;
  color?: TVMLStyleValue;
  fontSize?: TVMLStyleValue;
  fontWeight?: TVMLStyleValue;
  height?: TVMLStyleValue;
  margin?: TVMLStyleValue;
  maxHeight?: TVMLStyleValue;
  maxWidth?: TVMLStyleValue;
  padding?: TVMLStyleValue;
  textAlign?: TVMLStyleValue;
  width?: TVMLStyleValue;
  tvAlign?: TVMLStyleValue;
  tvContentAlign?: TVMLStyleValue;
  tvHighlightColor?: TVMLStyleValue;
  tvInteritemSpacing?: TVMLStyleValue;
  tvLineSpacing?: TVMLStyleValue;
  tvMinimumScaleFactor?: TVMLStyleValue;
  tvPlaceholder?: TVMLStyleValue;
  tvPosition?: TVMLStyleValue;
  tvRowSpacing?: TVMLStyleValue;
  tvTextHighlightStyle?: TVMLStyleValue;
  tvTextMaxLines?: TVMLStyleValue;
  tvTextStyle?: TVMLStyleValue;
  tvTintColor?: TVMLStyleValue;
}

export type TVMLStyle = TVMLKnownStyle & Record<string, TVMLStyleValue>;

const UPPERCASE = /[A-Z]/g;

function toKebabCase(key: string): string {
  return key.replace(UPPERCASE, (char) => "-" + char.toLowerCase());
}

/** Turn a style object into a TVML style string: `{ tvAlign: "center", fontSize: 40 }` becomes `tv-align: center; font-size: 40;`. */
export function serializeStyle(style: TVMLStyle): string {
  const declarations: Array<string> = [];

  for (const key of Object.keys(style)) {
    const value = style[key];
    if (value == null || value === false) {
      continue;
    }
    declarations.push(`${toKebabCase(key)}: ${value};`);
  }

  return declarations.join(" ");
}
