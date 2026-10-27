import { FeedScreen } from "./FeedScreen";
import { FEEDS } from "./hn";
import { MenuBarTabs, type Tab } from "./MenuBarTabs";

const TABS: ReadonlyArray<Tab> = FEEDS.map((feed) => ({
  id: feed.id,
  label: feed.label,
  content: () => <FeedScreen feed={feed.id} title={feed.title} />,
}));

export function App() {
  return <MenuBarTabs tabs={TABS} />;
}
