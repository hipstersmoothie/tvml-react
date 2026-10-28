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
//
// For content that a row of single lines can't hold, an <organizer> works
// where <stack> doesn't:
//
//   <Stack>     a vertical run of cells and images that can go in a row,
//               e.g. a title and subtitle beside artwork.
//   <Box>       a fixed-size area whose children are placed with `position`
//               (corners, edges, center).

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
import { placement, type Position } from "./placement.js";
import { measureText } from "./native.js";

export type { Position } from "./placement.js";

/** The screen's width in points. */
export const SCREEN_WIDTH = 1920;
/** The screen's height in points. */
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

// Cells in a Stack default to its width and alignment, which is how a stack
// aligns its text (tv-align inside an organizer isn't reliable).
const StackContext = createContext<{ width: number; align: Align } | null>(null);

export interface ScreenProps {
  /** The template's theme. Also sets the default text color. */
  theme?: "light" | "dark";
  /** Default text color for cells. Defaults to white, or black with the light theme. */
  color?: string;
  /** A full-screen background image. Fixed once the screen is presented. */
  background?: string;
  /** Rows, and any other divTemplate content. */
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
  /** Font weight. */
  weight?: FontWeight;
  /** Defaults to the Screen's text color. */
  color?: string;
  /** A fill behind the text, e.g. a translucent panel. Corners can't be rounded. */
  background?: string;
  /** Fixed height; the text is vertically centered. */
  height?: number;
  /** Lines before truncating with an ellipsis (default 1). `\n` starts a new line. */
  lines?: number;
  /** Space between the text and the left and right edges of its background. */
  inset?: number;
}

export interface CellProps extends TextStyle {
  /** Width in points. Without one, the cell is sized to its text. */
  width?: number;
  /** Text alignment in the cell. Defaults to left, or the Stack's alignment. */
  align?: Align;
  /** Extra space before this cell, on top of the row's gap. */
  offset?: number;
  /** Where the cell goes inside a <Box>. */
  position?: Position;
  /** The text. */
  children: string | number;
}

/** The width a cell takes up in its row (not counting `offset`). */
export function cellWidth({ width, children, size, weight, inset = 0 }: CellProps): number {
  if (width !== undefined) return width;
  const text = String(children);
  // A little slack so measured text never truncates.
  return Math.ceil(measureText(text, { fontSize: size ?? DEFAULT_SIZE, fontWeight: weight }).width) + 4 + 2 * inset;
}

/** A text box in a row. */
export function Cell(props: CellProps) {
  const { offset, position, children, size, weight, background, height, lines, inset } = props;
  const screen = useContext(LayoutContext);
  const stack = useContext(StackContext);
  const text = String(children);
  return createElement(
    "text",
    {
      style: {
        width: props.width ?? stack?.width ?? cellWidth(props),
        height,
        textAlign: props.align ?? stack?.align ?? "left",
        ...placement(position),
        fontSize: size,
        fontWeight: weight,
        color: props.color ?? screen.color,
        backgroundColor: background,
        tvTextMaxLines: lines ?? 1,
        padding: inset ? `0 ${inset}` : undefined,
        margin: offset ? `0 0 0 ${offset}` : undefined,
      },
    },
    // An empty <text> collapses to zero width, so keep a space in it.
    text === "" ? " " : text,
  );
}

export interface SpacerProps {
  /** Width in points. */
  width: number;
}

/** Horizontal space in a row. */
export function Spacer({ width }: SpacerProps) {
  return createElement("text", { style: { width } }, " ");
}

export interface ImageProps {
  /** Image URL, or a `resource://` or `symbol://` name. */
  src: string;
  /** Width in points. */
  width: number;
  /** Height in points. */
  height: number;
  /** Extra space before the image, on top of the row's gap. */
  offset?: number;
  /** Where the image goes inside a <Box>. */
  position?: Position;
  /** What VoiceOver reads. */
  accessibilityText?: string;
}

/** An image in a row. divTemplate ignores `<img>`'s width/height attributes; this sizes it with style. */
export function Image({ src, width, height, offset, position, accessibilityText }: ImageProps) {
  return createElement("img", {
    src,
    accessibilityText,
    style: { width, height, ...placement(position), margin: offset ? `0 0 0 ${offset}` : undefined },
  });
}

// --- Stacks and boxes -----------------------------------------------------------

export interface StackProps {
  /** Defaults to the widest child. Cells without their own width take this one. */
  width?: number;
  /** Text alignment for the stack's cells. Defaults to "left". Images stay left. */
  align?: Align;
  /** Vertical space between children. */
  gap?: number;
  /** Extra space before the stack in a row. */
  offset?: number;
  /** Where the stack goes inside a <Box>. */
  position?: Position;
  /** Cells and images, top to bottom. */
  children?: ReactNode;
}

/** The width a stack takes up in its row (not counting `offset`). */
export function stackWidth({ width, children }: StackProps): number {
  if (width !== undefined) return width;
  let widest = 0;
  for (const child of Children.toArray(children)) {
    if (!isValidElement(child)) continue;
    widest = Math.max(widest, childWidth(child, false) ?? 0);
  }
  return widest;
}

/**
 * Cells and images stacked vertically, as one cell of a row: a title and
 * subtitle beside artwork, or a column of a forecast. Renders an
 * `<organizer>`, which (unlike `<stack>`) works inside a `<row>`. It's
 * vertically centered in its row.
 */
export function Stack(props: StackProps) {
  const { align = "left", gap = 0, offset, position, children } = props;
  const width = stackWidth(props);
  const items = Children.toArray(children);
  const spaced: Array<ReactNode> = [];
  items.forEach((item, index) => {
    if (index > 0 && gap > 0) {
      spaced.push(
        createElement(
          "text",
          { key: `tvml-react-gap-${index}`, style: { width: 1, height: gap, fontSize: 1 } },
          " ",
        ),
      );
    }
    spaced.push(item);
  });
  return createElement(
    StackContext.Provider,
    { value: { width, align } },
    createElement(
      "organizer",
      {
        style: {
          width,
          ...placement(position),
          margin: offset ? `0 0 0 ${offset}` : undefined,
        },
      },
      spaced,
    ),
  );
}

export interface BoxProps {
  /** Width in points. */
  width: number;
  /** Height in points. */
  height: number;
  /** Extra space before the box in a row. */
  offset?: number;
  /** Where the box goes inside another <Box>. */
  position?: Position;
  /** Cells, Images and Stacks, each placed with its `position` (default center). */
  children?: ReactNode;
}

/**
 * A fixed-size area whose children are placed by `position`: a caption in
 * a corner, a badge at the top right. Renders an `<organizer>`. TVML draws no
 * background color or background image for it; put an Image in it instead.
 */
export function Box({ width, height, offset, position, children }: BoxProps) {
  return createElement(
    "organizer",
    {
      style: {
        width,
        height,
        ...placement(position),
        margin: offset ? `0 0 0 ${offset}` : undefined,
      },
    },
    children,
  );
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
  /** Space below the row. */
  marginBottom?: number;
  /** Cells, Spacers, Images, Stacks and Boxes. */
  children?: ReactNode;
}

// Width of one child of a row or stack, or undefined if it isn't a layout
// component.
function childWidth(child: ReactElement, withOffset = true): number | undefined {
  const props = child.props as Record<string, unknown>;
  const offset = withOffset && typeof props.offset === "number" ? props.offset : 0;
  if (child.type === Cell) return cellWidth(props as unknown as CellProps) + offset;
  if (child.type === Spacer) return (props as unknown as SpacerProps).width;
  if (child.type === Image) return (props as unknown as ImageProps).width + offset;
  if (child.type === Stack) return stackWidth(props as StackProps) + offset;
  if (child.type === Box) return (props as unknown as BoxProps).width + offset;
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
      "a row with left or right alignment can only measure Cell, Spacer, Image, Stack and Box children; " +
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
  /** React key for the column. */
  key: string;
  /** Width in points. */
  width: number;
  /** Text alignment. Defaults to center. */
  align?: Align;
  /** Extra space before this column. */
  offset?: number;
  /** Fill for the column's cells. */
  background?: string;
  /** One string per line, top to bottom. */
  lines: Array<string>;
}

export interface ColumnsProps extends Omit<RowProps, "children"> {
  /** The columns, left to right. */
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
