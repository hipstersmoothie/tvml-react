import { useEffect, useState } from "react";
import { useKeepAwake, useNavigation } from "tvml-react";
import { SimplifiedList, SimplifiedListRow } from "tvml-react/native";

import { AlbumDetail } from "./AlbumDetail";
import { ALBUMS, artwork } from "./data";

// Uses the native list view from the TVMLReactExtras Swift package.
export function NativeList() {
  const now = useClock();
  const navigation = useNavigation();
  // A clock is worth keeping on screen: no screensaver while this tab is open.
  useKeepAwake();

  return (
    <SimplifiedList summary={`It's ${now}`} style={{ width: 1920, height: 880, tvPosition: "bottom" }}>
      {ALBUMS.map((album, index) => (
        <SimplifiedListRow
          key={album.id}
          title={`${String(index + 1).padStart(2, "0")} · ${album.title}`}
          subtitle={album.artist}
          accessory={String(album.year)}
          image={artwork(album)}
          onSelect={() => navigation.push(<AlbumDetail album={album} />)}
        />
      ))}
    </SimplifiedList>
  );
}

function useClock() {
  const format = () => new Date().toLocaleTimeString();
  const [time, setTime] = useState(format);
  useEffect(() => {
    const id = setInterval(() => setTime(format()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}
