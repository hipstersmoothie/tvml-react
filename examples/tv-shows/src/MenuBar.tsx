// A prototype of native tab bars (`menuBarTemplate`) for tvml-react.
//
// TVMLKit shows each menu item's content as a separate TVML document, attached
// with the menu bar's `MenuBarDocument` feature:
//
//   menuBar.getFeature("MenuBarDocument").setDocument(doc, menuItem)
//
// Here every <MenuBarItem> owns a document and renders its children into it
// through a portal, the same way useNavigation() renders pushed screens. So tab
// content stays in the app's one React tree (shared context and state), mounts
// lazily the first time its tab is selected, and stays mounted afterwards so
// switching back keeps scroll position and loaded data.
//
//   <menuBarTemplate>
//     <MenuBar>
//       <MenuBarItem id="tonight" title="Tonight"><Tonight /></MenuBarItem>
//       <MenuBarItem id="search" title="Search"><Search /></MenuBarItem>
//     </MenuBar>
//   </menuBarTemplate>

import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  createDocument,
  createPortal,
  createRoot,
  type TVMLDocument,
  type TVMLElement,
} from "tvml-react";

/** The TVJS `MenuBarDocument` feature of a `<menuBar>` element. */
interface MenuBarDocumentFeature {
  getDocument(menuItem: TVMLElement): TVMLDocument | undefined;
  setDocument(doc: TVMLDocument, menuItem: TVMLElement): void;
  setSelectedItem(menuItem: TVMLElement): void;
}

interface MenuBarContextValue {
  selected: string;
  select(id: string): void;
}

const MenuBarContext = createContext<MenuBarContextValue | null>(null);

export interface MenuBarProps {
  /** Item shown first. Defaults to the first <MenuBarItem>. */
  defaultSelected?: string;
  /** Called when the user moves to another tab. */
  onChange?: (id: string) => void;
  children: ReactNode;
}

export function MenuBar({ defaultSelected, onChange, children }: MenuBarProps) {
  const [selected, setSelected] = useState(() => defaultSelected ?? firstItemId(children));
  const latestOnChange = useRef(onChange);
  latestOnChange.current = onChange;

  const context = useMemo<MenuBarContextValue>(
    () => ({
      selected,
      select(id) {
        if (id === selected) return;
        setSelected(id);
        latestOnChange.current?.(id);
      },
    }),
    [selected],
  );

  return (
    <MenuBarContext.Provider value={context}>
      <menuBar>{children}</menuBar>
    </MenuBarContext.Provider>
  );
}

export interface MenuBarItemProps {
  id: string;
  title: string;
  /** The tab's screen: a template element (`stackTemplate`, `searchTemplate`, ...). */
  children: ReactNode;
}

export function MenuBarItem({ id, title, children }: MenuBarItemProps) {
  const menuBar = useContext(MenuBarContext);
  if (!menuBar) {
    throw new Error("<MenuBarItem> must be rendered inside <MenuBar>");
  }
  const ref = useRef<TVMLElement>(null);
  const doc = useTabDocument();
  const isSelected = menuBar.selected === id;

  // Mount the tab the first time it's selected and keep it mounted.
  const [mounted, setMounted] = useState(isSelected);
  if (isSelected && !mounted) {
    setMounted(true);
  }

  // TVMLKit focuses the first menu item at load; autoHighlight moves that
  // initial focus to the default tab instead.
  const [isDefault] = useState(isSelected);

  // Runs after the portal below has committed into `doc`, so TVMLKit is never
  // handed an empty document.
  useLayoutEffect(() => {
    const item = ref.current;
    if (!isSelected || !item) return;
    const feature = menuBarFeature(item);
    if (feature && feature.getDocument(item) !== doc) {
      feature.setDocument(doc, item);
    }
  }, [isSelected, doc]);

  return (
    <>
      {/* TVMLKit fires `select` when focus lands on a menu item (and once at
          load for the initially focused one). */}
      <menuItem ref={ref} autoHighlight={isDefault || undefined} onSelect={() => menuBar.select(id)}>
        <title>{title}</title>
      </menuItem>
      {mounted && createPortal(children, doc.documentElement)}
    </>
  );
}

// WORKAROUND: tvml-react only delegates `onSelect`/`onHighlight`/... from the
// documents it presents itself (the root and useNavigation() screens). Events
// inside a tab document are dispatched on that document, so without this every
// onSelect in a tab would silently do nothing. `createRoot` is the only public
// API that installs the delegation on a document. The root is never rendered
// into (the portal above does that) and never unmounted: unmounting it would
// clear the document, which the portal's content lives in.
function useTabDocument(): TVMLDocument {
  const [doc] = useState(() => {
    const doc = createDocument();
    createRoot(doc);
    return doc;
  });
  return doc;
}

// Read the feature through the item rather than a ref on <menuBar>: a parent's
// ref isn't attached yet when its children's layout effects run on the first
// commit.
function menuBarFeature(item: TVMLElement): MenuBarDocumentFeature | undefined {
  return item.parentNode?.getFeature?.("MenuBarDocument") as MenuBarDocumentFeature | undefined;
}

function firstItemId(children: ReactNode): string {
  for (const child of Children.toArray(children)) {
    if (isValidElement<{ id?: unknown }>(child) && typeof child.props.id === "string") {
      return child.props.id;
    }
  }
  return "";
}
