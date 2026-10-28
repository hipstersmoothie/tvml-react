import { MenuBar, MenuBarItem } from "tvml-react";
import { Popular } from "./Popular";
import { Search } from "./Search";
import { Tonight } from "./Tonight";

export function App() {
  return (
    <menuBarTemplate theme="dark">
      <MenuBar>
        <MenuBarItem id="tonight" title="Tonight">
          <Tonight />
        </MenuBarItem>
        <MenuBarItem id="popular" title="Popular">
          <Popular />
        </MenuBarItem>
        <MenuBarItem id="search" title="Search">
          <Search />
        </MenuBarItem>
      </MenuBar>
    </menuBarTemplate>
  );
}
