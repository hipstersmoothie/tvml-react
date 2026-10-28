// Native tab bars. TVMLKit shows each `menuItem`'s content as a separate TVML
// document, attached through the menu bar's `MenuBarDocument` feature. Each
// <MenuBarItem> renders its children into its own document with a
// DocumentPortal, so tabs stay in the app's single React tree (shared context
// and state). A tab mounts the first time it's selected and stays mounted, so
// switching back keeps its scroll position and data.
//
//   <menuBarTemplate>
//     <MenuBar>
//       <MenuBarItem id="home" title="Home"><Home /></MenuBarItem>
//       <MenuBarItem id="search" title="Search"><Search /></MenuBarItem>
//     </MenuBar>
//   </menuBarTemplate>

import {
  Children,
  createContext,
  createElement,
  Fragment,
  isValidElement,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { createDocument, type TVMLDocument, type TVMLElement } from "./dom.js";
import { DocumentPortal } from "./document-portal.js";
import { setScreenVisible } from "./screen.js";

/** The TVJS `MenuBarDocument` feature of a `<menuBar>` element. */
export interface MenuBarDocumentFeature {
  getDocument(menuItem: TVMLElement): TVMLDocument | undefined;
  setDocument(doc: TVMLDocument, menuItem: TVMLElement): void;
  getSelectedItem?(): TVMLElement | undefined;
  setSelectedItem(menuItem: TVMLElement): void;
}

interface MenuBarContextValue {
  selected: string;
  /** Called by TVMLKit's select event when focus lands on an item. */
  onItemSelected(id: string): void;
  register(id: string, element: TVMLElement | null): void;
  /** Move to a tab from code. */
  select(id: string): void;
}

const MenuBarContext = createContext<MenuBarContextValue | null>(null);

// Read the feature through an item: a parent's ref isn't attached yet when its
// children's layout effects run on the first commit.
function featureOf(item: TVMLElement): MenuBarDocumentFeature | undefined {
  return item.parentNode?.getFeature?.("MenuBarDocument") as
    | MenuBarDocumentFeature
    | undefined;
}

function firstItemId(children: ReactNode): string {
  for (const child of Children.toArray(children)) {
    if (isValidElement<{ id?: unknown }>(child) && typeof child.props.id === "string") {
      return child.props.id;
    }
  }
  return "";
}

export interface MenuBarProps {
  /** Tab shown first. Defaults to the first <MenuBarItem>. */
  defaultSelected?: string;
  /** Called when the selected tab changes. */
  onChange?: (id: string) => void;
  /** `<MenuBarItem>`s. */
  children?: ReactNode;
}

/** A `<menuBar>` whose items each show their own screen. Use inside `<menuBarTemplate>`. */
export function MenuBar({ defaultSelected, onChange, children }: MenuBarProps) {
  const [selected, setSelected] = useState(() => defaultSelected ?? firstItemId(children));
  const items = useRef(new Map<string, TVMLElement>());
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const onItemSelected = useCallback((id: string) => {
    setSelected((current) => {
      if (current !== id) {
        onChangeRef.current?.(id);
      }
      return id;
    });
  }, []);

  const context = useMemo<MenuBarContextValue>(
    () => ({
      selected,
      onItemSelected,
      register(id, element) {
        if (element) items.current.set(id, element);
        else items.current.delete(id);
      },
      select(id) {
        const item = items.current.get(id);
        const feature = item && featureOf(item);
        if (item && feature) {
          // TVMLKit fires `select` on the item, which updates `selected`.
          feature.setSelectedItem(item);
        }
        onItemSelected(id);
      },
    }),
    [selected, onItemSelected],
  );

  return createElement(
    MenuBarContext.Provider,
    { value: context },
    createElement("menuBar", null, children),
  );
}

/** Switch tabs from code, e.g. `useMenuBar().select("search")`. */
export function useMenuBar(): { selected: string; select(id: string): void } {
  const context = useContext(MenuBarContext);
  if (!context) {
    throw new Error("tvml-react: useMenuBar must be used inside <MenuBar>");
  }
  return { selected: context.selected, select: context.select };
}

export interface MenuBarItemProps {
  /** Identifies the tab, for `defaultSelected`, `onChange` and `useMenuBar().select`. */
  id: string;
  /** The tab's label in the bar. */
  title: ReactNode;
  /** The tab's screen: a template element (`stackTemplate`, `searchTemplate`, ...). */
  children?: ReactNode;
}

/** A tab in a `<MenuBar>`: its title in the bar, and its screen as children. */
export function MenuBarItem({ id, title, children }: MenuBarItemProps) {
  const menuBar = useContext(MenuBarContext);
  if (!menuBar) {
    throw new Error("tvml-react: <MenuBarItem> must be rendered inside <MenuBar>");
  }
  const [doc] = useState<TVMLDocument>(createDocument);
  const itemRef = useRef<TVMLElement | null>(null);
  const isSelected = menuBar.selected === id;

  // Mount the tab the first time it's selected and keep it mounted. Mark it
  // visible before its content first renders, so useIsScreenVisible starts true.
  const [mounted, setMounted] = useState(() => {
    if (isSelected) setScreenVisible(doc, true);
    return isSelected;
  });
  if (isSelected && !mounted) {
    setScreenVisible(doc, true);
    setMounted(true);
  }

  // TVMLKit focuses the first item at load; autoHighlight moves that initial
  // focus to the default tab. (setSelectedItem during the first, pre-present
  // render doesn't stick.)
  const [isDefault] = useState(isSelected);

  const attach = useCallback(() => {
    const item = itemRef.current;
    if (!item) return;
    const feature = featureOf(item);
    if (feature && feature.getDocument(item) !== doc) {
      feature.setDocument(doc, item);
    }
  }, [doc]);

  // Runs after the portal below has committed (DocumentPortal's onReady covers
  // the first time), so TVMLKit is never handed an empty document.
  useLayoutEffect(() => {
    if (isSelected && mounted) {
      attach();
    }
    setScreenVisible(doc, isSelected);
  }, [isSelected, mounted, attach, doc]);

  const ref = useCallback(
    (element: TVMLElement | null) => {
      itemRef.current = element;
      menuBar.register(id, element);
    },
    [menuBar, id],
  );

  return createElement(
    Fragment,
    null,
    createElement(
      "menuItem",
      {
        ref,
        autoHighlight: isDefault || undefined,
        // TVMLKit fires `select` when focus lands on an item; listen to
        // `highlight` too in case focus moves without one.
        onSelect: () => menuBar.onItemSelected(id),
        onHighlight: () => menuBar.onItemSelected(id),
      },
      typeof title === "string" ? createElement("title", null, title) : title,
    ),
    mounted
      ? createElement(DocumentPortal, {
          document: doc,
          onReady: () => {
            if (menuBar.selected === id) attach();
          },
          children,
        })
      : null,
  );
}
