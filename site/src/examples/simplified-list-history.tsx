import { SimplifiedList, SimplifiedListRow } from "tvml-react/native";

const TRACKS = [
  { title: "So What", artist: "Miles Davis", time: "9:22" },
  { title: "Dreams", artist: "Fleetwood Mac", time: "4:14" },
  { title: "Roads", artist: "Portishead", time: "5:05" },
  { title: "Paranoid Android", artist: "Radiohead", time: "6:23" },
  { title: "Hyperballad", artist: "Björk", time: "5:21" },
  { title: "Let It Happen", artist: "Tame Impala", time: "7:46" },
];

export default function History() {
  return (
    <divTemplate>
      <SimplifiedList summary="Recently played" position="center" style={{ width: 1100, height: 800 }}>
        {TRACKS.map((track, i) => (
          <SimplifiedListRow
            key={track.title}
            title={track.title}
            subtitle={track.artist}
            accessory={track.time}
            image={`https://picsum.photos/seed/tvml-track${i}/120/120`}
          />
        ))}
      </SimplifiedList>
    </divTemplate>
  );
}
