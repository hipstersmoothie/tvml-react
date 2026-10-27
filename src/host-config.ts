import { createContext } from "react";
import {
  DefaultEventPriority,
  NoEventPriority,
} from "react-reconciler/constants.js";

import type { TVMLElement } from "./dom.js";
import { clearEventHandlers, isEventProp, setEventHandler } from "./events.js";
import { attachKeyboard, setTextChangeHandler } from "./keyboard.js";
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

function applyProp(element: TVMLElement, key: string, value: unknown): void {
  if (IGNORED_PROPS.has(key)) {
    return;
  }

  if (isEventProp(key)) {
    setEventHandler(element, key, value);
    return;
  }

  if (key === "onTextChange") {
    setTextChangeHandler(element, value);
    return;
  }

  const name = attributeName(key);

  if (value == null || value === false) {
    if (element.getAttribute(name) !== null) {
      element.removeAttribute(name);
    }
    return;
  }

  let next: string;
  if (key === "style" && typeof value === "object") {
    next = serializeStyle(value as TVMLStyle);
  } else if (value === true) {
    next = "true";
  } else {
    next = String(value);
  }

  // Idempotent write: style objects (and other props) are usually recreated on
  // every render. Without this guard TVMLKit re-applies identical attributes,
  // which re-decodes images and replays focus animations.
  if (element.getAttribute(name) !== next) {
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
      applyProp(element, key, props[key]);
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
    _type: string,
    prevProps: Props,
    nextProps: Props,
  ) {
    for (const key in prevProps) {
      if (!(key in nextProps)) {
        applyProp(instance, key, undefined);
      }
    }

    for (const key in nextProps) {
      if (prevProps[key] !== nextProps[key]) {
        applyProp(instance, key, nextProps[key]);
      }
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
  finalizeInitialChildren: (_instance: Instance, _type: string, props: Props) =>
    typeof props.onTextChange === "function",
  commitMount(instance: Instance) {
    attachKeyboard(instance);
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
