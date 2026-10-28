import { useState } from "react";

import { Albums } from "./Albums";
import { Elements } from "./Elements";
import { NativeList } from "./NativeList";
import { Platform } from "./Platform";

type Tab = "albums" | "list" | "elements" | "platform";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "albums", label: "Albums" },
  { id: "list", label: "Native list" },
  { id: "elements", label: "Elements" },
  { id: "platform", label: "Platform" },
];

export function App() {
  const [tab, setTab] = useState<Tab>("albums");

  return (
    <divTemplate theme="dark">
      <segmentBar style={{ tvPosition: "header", tvAlign: "center", margin: 40 }}>
        {TABS.map(({ id, label }) => (
          <segmentBarItem key={id} onHighlight={() => setTab(id)}>
            <title>{label}</title>
          </segmentBarItem>
        ))}
      </segmentBar>
      {tab === "albums" && <Albums />}
      {tab === "list" && <NativeList />}
      {tab === "elements" && <Elements />}
      {tab === "platform" && <Platform />}
    </divTemplate>
  );
}
