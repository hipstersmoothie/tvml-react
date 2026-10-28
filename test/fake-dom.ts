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

  get nextSibling(): FakeElement | null {
    const siblings = this.parentNode?.children ?? [];
    return siblings[siblings.indexOf(this) + 1] ?? null;
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

  features: Record<string, unknown> = {};
  getFeature(name: string): unknown {
    return this.features[name];
  }

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
  dispatch(type: string, target: FakeElement = this.documentElement): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener({ type, target });
    }
  }

  /** Body of the document element, without the `<document>` wrapper. */
  toXML(): string {
    return this.documentElement.children.map((child) => child.toXML()).join("");
  }
}

// Fires the lifecycle events TVMLKit does (verified on tvOS 26): load + appear
// on present, disappear on the covered document, disappear + unload on pop.
const fire = (doc: TVMLDocument | undefined, ...types: Array<string>) => {
  for (const type of types) (doc as FakeDocument | undefined)?.dispatch?.(type);
};

export class FakeNavigationDocument implements TVMLNavigationDocument {
  documents: Array<TVMLDocument> = [];
  modal: TVMLDocument | undefined;

  pushDocument(doc: TVMLDocument): void {
    const covered = this.documents.at(-1);
    this.documents.push(doc);
    fire(doc, "load", "appear");
    fire(covered, "disappear");
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
  presentModal(doc: TVMLDocument): void {
    this.modal = doc;
    fire(doc, "load", "appear");
  }
  dismissModal(): void {
    const modal = this.modal;
    this.modal = undefined;
    fire(modal, "disappear", "unload");
  }
  popDocument(): void {
    const popped = this.documents.pop();
    fire(this.documents.at(-1), "appear");
    fire(popped, "disappear", "unload");
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
