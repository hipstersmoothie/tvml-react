// Layout primitives for a full-screen divTemplate.
//
// divTemplate is not absolute positioning. Each child is placed in one of nine
// regions by `tv-position`; the children of a region stack vertically, and the
// left/right columns are as wide as their widest child, which squeezes and
// shifts the center column (so "center" is only the screen's center when the
// left and right columns happen to match). `<stack>` is unreliable here:
// without an explicit width it disappears, only the last of several renders,
// its children can come out reordered, and a `<stack>` inside a `<row>` never
// renders. `<row>` and `<stack>` ignore background-color, and vertical margins
// on a row's children are ignored (cells are always vertically centered).
//
// What does work predictably: full-width `<row>`s in the top, center or bottom
// region, holding fixed-width `<text>` cells. A 1920pt row centers its cells,
// so as long as nothing sits in a left/right region, a row whose cells add up
// to CONTENT_WIDTH lands exactly inside the TV-safe area. That's the toolkit:
//
//   <Row>      a row in a region, with optional vertical margins.
//   <Cell>     a fixed-width (optionally fixed-height) text box: alignment,
//              font, color, translucent background.
//   <Spacer>   horizontal space.
//   <Columns>  column-major data rendered as rows ("transposed"), because a
//              column of stacked cells can't be expressed directly.

import type { ReactNode } from "react";

export const SCREEN_WIDTH = 1920;
/** Apple's TV-safe insets: 90pt left/right, 60pt top/bottom. */
export const SAFE_X = 90;
export const SAFE_Y = 60;
/** Make every row's cells add up to this. */
export const CONTENT_WIDTH = SCREEN_WIDTH - 2 * SAFE_X;

export type Region = "top" | "center" | "bottom";
export type Align = "left" | "center" | "right";

export interface RowProps {
  region: Region;
  /** Horizontal space between cells. */
  gap?: number;
  marginTop?: number;
  marginBottom?: number;
  children?: ReactNode;
}

/** A horizontal run of cells, centered on screen. */
export function Row({ region, gap, marginTop = 0, marginBottom = 0, children }: RowProps) {
  return (
    <row
      style={{
        tvPosition: region,
        // With a width, a row centers its cells; without one it shrinks to
        // them and sits at the region's left edge.
        width: SCREEN_WIDTH,
        tvInteritemSpacing: gap,
        margin: marginTop || marginBottom ? `${marginTop} 0 ${marginBottom} 0` : undefined,
      }}
    >
      {children}
    </row>
  );
}

export interface TextStyle {
  size?: number;
  weight?: "ultralight" | "thin" | "light" | "regular" | "medium" | "semibold" | "bold" | "heavy";
  color?: string;
  /** Translucent fills read as panels over the photo. Corners can't be rounded. */
  background?: string;
  /** Fixed height; content is vertically centered. */
  height?: number;
  /** Lines before truncating with an ellipsis. `\n` in the text starts a new line. */
  lines?: number;
}

export interface CellProps extends TextStyle {
  width: number;
  align?: Align;
  /** Extra space before this cell (on top of the row's gap). */
  offset?: number;
  children: string;
}

export function Cell({ width, align = "left", offset, children, ...text }: CellProps) {
  return (
    <text
      style={{
        width,
        height: text.height,
        textAlign: align,
        fontSize: text.size,
        fontWeight: text.weight,
        color: text.color,
        backgroundColor: text.background,
        tvTextMaxLines: text.lines ?? 1,
        margin: offset ? `0 0 0 ${offset}` : undefined,
      }}
    >
      {/* An empty <text> collapses to zero width, so keep a space in it. */}
      {children === "" ? " " : children}
    </text>
  );
}

export function Spacer({ width }: { width: number }) {
  return <Cell width={width}>{" "}</Cell>;
}

/**
 * Rough rendered width of a run of digits in San Francisco at `size` pt.
 * TVML can't size a cell to its text inside a fixed layout and has no text
 * measurement API, so this is how the clock's "PM" sits next to the digits.
 */
export function estimateDigitsWidth(text: string, size: number): number {
  let ems = 0;
  for (const char of text) {
    ems += /[0-9]/.test(char) ? 0.52 : /[:.]/.test(char) ? 0.27 : 0.5;
  }
  return Math.ceil(ems * size);
}

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

export interface ColumnsProps {
  region: Region;
  columns: Array<Column>;
  /** Style of each line (row), shared across columns. */
  lineStyles: Array<TextStyle>;
  /** Horizontal space between columns. */
  gap?: number;
  marginTop?: number;
  marginBottom?: number;
}

/**
 * Lays out columns of stacked cells, e.g. a forecast strip of
 * time / icon / temperature per hour. TVML can't put a `<stack>` in a `<row>`,
 * so each line becomes its own row of fixed-width cells; equal widths keep the
 * columns aligned and touching backgrounds read as one tile per column.
 */
export function Columns({ region, columns, lineStyles, gap = 0, marginTop, marginBottom }: ColumnsProps) {
  return lineStyles.map((style, line) => (
    <Row
      key={line}
      region={region}
      gap={gap}
      marginTop={line === 0 ? marginTop : 0}
      marginBottom={line === lineStyles.length - 1 ? marginBottom : 0}
    >
      {columns.map((column) => (
        <Cell
          key={column.key}
          {...style}
          width={column.width}
          align={column.align ?? "center"}
          offset={column.offset}
          background={column.background ?? style.background}
        >
          {column.lines[line] ?? ""}
        </Cell>
      ))}
    </Row>
  ));
}
