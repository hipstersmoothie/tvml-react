// Content for the design exploration: one reference page (Stack) and the
// sidebar around it, shared by every direction so they compare like for like.

export type SymbolKind = "component" | "hook" | "function" | "type" | "article" | "constant";

export interface NavItem {
  title: string;
  kind: SymbolKind;
  current?: boolean;
}

export interface NavGroup {
  title: string;
  items: Array<NavItem>;
}

export const nav: Array<NavGroup> = [
  {
    title: "Essentials",
    items: [
      { title: "Getting started", kind: "article" },
      { title: "launch", kind: "function" },
      { title: "createRoot", kind: "function" },
      { title: "TVML elements", kind: "article" },
    ],
  },
  {
    title: "Navigation",
    items: [
      { title: "useNavigation", kind: "hook" },
      { title: "MenuBar", kind: "component" },
      { title: "DocumentPortal", kind: "component" },
    ],
  },
  {
    title: "Layout",
    items: [
      { title: "Laying out a divTemplate", kind: "article" },
      { title: "Screen", kind: "component" },
      { title: "Row", kind: "component" },
      { title: "Cell", kind: "component" },
      { title: "Stack", kind: "component", current: true },
      { title: "Box", kind: "component" },
      { title: "Columns", kind: "component" },
      { title: "CONTENT_WIDTH", kind: "constant" },
    ],
  },
  {
    title: "Media",
    items: [
      { title: "usePlayer", kind: "hook" },
      { title: "PlayerOverlay", kind: "component" },
      { title: "MediaItemInput", kind: "type" },
    ],
  },
  {
    title: "Data",
    items: [
      { title: "useScreenQuery", kind: "hook" },
      { title: "WebSocket", kind: "type" },
    ],
  },
  {
    title: "Platform",
    items: [
      { title: "useAppState", kind: "hook" },
      { title: "useColorScheme", kind: "hook" },
      { title: "Platform notes", kind: "article" },
    ],
  },
];

export const kindBadge: Record<SymbolKind, { letter: string; label: string }> = {
  component: { letter: "C", label: "Component" },
  hook: { letter: "H", label: "Hook" },
  function: { letter: "f", label: "Function" },
  type: { letter: "T", label: "Type" },
  constant: { letter: "K", label: "Constant" },
  article: { letter: "", label: "Article" },
};

export const page = {
  kind: "Component",
  module: "tvml-react/layout",
  title: "Stack",
  abstract: "A column of cells and images that can sit in a row.",
  availability: ["tvOS 15.0+", "tvml-react 0.1+"],
  declaration: `function Stack(props: StackProps): JSX.Element`,
  overview: [
    "A <stack> inside a divTemplate <row> never renders, so content that needs more than one line, like a title and subtitle beside artwork, can't be built from TVML's stack. Stack renders an <organizer> instead, which TVMLKit lays out as a column inside a row.",
    "Cells in a stack take its width and alignment, so text lines up on the left, center or right. Without a width, the stack is as wide as its widest child. Stacks are vertically centered in their row.",
  ],
  props: [
    {
      name: "width",
      type: "number",
      summary: "The stack's width in points. Defaults to its widest child; cells without their own width take this one.",
    },
    {
      name: "align",
      type: '"left" | "center" | "right"',
      summary: "Text alignment for the stack's cells. Defaults to left. Images stay on the left.",
    },
    { name: "gap", type: "number", summary: "Vertical space between children, in points." },
    { name: "offset", type: "number", summary: "Extra space before the stack in a row." },
    { name: "position", type: "Position", summary: "Where the stack goes inside a Box." },
  ],
  notes: [
    {
      kind: "Important",
      text: "TVMLKit draws no background for an organizer, so a stack can't have a fill. Give its cells a background instead.",
    },
  ],
  seeAlso: [
    { title: "Row", kind: "component" as SymbolKind, summary: "A horizontal run of cells inside the safe area." },
    { title: "Box", kind: "component" as SymbolKind, summary: "A fixed-size area whose children are placed by position." },
    { title: "Cell", kind: "component" as SymbolKind, summary: "A text box, fixed width or sized to its text." },
  ],
};
