import { useState } from "react";
import { useNavigation } from "tvml-react";

import { AlbumDetail } from "./AlbumDetail";
import { ALBUMS, artwork } from "./data";

export function Search() {
  const navigation = useNavigation();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const results = ALBUMS.filter(
    (album) =>
      !q || album.title.toLowerCase().includes(q) || album.artist.toLowerCase().includes(q),
  );

  return (
    <searchTemplate theme="dark">
      <searchField onTextChange={setQuery} />
      <collectionList>
        <shelf>
          <header>
            <title>{q ? `${results.length} results for “${query}”` : "All albums"}</title>
          </header>
          <section>
            {results.map((album) => (
              <lockup key={album.id} onSelect={() => navigation.push(<AlbumDetail album={album} />)}>
                <img src={artwork(album)} width={250} height={250} />
                <title>{album.title}</title>
              </lockup>
            ))}
          </section>
        </shelf>
      </collectionList>
    </searchTemplate>
  );
}
