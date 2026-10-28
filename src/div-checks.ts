// Development warnings for divTemplate styles that TVMLKit silently ignores
// or that make content disappear. Each was confirmed in the tvOS simulator;
// see docs/platform-notes.md. The reconciler calls this for every element it
// creates inside a divTemplate.

import { warnOnce } from "./dev.js";

const TEXT = new Set(["text", "title", "subtitle", "description"]);

type Style = Record<string, unknown>;

function styleOf(props: Record<string, unknown>): Style {
  return typeof props.style === "object" && props.style !== null ? (props.style as Style) : {};
}

// True if a CSS margin value has a non-zero top or bottom.
function hasVerticalMargin(margin: unknown): boolean {
  if (typeof margin === "number") return margin !== 0;
  if (typeof margin !== "string") return false;
  const parts = margin.trim().split(/\s+/).map(Number);
  const [top, , bottom = top] = parts;
  return top !== 0 || bottom !== 0;
}

function warn(message: string): void {
  warnOnce(`tvml-react: in divTemplate, ${message} (see docs/platform-notes.md).`);
}

export function checkDivTemplateElement(
  type: string,
  props: Record<string, unknown>,
  parent: string | null,
): void {
  const style = styleOf(props);

  if (type === "stack") {
    if (style.width === undefined) warn("a <stack> without a style width doesn't render");
    if (parent === "row") warn("a <stack> inside a <row> doesn't render");
  }
  if ((type === "row" || type === "stack" || type === "organizer") && style.backgroundColor !== undefined) {
    warn(`background-color on <${type}> is ignored; put it on the text`);
  }
  if (type === "background" && parent === "organizer") {
    warn("an <organizer>'s <background> is ignored; put an <img> in it instead");
  }
  if (parent === "row" && hasVerticalMargin(style.margin)) {
    warn("vertical margins on a <row>'s children are ignored; use the row's margin");
  }
  if (TEXT.has(type)) {
    if (style.borderRadius !== undefined) warn(`border-radius on <${type}> is ignored`);
    const blank = typeof props.children === "string" && props.children.trim() === "";
    if (!blank && style.color === undefined && props.className === undefined && props.class === undefined) {
      warn(`<${type}> without a color is black, whatever the theme`);
    }
  }
  if (style.fontStyle === "italic") warn("font-style: italic is ignored");
  if (style.tvContentAlign === "top") warn("tv-content-align: top is ignored");
  if (type === "img" && (props.width !== undefined || props.height !== undefined)) {
    warn("<img>'s width and height attributes are ignored; size it with style");
  }
}
