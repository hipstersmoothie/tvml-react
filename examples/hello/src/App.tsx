import type {} from "tvml-react/simplified-list";

import { useEffect, useState } from "react";

const ALBUMS = [
  { id: "blue", title: "Kind of Blue", artist: "Miles Davis", year: 1959 },
  { id: "rumours", title: "Rumours", artist: "Fleetwood Mac", year: 1977 },
  { id: "dummy", title: "Dummy", artist: "Portishead", year: 1994 },
  { id: "ok", title: "OK Computer", artist: "Radiohead", year: 1997 },
  { id: "vespertine", title: "Vespertine", artist: "Björk", year: 2001 },
  { id: "currents", title: "Currents", artist: "Tame Impala", year: 2015 },
];

type Album = (typeof ALBUMS)[number];

const artwork = (album: Album) => `https://picsum.photos/seed/${album.id}/400/400`;

type Tab = "albums" | "list";

export function App(_props: { baseUrl: string }) {
  const [tab, setTab] = useState<Tab>("albums");
  const [selected, setSelected] = useState<Album | null>(null);
  const [plays, setPlays] = useState<Record<string, number>>({});

  // Swapping the root template element swaps the whole screen.
  if (selected) {
    const count = plays[selected.id] ?? 0;
    return (
      <alertTemplate theme="dark">
        <title>{selected.title}</title>
        <description>
          {`${selected.artist} · ${selected.year} · played ${count} ${count === 1 ? "time" : "times"}`}
        </description>
        <button
          onSelect={() =>
            setPlays((p) => ({ ...p, [selected.id]: (p[selected.id] ?? 0) + 1 }))
          }
        >
          <text>Play</text>
        </button>
        <button onSelect={() => setSelected(null)}>
          <text>Back</text>
        </button>
      </alertTemplate>
    );
  }

  return (
    <divTemplate theme="dark">
      <segmentBar style={{ tvPosition: "header", tvAlign: "center", margin: 40 }}>
        <segmentBarItem onHighlight={() => setTab("albums")}>
          <title>Albums</title>
        </segmentBarItem>
        <segmentBarItem onHighlight={() => setTab("list")}>
          <title>Native list</title>
        </segmentBarItem>
      </segmentBar>
      {tab === "albums" ? (
        <Albums plays={plays} onSelect={setSelected} />
      ) : (
        <NativeList />
      )}
    </divTemplate>
  );
}

function Albums({
  plays,
  onSelect,
}: {
  plays: Record<string, number>;
  onSelect: (album: Album) => void;
}) {
  const [highlighted, setHighlighted] = useState<Album | null>(null);

  return (
    <collectionList style={{ padding: "240 0 0 0" }}>
      <shelf style={{ padding: "0 90 0 90", tvInteritemSpacing: 48 }}>
        <header>
          <title style={{ color: "white", fontSize: 38 }}>
            {highlighted
              ? `${highlighted.title} — ${highlighted.artist}`
              : "Pick a record"}
          </title>
        </header>
        <section>
          {ALBUMS.map((album) => (
            <lockup
              key={album.id}
              onSelect={() => onSelect(album)}
              onHighlight={() => setHighlighted(album)}
            >
              <img src={artwork(album)} width={250} height={250} />
              <title style={{ color: "white" }}>{album.title}</title>
              <subtitle style={{ color: "rgba(255, 255, 255, 0.6)" }}>
                {plays[album.id] ? `${plays[album.id]} plays` : album.artist}
              </subtitle>
            </lockup>
          ))}
        </section>
      </shelf>
    </collectionList>
  );
}

// Uses the <simplifiedList> view from the TVMLReactExtras Swift package.
function NativeList() {
  const now = useClock();

  return (
    <simplifiedList
      summary={`It's ${now}`}
      style={{ width: 1920, height: 880, tvPosition: "bottom" }}
    >
      {ALBUMS.map((album, index) => (
        <simplifiedListRow
          key={album.id}
          title={`${String(index + 1).padStart(2, "0")} · ${album.title}`}
          subtitle={album.artist}
          accessory={String(album.year)}
          image={artwork(album)}
        />
      ))}
    </simplifiedList>
  );
}

function useClock() {
  const format = () => {
    const date = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  };
  const [time, setTime] = useState(format);
  useEffect(() => {
    const id = setInterval(() => setTime(format()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}
