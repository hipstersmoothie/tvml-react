import { useLocalStorage, useNavigation, usePlayer } from "tvml-react";

import { artwork, SAMPLE_STREAM, type Album } from "./data";

// Pushed with useNavigation().push(); the Menu button pops it and unmounts it.
export function AlbumDetail({ album }: { album: Album }) {
  const navigation = useNavigation();
  const player = usePlayer();
  const [plays, setPlays] = useLocalStorage<Record<string, number>>("plays", {});
  const count = plays[album.id] ?? 0;

  const play = () => {
    setPlays((p) => ({ ...p, [album.id]: (p[album.id] ?? 0) + 1 }));
    player.play({
      url: SAMPLE_STREAM,
      title: album.title,
      subtitle: album.artist,
      artworkImageURL: artwork(album),
    });
  };

  return (
    <productTemplate theme="dark">
      <banner>
        <infoList>
          <info>
            <header>
              <title>Artist</title>
            </header>
            <text>{album.artist}</text>
          </info>
          <info>
            <header>
              <title>Released</title>
            </header>
            <text>{String(album.year)}</text>
          </info>
        </infoList>
        <stack>
          <title>{album.title}</title>
          <description>
            {`Played ${count} ${count === 1 ? "time" : "times"} · player: ${player.state}`}
          </description>
          <row>
            <buttonLockup onSelect={play}>
              <badge src="resource://button-play" />
              <title>Play</title>
            </buttonLockup>
            <buttonLockup onSelect={() => navigation.pop()}>
              <badge src="resource://button-remove" />
              <title>Back</title>
            </buttonLockup>
          </row>
        </stack>
        <heroImg src={artwork(album)} />
      </banner>
    </productTemplate>
  );
}
