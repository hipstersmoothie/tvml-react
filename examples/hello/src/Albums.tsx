import { useState } from "react";
import { useLocalStorage, useNavigation } from "tvml-react";

import { AlbumDetail } from "./AlbumDetail";
import { ALBUMS, artwork, type Album } from "./data";
import { Search } from "./Search";

export function Albums() {
  const navigation = useNavigation();
  const [highlighted, setHighlighted] = useState<Album | null>(null);
  const [plays] = useLocalStorage<Record<string, number>>("plays", {});

  return (
    <collectionList style={{ padding: "240 0 0 0" }}>
      <shelf style={{ padding: "0 90 0 90", tvInteritemSpacing: 48 }}>
        <header>
          <title style={{ color: "white", fontSize: 38 }}>
            {highlighted ? `${highlighted.title} — ${highlighted.artist}` : "Pick a record"}
          </title>
        </header>
        <section>
          {ALBUMS.map((album) => (
            <lockup
              key={album.id}
              onSelect={() => navigation.push(<AlbumDetail album={album} />)}
              onHighlight={() => setHighlighted(album)}
            >
              <img src={artwork(album)} width={250} height={250} />
              <title style={{ color: "white" }}>{album.title}</title>
              <subtitle style={{ color: "rgba(255, 255, 255, 0.6)" }}>
                {plays[album.id] ? `${plays[album.id]} plays` : album.artist}
              </subtitle>
            </lockup>
          ))}
          <lockup onSelect={() => navigation.push(<Search />)}>
            <img src="symbol://magnifyingglass" width={250} height={250} />
            <title style={{ color: "white" }}>Search</title>
          </lockup>
        </section>
      </shelf>
    </collectionList>
  );
}
