// Types for the TVMLKit JavaScript runtime (TVJS). TVJS exposes a DOM-like
// tree, but it is not the browser DOM, so these are declared separately rather
// than borrowed from lib.dom.

/** TVJS returns live lists rather than arrays. */
export interface TVMLNodeList<T = TVMLElement> {
  /** Number of nodes. */
  readonly length: number;
  /** The node at `index`. */
  item(index: number): T | null;
}

export interface TVMLElement {
  readonly ownerDocument: TVMLDocument;
  readonly parentNode: TVMLElement | null;
  readonly firstChild: TVMLElement | null;
  readonly lastChild?: TVMLElement | null;
  readonly nextSibling: TVMLElement | null;
  readonly previousSibling?: TVMLElement | null;
  readonly childNodes?: TVMLNodeList;
  readonly tagName?: string;
  readonly nodeName?: string;
  /** 1 for elements, 3 for text. */
  readonly nodeType?: number;
  nodeValue: string | null;
  textContent: string | null;
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
  appendChild(child: TVMLElement): TVMLElement;
  insertBefore(child: TVMLElement, before: TVMLElement | null): TVMLElement;
  removeChild(child: TVMLElement): TVMLElement;
  hasAttribute?(name: string): boolean;
  getElementsByTagName?(tag: string): TVMLNodeList;
  getFeature?(name: string): unknown;
  addEventListener(type: string, listener: (event: TVMLEvent) => void): void;
  removeEventListener(type: string, listener: (event: TVMLEvent) => void): void;
  dispatchEvent?(event: unknown): boolean;
}

export interface TVMLEvent {
  /** The event name: `select`, `highlight`, `play`, `holdselect`, `change`, … */
  readonly type: string;
  /** The element the user acted on. */
  readonly target: TVMLElement | null;
  /** Set on some events, e.g. a ratingBadge's `change`. */
  readonly value?: unknown;
}

export interface TVMLDocument {
  readonly documentElement: TVMLElement;
  createElement(tag: string): TVMLElement;
  createTextNode(text: string): TVMLElement;
  getElementById(id: string): TVMLElement | null;
  getElementsByTagName?(tag: string): TVMLNodeList;
  addEventListener(type: string, listener: (event: TVMLEvent) => void): void;
  removeEventListener(type: string, listener: (event: TVMLEvent) => void): void;
}

export interface TVMLNavigationDocument {
  /** The navigation stack, bottom first. */
  readonly documents: Array<TVMLDocument>;
  pushDocument(doc: TVMLDocument): void;
  replaceDocument(doc: TVMLDocument, existing: TVMLDocument): void;
  insertBeforeDocument(doc: TVMLDocument, before?: TVMLDocument): void;
  removeDocument(doc: TVMLDocument): void;
  presentModal(doc: TVMLDocument): void;
  dismissModal(): void;
  popDocument(): void;
  popToRootDocument(): void;
  clear(): void;
}

// TVJS globals, accessed through globalThis so this package type-checks with
// or without lib.dom (whose `DOMParser` would otherwise conflict).
interface TVJSGlobals {
  navigationDocument?: TVMLNavigationDocument;
  DOMParser?: new () => {
    parseFromString(source: string, mimeType: string): TVMLDocument;
  };
}

const tvjs = globalThis as unknown as TVJSGlobals;

function requireGlobal<K extends keyof TVJSGlobals>(
  name: K,
): NonNullable<TVJSGlobals[K]> {
  const value = tvjs[name];
  if (!value) {
    throw new Error(
      `tvml-react: \`${name}\` is not defined. Are you running inside TVMLKit?`,
    );
  }
  return value as NonNullable<TVJSGlobals[K]>;
}

/** The TVJS `navigationDocument` global. */
export function getNavigationDocument(): TVMLNavigationDocument {
  return requireGlobal("navigationDocument");
}

/**
 * Parse an XML string into a document. Works for any XML (RSS, Atom, …), not
 * just TVML; namespaced tag names aren't matched by `getElementsByTagName`.
 */
export function parseDocument(xml: string): TVMLDocument {
  const Parser = requireGlobal("DOMParser");
  return new Parser().parseFromString(xml, "application/xml");
}

/** Create an empty `<document>` to render into. */
export function createDocument(): TVMLDocument {
  return parseDocument("<document></document>");
}

/**
 * Show a document, replacing the top of the navigation stack if there is one
 * or pushing it otherwise.
 */
export function presentDocument(doc: TVMLDocument): void {
  const navigation = getNavigationDocument();
  const { documents } = navigation;
  const top = documents.length > 0 ? documents[documents.length - 1] : undefined;
  if (top) {
    navigation.replaceDocument(doc, top);
  } else {
    navigation.pushDocument(doc);
  }
}

/** Escape `&`, `<`, `>` and `"` for use in TVML markup strings. */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Present a plain `descriptiveAlertTemplate` built from an XML string. Useful
 * for surfacing boot errors without depending on React having rendered.
 */
export function presentMessage(title: string, description: string): void {
  presentDocument(
    parseDocument(
      "<document><descriptiveAlertTemplate>" +
        `<title>${escapeXml(title)}</title>` +
        `<description>${escapeXml(description)}</description>` +
        "</descriptiveAlertTemplate></document>",
    ),
  );
}

/**
 * Move focus to an element. TVJS has no focus API; re-setting `autoHighlight`
 * moves focus in a presented template. Doesn't work in `formTemplate`, where
 * the keyboard keeps focus.
 */
export function focus(element: TVMLElement): void {
  element.removeAttribute("autoHighlight");
  element.setAttribute("autoHighlight", "true");
}
