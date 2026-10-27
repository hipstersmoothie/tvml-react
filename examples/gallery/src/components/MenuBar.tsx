import { useEffect, useRef, type ReactNode } from "react";
import { createRoot, type TVMLDocument, type TVMLElement } from "tvml-react";

// tvml-react has no menuBarTemplate support yet. Each tab of a menu bar is a
// separate TVML document handed to the menuBar's "MenuBarDocument" feature, so
// this component renders every tab into its own tvml-react root and registers
// that root's document for the tab's menuItem. TVMLKit then switches tabs on
// focus by itself.
//
// Tabs are separate React trees: share state through storage-backed hooks
// (useLocalStorage) or module-level stores, not context. Each tab gets its own
// useNavigation(), which pushes onto the shared navigation stack.

interface MenuBarDocumentFeature {
  setDocument(document: TVMLDocument, menuItem: TVMLElement): void;
  getDocument(menuItem: TVMLElement): TVMLDocument | undefined;
  setSelectedItem(menuItem: TVMLElement): void;
}

export interface Tab {
  id: string;
  title: string;
  render: () => ReactNode;
}

export function MenuBar({ tabs }: { tabs: Array<Tab> }) {
  const menuBar = useRef<TVMLElement>(null);
  const menuItems = useRef(new Map<string, TVMLElement>());

  useEffect(() => {
    const feature = menuBar.current?.getFeature?.("MenuBarDocument") as
      | MenuBarDocumentFeature
      | undefined;
    if (!feature) return;

    // Every tab is created up front: a root renders synchronously, so each
    // document has content by the time TVMLKit shows it.
    const roots = tabs.map((tab) => {
      const root = createRoot();
      root.render(tab.render());
      const item = menuItems.current.get(tab.id);
      if (item) feature.setDocument(root.document, item);
      return root;
    });
    return () => {
      for (const root of roots) root.unmount();
    };
  }, [tabs]);

  return (
    <menuBarTemplate theme="dark">
      <menuBar ref={menuBar}>
        {tabs.map((tab) => (
          <menuItem
            key={tab.id}
            ref={(element) => {
              if (element) menuItems.current.set(tab.id, element);
              else menuItems.current.delete(tab.id);
            }}
          >
            <title>{tab.title}</title>
          </menuItem>
        ))}
      </menuBar>
    </menuBarTemplate>
  );
}
