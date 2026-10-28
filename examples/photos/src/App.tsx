import { MenuBar, MenuBarItem } from "tvml-react";

import { Browse } from "./Browse";
import { Favorites } from "./Favorites";

export function App() {
  return (
    <menuBarTemplate>
      <MenuBar>
        <MenuBarItem id="browse" title="Browse">
          <Browse />
        </MenuBarItem>
        <MenuBarItem id="favorites" title="Favorites">
          <Favorites />
        </MenuBarItem>
      </MenuBar>
    </menuBarTemplate>
  );
}
