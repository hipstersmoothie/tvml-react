import { MenuBar, MenuBarItem } from "tvml-react";

import { Home } from "./Home";
import { Search } from "./Search";

export function App() {
  return (
    <menuBarTemplate theme="dark">
      <MenuBar>
        <MenuBarItem id="listen-now" title="Listen Now">
          <Home />
        </MenuBarItem>
        <MenuBarItem id="search" title="Search">
          <Search />
        </MenuBarItem>
      </MenuBar>
    </menuBarTemplate>
  );
}
