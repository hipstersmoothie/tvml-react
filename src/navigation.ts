// Screen navigation. Pushed screens and modals are rendered as portals from the
// app's single React root into their own TVML documents, so they share React
// context (and state providers) with the rest of the app. A screen is
// unmounted when TVMLKit unloads its document — including when the user backs
// out with the Menu button.

import {
  createContext,
  createElement,
  Fragment,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";

import { createDocument, getNavigationDocument, type TVMLDocument } from "./dom.js";
import { attachEventDelegation } from "./events.js";
import { createPortal } from "./reconciler.js";
import { ScreenContext, trackScreen } from "./screen.js";

export interface Navigation {
  /** Push a screen onto the navigation stack. */
  push(screen: ReactNode): void;
  /** Present a screen modally over the current one. */
  presentModal(screen: ReactNode): void;
  /** Replace the top screen with a new one. */
  replace(screen: ReactNode): void;
  /** Go back one screen. */
  pop(): void;
  /** Go back to the first screen. */
  popToRoot(): void;
  /** Dismiss the presented modal. */
  dismissModal(): void;
}

type PresentMode = "push" | "modal" | "replace";

interface Entry {
  key: number;
  doc: TVMLDocument;
  screen: ReactNode;
  mode: PresentMode;
}

const NavigationContext = createContext<Navigation | null>(null);

export function useNavigation(): Navigation {
  const navigation = useContext(NavigationContext);
  if (!navigation) {
    throw new Error("tvml-react: useNavigation must be used inside a tvml-react root");
  }
  return navigation;
}

let nextKey = 0;

// Presents the document once its content has been committed: TVMLKit shows a
// document that is empty when presented as a blank screen.
function PresentedScreen({
  entry,
  onUnload,
}: {
  entry: Entry;
  onUnload: (entry: Entry) => void;
}) {
  const presented = useRef(false);

  useLayoutEffect(() => {
    const { doc, mode } = entry;
    const detachEvents = attachEventDelegation(doc);
    const untrack = trackScreen(doc);
    const handleUnload = () => onUnload(entry);
    doc.addEventListener("unload", handleUnload);

    if (!presented.current) {
      presented.current = true;
      const navigation = getNavigationDocument();
      if (mode === "modal") {
        navigation.presentModal(doc);
      } else if (mode === "replace") {
        const top = navigation.documents[navigation.documents.length - 1];
        if (top) {
          navigation.replaceDocument(doc, top);
        } else {
          navigation.pushDocument(doc);
        }
      } else {
        navigation.pushDocument(doc);
      }
    }

    return () => {
      doc.removeEventListener("unload", handleUnload);
      untrack();
      detachEvents();
    };
  }, [entry, onUnload]);

  return createElement(ScreenContext.Provider, { value: entry.doc }, entry.screen);
}

export interface NavigationHostProps {
  children?: ReactNode;
  /** Wraps the app and every pushed screen in one shared tree. */
  wrapper?: ComponentType<{ children?: ReactNode }>;
}

export function NavigationHost({ children, wrapper: Wrapper = Fragment }: NavigationHostProps) {
  const [entries, setEntries] = useState<Array<Entry>>([]);

  const navigation = useMemo<Navigation>(() => {
    const add = (screen: ReactNode, mode: PresentMode) => {
      const entry: Entry = { key: nextKey++, doc: createDocument(), screen, mode };
      setEntries((current) => [...current, entry]);
    };
    return {
      push: (screen) => add(screen, "push"),
      presentModal: (screen) => add(screen, "modal"),
      replace: (screen) => add(screen, "replace"),
      pop: () => getNavigationDocument().popDocument(),
      popToRoot: () => getNavigationDocument().popToRootDocument(),
      dismissModal: () => getNavigationDocument().dismissModal(),
    };
  }, []);

  const onUnload = useMemo(
    () => (entry: Entry) =>
      setEntries((current) => current.filter((e) => e !== entry)),
    [],
  );

  return createElement(
    NavigationContext.Provider,
    { value: navigation },
    createElement(
      Wrapper,
      null,
      children,
      entries.map((entry) =>
        createPortal(
          createElement(PresentedScreen, { entry, onUnload }),
          entry.doc.documentElement,
          String(entry.key),
        ),
      ),
    ),
  );
}
