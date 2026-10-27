// A minimal in-memory stand-in for the TVJS DOM, just enough for the renderer.

import type {
  TVMLDocument,
  TVMLElement,
  TVMLEvent,
  TVMLNavigationDocument,
} from "../src/dom.js";

type Listener = (event: TVMLEvent) => void;

export class FakeElement implements TVMLElement {
  parentNode: FakeElement | null = null;
  children: Array<FakeElement> = [];
  attributes = new Map<string, string>();
  setAttributeCalls = 0;
  nodeValue: string | null = null;

  constructor(
    readonly ownerDocument: FakeDocument,
    readonly tagName: string | undefined,
  ) {}

  get firstChild(): FakeElement | null {
    return this.children[0] ?? null;
  }

  get textContent(): string | null {
    return this.tagName === undefined
      ? this.nodeValue
      : this.children.map((child) => child.textContent ?? "").join("");
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  setAttribute(name: string, value: string): void {
    this.setAttributeCalls++;
    this.attributes.set(name, value);
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name);
  }

  appendChild(child: FakeElement): FakeElement {
    child.parentNode?.removeChild(child);
    this.children.push(child);
    child.parentNode = this;
    return child;
  }

  insertBefore(child: FakeElement, before: FakeElement | null): FakeElement {
    if (!before) {
      return this.appendChild(child);
    }
    child.parentNode?.removeChild(child);
    const index = this.children.indexOf(before);
    if (index === -1) {
      throw new Error("insertBefore: reference node is not a child");
    }
    this.children.splice(index, 0, child);
    child.parentNode = this;
    return child;
  }

  removeChild(child: FakeElement): FakeElement {
    const index = this.children.indexOf(child);
    if (index === -1) {
      throw new Error("removeChild: node is not a child");
    }
    this.children.splice(index, 1);
    child.parentNode = null;
    return child;
  }

  addEventListener(): void {}
  removeEventListener(): void {}

  toXML(): string {
    if (this.tagName === undefined) {
      return this.nodeValue ?? "";
    }
    const attributes = [...this.attributes]
      .map(([name, value]) => ` ${name}="${value}"`)
      .join("");
    const inner = this.children.map((child) => child.toXML()).join("");
    return inner
      ? `<${this.tagName}${attributes}>${inner}</${this.tagName}>`
      : `<${this.tagName}${attributes}/>`;
  }
}

export class FakeDocument implements TVMLDocument {
  readonly documentElement: FakeElement;
  private listeners = new Map<string, Set<Listener>>();

  constructor() {
    this.documentElement = new FakeElement(this, "document");
  }

  createElement(tag: string): FakeElement {
    return new FakeElement(this, tag);
  }

  createTextNode(text: string): FakeElement {
    const node = new FakeElement(this, undefined);
    node.nodeValue = text;
    return node;
  }

  getElementById(id: string): FakeElement | null {
    const visit = (element: FakeElement): FakeElement | null => {
      if (element.getAttribute("id") === id) {
        return element;
      }
      for (const child of element.children) {
        const found = visit(child);
        if (found) {
          return found;
        }
      }
      return null;
    };
    return visit(this.documentElement);
  }

  addEventListener(type: string, listener: Listener): void {
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(listener);
  }

  removeEventListener(type: string, listener: Listener): void {
    this.listeners.get(type)?.delete(listener);
  }

  listenerCount(): number {
    let count = 0;
    for (const set of this.listeners.values()) {
      count += set.size;
    }
    return count;
  }

  /** Dispatch an event the way TVMLKit does: at the document. */
  dispatch(type: string, target: FakeElement): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener({ type, target });
    }
  }

  /** Body of the document element, without the `<document>` wrapper. */
  toXML(): string {
    return this.documentElement.children.map((child) => child.toXML()).join("");
  }
}

export class FakeNavigationDocument implements TVMLNavigationDocument {
  documents: Array<TVMLDocument> = [];

  pushDocument(doc: TVMLDocument): void {
    this.documents.push(doc);
  }
  replaceDocument(doc: TVMLDocument, existing: TVMLDocument): void {
    this.documents[this.documents.indexOf(existing)] = doc;
  }
  insertBeforeDocument(doc: TVMLDocument): void {
    this.documents.unshift(doc);
  }
  removeDocument(doc: TVMLDocument): void {
    this.documents = this.documents.filter((d) => d !== doc);
  }
  presentModal(): void {}
  dismissModal(): void {}
  popDocument(): void {
    this.documents.pop();
  }
  popToRootDocument(): void {
    this.documents = this.documents.slice(0, 1);
  }
  clear(): void {
    this.documents = [];
  }
}

/**
 * Install `navigationDocument` and a `DOMParser` that understands the handful
 * of XML strings tvml-react itself produces.
 */
export function installTVJSGlobals(): {
  navigation: FakeNavigationDocument;
  parsed: Array<string>;
  restore: () => void;
} {
  const scope = globalThis as Record<string, unknown>;
  const previous = {
    navigationDocument: scope.navigationDocument,
    DOMParser: scope.DOMParser,
  };
  const navigation = new FakeNavigationDocument();
  const parsed: Array<string> = [];

  scope.navigationDocument = navigation;
  scope.DOMParser = class {
    parseFromString(source: string) {
      parsed.push(source);
      return new FakeDocument();
    }
  };

  return {
    navigation,
    parsed,
    restore() {
      scope.navigationDocument = previous.navigationDocument;
      scope.DOMParser = previous.DOMParser;
    },
  };
}
