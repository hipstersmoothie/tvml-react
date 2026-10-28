// Layout primitives for full-screen divTemplate screens (`tvml-react/layout`).
//
// divTemplate is not absolute positioning. Each child goes in a region picked
// by `tv-position`; children of a region stack vertically, and the left and
// right columns are as wide as their widest child, which shifts the center.
// Many styles are silently ignored (see docs/platform-notes.md).
//
// What works predictably is full-width rows of fixed-width cells: a row as
// wide as the screen centers its cells, so cells adding up to CONTENT_WIDTH
// land exactly inside the TV-safe area. These components build that:
//
//   <Screen>    a divTemplate with a default text color (text is otherwise
//               black, whatever the theme) and an optional background image.
//   <Row>       a row in a region, aligned left, center or right within the
//               safe area.
//   <Cell>      a text box: fixed width, or sized to its text.
//   <Image>     an image cell, sized with style (divTemplate ignores the
//               width/height attributes).
//   <Spacer>    horizontal space.
//   <Columns>   column-major data rendered as rows, since a stack inside a
//               row never renders.

import {
  Children,
  createContext,
  createElement,
  isValidElement,
  useContext,
  type ReactElement,
  type ReactNode,
} from "react";

import { warnOnce as warn } from "./dev.js";
import { measureText } from "./native.js";

export const SCREEN_WIDTH = 1920;
export const SCREEN_HEIGHT = 1080;
/** Apple's TV-safe insets: 90pt left and right, 60pt top and bottom. */
export const SAFE_X = 90;
export const SAFE_Y = 60;
/** The width of the safe area. Rows align their cells within it. */
export const CONTENT_WIDTH = SCREEN_WIDTH - 2 * SAFE_X;

/** Where a row goes. `header` and `footer` sit outside the top and bottom regions. */
export type Region = "header" | "top" | "center" | "bottom" | "footer";
export type Align = "left" | "center" | "right";
export type FontWeight =
  | "ultralight"
  | "thin"
  | "light"
  | "regular"
  | "medium"
  | "semibold"
  | "bold"
  | "heavy";

/** TVML's default text size, used to measure cells without a `size`. */
const DEFAULT_SIZE = 29;

function warnOnce(message: string): void {
  warn(`tvml-react/layout: ${message}`);
}

// --- Screen ---------------------------------------------------------------------

interface ScreenContextValue {
  color: string;
}

const LayoutContext = createContext<ScreenContextValue>({ color: "white" });

export interface ScreenProps {
  theme?: "light" | "dark";
  /** Default text color for cells. Defaults to white, or black with the light theme. */
  color?: string;
  /** A full-screen background image. Fixed once the screen is presented. */
  background?: string;
  children?: ReactNode;
}

/** A full-screen divTemplate for rows and cells. */
export function Screen({ theme, color, background, children }: ScreenProps) {
  const value = { color: color ?? (theme === "light" ? "black" : "white") };
  return createElement(
    LayoutContext.Provider,
    { value },
    createElement(
      "divTemplate",
      { theme },
      background
        ? createElement("background", null, createElement("img", { src: background }))
        : null,
      children,
    ),
  );
}

// --- Cells ----------------------------------------------------------------------

export interface TextStyle {
  /** Font size in points. */
  size?: number;
  weight?: FontWeight;
  /** Defaults to the Screen's text color. */
  color?: string;
  /** A fill behind the text, e.g. a translucent panel. Corners can't be rounded. */
  background?: string;
  /** Fixed height; the text is vertically centered. */
  height?: number;
  /** Lines before truncating with an ellipsis (default 1). `\n` starts a new line. */
  lines?: number;
}

export interface CellProps extends TextStyle {
  /** Width in points. Without one, the cell is sized to its text. */
  width?: number;
  align?: Align;
  /** Extra space before this cell, on top of the row's gap. */
  offset?: number;
  children: string | number;
}

/** The width a cell takes up in its row (not counting `offset`). */
export function cellWidth({ width, children, size, weight }: CellProps): number {
  if (width !== undefined) return width;
  const text = String(children);
  // A little slack so measured text never truncates.
  return Math.ceil(measureText(text, { fontSize: size ?? DEFAULT_SIZE, fontWeight: weight }).width) + 4;
}

/** A text box in a row. */
export function Cell(props: CellProps) {
  const { align = "left", offset, children, size, weight, background, height, lines } = props;
  const screen = useContext(LayoutContext);
  const text = String(children);
  return createElement(
    "text",
    {
      style: {
        width: cellWidth(props),
        height,
        textAlign: align,
        fontSize: size,
        fontWeight: weight,
        color: props.color ?? screen.color,
        backgroundColor: background,
        tvTextMaxLines: lines ?? 1,
        margin: offset ? `0 0 0 ${offset}` : undefined,
      },
    },
    // An empty <text> collapses to zero width, so keep a space in it.
    text === "" ? " " : text,
  );
}

export interface SpacerProps {
  width: number;
}

/** Horizontal space in a row. */
export function Spacer({ width }: SpacerProps) {
  return createElement("text", { style: { width } }, " ");
}

export interface ImageProps {
  src: string;
  width: number;
  height: number;
  /** Extra space before the image, on top of the row's gap. */
  offset?: number;
  accessibilityText?: string;
}

/** An image in a row. divTemplate ignores `<img>`'s width/height attributes; this sizes it with style. */
export function Image({ src, width, height, offset, accessibilityText }: ImageProps) {
  return createElement("img", {
    src,
    accessibilityText,
    style: { width, height, margin: offset ? `0 0 0 ${offset}` : undefined },
  });
}

// --- Rows -----------------------------------------------------------------------

export interface RowProps {
  /** Defaults to "center". */
  region?: Region;
  /** Where the cells sit within the safe area. Defaults to "left". */
  align?: Align;
  /** Horizontal space between cells. */
  gap?: number;
  /** Lay out across the whole screen instead of the safe area, e.g. for a full-bleed image. */
  bleed?: boolean;
  /** Vertical space above and below (margins on cells are ignored). */
  marginTop?: number;
  marginBottom?: number;
  children?: ReactNode;
}

// Width of one child of a row, or undefined if it isn't a layout component.
function childWidth(child: ReactElement): number | undefined {
  const props = child.props as Record<string, unknown>;
  const offset = typeof props.offset === "number" ? props.offset : 0;
  if (child.type === Cell) return cellWidth(props as unknown as CellProps) + offset;
  if (child.type === Spacer) return (props as unknown as SpacerProps).width;
  if (child.type === Image) return (props as unknown as ImageProps).width + offset;
  return undefined;
}

/**
 * A horizontal run of cells inside the safe area. The row spans the screen
 * (which centers its content); for left and right alignment it adds the
 * leftover width as a spacer, so its children should be Cells, Spacers and
 * Images whose widths it can add up.
 */
export function Row({
  region = "center",
  align = "left",
  gap = 0,
  bleed = false,
  marginTop = 0,
  marginBottom = 0,
  children,
}: RowProps) {
  const available = bleed ? SCREEN_WIDTH : CONTENT_WIDTH;
  const cells = Children.toArray(children).filter(isValidElement);
  let total = 0;
  let known = true;
  for (const cell of cells) {
    const width = childWidth(cell);
    if (width === undefined) known = false;
    else total += width;
  }
  total += gap * Math.max(0, cells.length - 1);

  let content: ReactNode = children;
  if (known) {
    const fill = available - total;
    if (fill < 0) {
      warnOnce(
        bleed
          ? `a row is ${-fill}pt wider than the screen.`
          : `a row is ${-fill}pt wider than the safe area (${CONTENT_WIDTH}pt); pass bleed to use the full width.`,
      );
    } else if (fill > gap && align !== "center") {
      // The spacer's own gap is part of the fill.
      const spacer = createElement(Spacer, { key: "tvml-react-fill", width: fill - gap });
      content = align === "left" ? [...cells, spacer] : [spacer, ...cells];
    }
  } else if (align !== "center") {
    warnOnce(
      "a row with left or right alignment can only measure Cell, Spacer and Image children; " +
        "it's centered instead.",
    );
  }

  return createElement(
    "row",
    {
      style: {
        tvPosition: region,
        // With a width, a row centers its cells; without one it shrinks to
        // them and sits at the region's left edge.
        width: SCREEN_WIDTH,
        tvInteritemSpacing: gap || undefined,
        margin: marginTop || marginBottom ? `${marginTop} 0 ${marginBottom} 0` : undefined,
      },
    },
    content,
  );
}

// --- Columns --------------------------------------------------------------------

export interface Column {
  key: string;
  width: number;
  align?: Align;
  /** Extra space before this column. */
  offset?: number;
  background?: string;
  /** One string per line, top to bottom. */
  lines: Array<string>;
}

export interface ColumnsProps extends Omit<RowProps, "children"> {
  columns: Array<Column>;
  /** The style of each line, shared across columns. */
  lineStyles: Array<TextStyle>;
}

/**
 * Columns of stacked cells, e.g. a forecast strip of time, icon and
 * temperature per hour. A stack can't go in a row, so each line becomes a
 * row of fixed-width cells; equal widths keep the columns aligned, and
 * touching backgrounds read as one tile per column.
 */
export function Columns({ columns, lineStyles, marginTop, marginBottom, ...row }: ColumnsProps) {
  return lineStyles.map((style, line) =>
    createElement(
      Row,
      {
        ...row,
        key: line,
        marginTop: line === 0 ? marginTop : 0,
        marginBottom: line === lineStyles.length - 1 ? marginBottom : 0,
      },
      columns.map((column) =>
        createElement(Cell, {
          key: column.key,
          ...style,
          width: column.width,
          align: column.align ?? "center",
          offset: column.offset,
          background: column.background ?? style.background,
          children: column.lines[line] ?? "",
        }),
      ),
    ),
  );
}
