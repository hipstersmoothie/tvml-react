export const ALBUMS = [
  { id: "blue", title: "Kind of Blue", artist: "Miles Davis", year: 1959 },
  { id: "rumours", title: "Rumours", artist: "Fleetwood Mac", year: 1977 },
  { id: "dummy", title: "Dummy", artist: "Portishead", year: 1994 },
  { id: "ok", title: "OK Computer", artist: "Radiohead", year: 1997 },
  { id: "vespertine", title: "Vespertine", artist: "Björk", year: 2001 },
  { id: "currents", title: "Currents", artist: "Tame Impala", year: 2015 },
];

export type Album = (typeof ALBUMS)[number];

export const artwork = (album: Album) => `https://picsum.photos/seed/${album.id}/400/400`;

// Apple's public HLS test stream.
export const SAMPLE_STREAM =
  "https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_ts/master.m3u8";
