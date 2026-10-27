// A `menuBarTemplate` tab bar. TVMLKit shows each tab's content as a separate
// document handed to the menu bar's `MenuBarDocument` feature, which
// tvml-react has no API for yet. Each tab gets its own React root (so its
// events and screen hooks are wired up) and is created the first time the
// tab is highlighted.

import { useEffect, useRef, type ReactNode } from "react";
import { createDocument, createRoot, type TVMLElement, type TVMLRoot } from "tvml-react";

interface MenuBarDocumentFeature {
  setDocument(document: unknown, menuItem: TVMLElement): void;
}

export interface Tab {
  id: string;
  label: string;
  content: () => ReactNode;
}

export function MenuBarTabs({ tabs }: { tabs: ReadonlyArray<Tab> }) {
  const menuBar = useRef<TVMLElement>(null);
  const roots = useRef(new Map<string, TVMLRoot>());

  useEffect(() => {
    const current = roots.current;
    return () => {
      for (const root of current.values()) root.unmount();
      current.clear();
    };
  }, []);

  const show = (tab: Tab, menuItem: TVMLElement | null) => {
    const feature = menuBar.current?.getFeature?.("MenuBarDocument") as MenuBarDocumentFeature | undefined;
    if (!feature || !menuItem) return;
    let root = roots.current.get(tab.id);
    if (!root) {
      root = createRoot(createDocument());
      // The first render is synchronous, so the document isn't empty when the
      // menu bar presents it.
      root.render(tab.content());
      roots.current.set(tab.id, root);
    }
    feature.setDocument(root.document, menuItem);
  };

  return (
    <menuBarTemplate theme="dark">
      <menuBar ref={menuBar}>
        {tabs.map((tab) => (
          <menuItem
            key={tab.id}
            onHighlight={(event) => show(tab, event.target)}
            onSelect={(event) => show(tab, event.target)}
          >
            <title>{tab.label}</title>
          </menuItem>
        ))}
      </menuBar>
    </menuBarTemplate>
  );
}
