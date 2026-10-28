import { createContext } from "react";
import {
  DefaultEventPriority,
  NoEventPriority,
} from "react-reconciler/constants.js";

import type { TVMLElement } from "./dom.js";
import { clearEventHandlers, isEventProp, setEventHandler } from "./events.js";
import {
  KEYBOARD_PROPS,
  needsKeyboard,
  setKeyboardProp,
  syncKeyboard,
} from "./keyboard.js";
import { serializeStyle, type TVMLStyle } from "./style.js";

type Props = Record<string, unknown>;
type Container = TVMLElement;
type Instance = TVMLElement;
type TextInstance = TVMLElement;
type HostContext = Record<string, never>;
type TimeoutHandle = ReturnType<typeof setTimeout>;

const IGNORED_PROPS = new Set(["children", "key", "ref"]);

function attributeName(key: string): string {
  return key === "className" ? "class" : key;
}

// `srcset={{ "1x": url, "2x": url2x }}` → "url 1x, url2x 2x". TVMLKit splits
// srcset on every comma, so one comma inside a URL blanks the image (and it
// doesn't fall back to `src`).
const warnedSrcsets = new Set<string>();

function serializeSrcset(srcset: Record<string, string>): string {
  return Object.entries(srcset)
    .map(([descriptor, url]) => {
      if (url.includes(",") && !warnedSrcsets.has(url)) {
        warnedSrcsets.add(url);
        console.warn(
          `[tvml-react] srcset URL contains a comma, which TVMLKit can't parse; the image will be blank: ${url}`,
        );
      }
      return `${url} ${descriptor}`;
    })
    .join(", ");
}

function shallowEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  const aKeys = Object.keys(a);
  if (aKeys.length !== Object.keys(b).length) return false;
  return aKeys.every(
    (key) => (a as Record<string, unknown>)[key] === (b as Record<string, unknown>)[key],
  );
}

// value/defaultValue/onTextChange drive the keyboard of these elements; on
// any other element (ratingBadge, progressBar, custom ones) `value` is a plain
// attribute.
const TEXT_INPUTS = new Set(["textField", "searchField"]);

function applyProp(
  element: TVMLElement,
  type: string,
  key: string,
  value: unknown,
  isNew = false,
): void {
  if (IGNORED_PROPS.has(key)) {
    return;
  }

  if (isEventProp(key)) {
    setEventHandler(element, key, value);
    return;
  }

  if (TEXT_INPUTS.has(type) && KEYBOARD_PROPS.has(key)) {
    setKeyboardProp(element, key, value);
    return;
  }

  const name = attributeName(key);

  if (value == null || value === false) {
    if (!isNew && element.getAttribute(name) !== null) {
      element.removeAttribute(name);
    }
    return;
  }

  let next: string;
  if (key === "style" && typeof value === "object") {
    next = serializeStyle(value as TVMLStyle);
  } else if (key === "srcset" && typeof value === "object") {
    next = serializeSrcset(value as Record<string, string>);
  } else if (value === true) {
    next = "true";
  } else {
    next = String(value);
  }

  // Idempotent write: props are usually recreated on every render. Without
  // this guard TVMLKit re-applies identical attributes, which re-decodes images
  // and replays focus animations. A brand-new element has nothing to compare.
  if (isNew || element.getAttribute(name) !== next) {
    element.setAttribute(name, next);
  }
}

let currentUpdatePriority: number = NoEventPriority;

// React 19 requires a host transition context even for renderers that don't
// support form actions.
const HostTransitionContext = createContext<unknown>(null);

export const hostConfig = {
  supportsMutation: true,
  supportsPersistence: false,
  supportsHydration: false,
  isPrimaryRenderer: true,
  noTimeout: -1,

  createInstance(type: string, props: Props, rootContainer: Container) {
    const element = rootContainer.ownerDocument.createElement(type);
    for (const key in props) {
      applyProp(element, type, key, props[key], true);
    }
    return element;
  },

  createTextInstance(text: string, rootContainer: Container) {
    return rootContainer.ownerDocument.createTextNode(text);
  },

  appendInitialChild(parent: Instance, child: Instance | TextInstance) {
    parent.appendChild(child);
  },

  appendChild(parent: Instance, child: Instance | TextInstance) {
    parent.appendChild(child);
  },

  appendChildToContainer(container: Container, child: Instance | TextInstance) {
    container.appendChild(child);
  },

  insertBefore(
    parent: Instance,
    child: Instance | TextInstance,
    before: Instance | TextInstance,
  ) {
    parent.insertBefore(child, before);
  },

  insertInContainerBefore(
    container: Container,
    child: Instance | TextInstance,
    before: Instance | TextInstance,
  ) {
    container.insertBefore(child, before);
  },

  removeChild(parent: Instance, child: Instance | TextInstance) {
    parent.removeChild(child);
  },

  removeChildFromContainer(container: Container, child: Instance | TextInstance) {
    container.removeChild(child);
  },

  clearContainer(container: Container) {
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
  },

  commitUpdate(
    instance: Instance,
    type: string,
    prevProps: Props,
    nextProps: Props,
  ) {
    for (const key in prevProps) {
      if (!(key in nextProps)) {
        applyProp(instance, type, key, undefined);
      }
    }

    for (const key in nextProps) {
      const prev = prevProps[key];
      const next = nextProps[key];
      if (prev === next) continue;
      // Style and srcset objects are usually recreated each render; skip them
      // when nothing inside changed.
      if ((key === "style" || key === "srcset") && shallowEqual(prev, next)) continue;
      applyProp(instance, type, key, next);
    }
  },

  commitTextUpdate(textInstance: TextInstance, _oldText: string, newText: string) {
    textInstance.nodeValue = newText;
  },

  // Called for every host node in a deleted subtree, so handlers on nested
  // elements are released too.
  detachDeletedInstance(node: Instance) {
    clearEventHandlers(node);
  },

  // The keyboard feature is only reachable once the element is in a document,
  // so text inputs hook it up in commitMount.
  finalizeInitialChildren: (_instance: Instance, type: string, props: Props) =>
    TEXT_INPUTS.has(type) && needsKeyboard(props),
  commitMount(instance: Instance) {
    syncKeyboard(instance);
  },
  shouldSetTextContent: () => false,
  getRootHostContext: (): HostContext => ({}),
  getChildHostContext: (parentContext: HostContext) => parentContext,
  getPublicInstance: (instance: Instance) => instance,
  prepareForCommit: () => null,
  resetAfterCommit() {},
  preparePortalMount() {},

  scheduleTimeout: (fn: (...args: Array<unknown>) => unknown, delay?: number) =>
    setTimeout(fn, delay),
  cancelTimeout: (handle: TimeoutHandle) => clearTimeout(handle),

  getInstanceFromNode: () => null,
  beforeActiveInstanceBlur() {},
  afterActiveInstanceBlur() {},
  prepareScopeUpdate() {},
  getInstanceFromScope: () => null,

  setCurrentUpdatePriority(priority: number) {
    currentUpdatePriority = priority;
  },
  getCurrentUpdatePriority: () => currentUpdatePriority,
  resolveUpdatePriority: () =>
    currentUpdatePriority !== NoEventPriority
      ? currentUpdatePriority
      : DefaultEventPriority,

  shouldAttemptEagerTransition: () => false,
  requestPostPaintCallback() {},
  maySuspendCommit: () => false,
  preloadInstance: () => true,
  startSuspendingCommit() {},
  suspendInstance() {},
  waitForCommitToBeReady: () => null,
  resetFormInstance() {},
  trackSchedulerEvent() {},
  resolveEventType: () => null,
  resolveEventTimeStamp: () => -1,

  NotPendingTransition: null,
  HostTransitionContext,
};
