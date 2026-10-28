import { MenuBar, MenuBarItem } from "tvml-react";

import { FeedScreen } from "./FeedScreen";
import { FEEDS } from "./hn";

export function App() {
  return (
    <menuBarTemplate theme="dark">
      <MenuBar>
        {FEEDS.map((feed) => (
          <MenuBarItem key={feed.id} id={feed.id} title={feed.label}>
            <FeedScreen feed={feed.id} title={feed.title} />
          </MenuBarItem>
        ))}
      </MenuBar>
    </menuBarTemplate>
  );
}
