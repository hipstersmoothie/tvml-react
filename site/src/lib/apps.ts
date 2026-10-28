// The example apps in the repo's examples/ folder, for the Examples page.

export interface ExampleApp {
  /** Folder in examples/. */
  slug: string;
  name: string;
  pitch: string;
  /** What it shows, briefly. */
  highlights: Array<string>;
  /** tvml-react APIs it uses: [label, reference page] */
  apis: Array<[string, string]>;
  /** Screenshot in public/apps. */
  image: string;
  port: number;
}

export const apps: Array<ExampleApp> = [
  {
    slug: "streamplace",
    name: "stream.place",
    pitch: "Live streams from the AT Protocol, with live chat over the video.",
    highlights: [
      "A “Live now” shelf that refreshes every 30 seconds, only while you're looking at it",
      "Stream pages with chat that streams in over a WebSocket",
      "Live HLS in the system player, with the chat drawn over the video",
    ],
    apis: [
      ["usePlayer", "/reference/use-player/"],
      ["PlayerOverlay", "/reference/player-overlay/"],
      ["WebSocket", "/reference/globals/"],
      ["useScreenQuery", "/reference/use-screen-query/"],
      ["useKeepAwake", "/reference/use-keep-awake/"],
    ],
    image: "streamplace.jpg",
    port: 9101,
  },
  {
    slug: "podcasts",
    name: "Podcasts",
    pitch: "Browse Apple's charts, search, subscribe, and pick up where you left off.",
    highlights: [
      "Continue Listening, with progress bars on each episode",
      "RSS feeds parsed on the TV, and search as you type",
      "One player for the whole app, resuming each episode where you stopped",
      "Long-press an episode for more actions",
    ],
    apis: [
      ["PlayerProvider", "/reference/player-provider/"],
      ["usePlayer", "/reference/use-player/"],
      ["useLocalStorage", "/reference/use-local-storage/"],
      ["parseDocument", "/reference/dom/"],
      ["onHoldSelect", "/reference/events/"],
    ],
    image: "podcasts.jpg",
    port: 9102,
  },
  {
    slug: "tv-shows",
    name: "TV Shows",
    pitch: "A TV catalog from TVMaze: tonight's schedule, what's popular, and search.",
    highlights: [
      "Tonight, Popular and Search tabs in the system tab bar",
      "A catalog of categories beside a grid of posters",
      "Show, season and episode screens, three levels deep",
    ],
    apis: [
      ["MenuBar", "/reference/menu-bar/"],
      ["useNavigation", "/reference/use-navigation/"],
      ["useScreenQuery", "/reference/use-screen-query/"],
    ],
    image: "tv-shows.jpg",
    port: 9103,
  },
  {
    slug: "gallery",
    name: "Art Gallery",
    pitch: "The Art Institute of Chicago's public-domain collection, on your TV.",
    highlights: [
      "An endless grid of highlights, and collections by department",
      "A one-up viewer to swipe through artworks",
      "An ambient slideshow that keeps the screen awake",
      "Favorites with a long press",
    ],
    apis: [
      ["MenuBar", "/reference/menu-bar/"],
      ["useScreenInfiniteQuery", "/reference/use-screen-query/"],
      ["tvml-react/layout", "/reference/screen/"],
      ["useKeepAwake", "/reference/use-keep-awake/"],
    ],
    image: "gallery.jpg",
    port: 9105,
  },
  {
    slug: "hacker-news",
    name: "Hacker News",
    pitch: "A Hacker News reader, with threaded comments.",
    highlights: [
      "Top, New, Best, Ask and Show in a tab bar",
      "Stories in a list with a preview panel",
      "The whole comment tree, with HTML turned into TV-friendly text",
    ],
    apis: [
      ["MenuBar", "/reference/menu-bar/"],
      ["useScreenQuery", "/reference/use-screen-query/"],
      ["useNavigation", "/reference/use-navigation/"],
    ],
    image: "hacker-news.jpg",
    port: 9104,
  },
  {
    slug: "dashboard",
    name: "Dashboard",
    pitch: "An always-on living-room screen: the time, the weather, and a photo.",
    highlights: [
      "A clock and forecast laid out on a free-form screen",
      "Units and formats from the TV's region and language",
      "A photo that changes every few minutes, respecting Reduce Motion",
    ],
    apis: [
      ["tvml-react/layout", "/reference/screen/"],
      ["usePlatformSettings", "/reference/use-device/"],
      ["useAccessibility", "/reference/use-accessibility/"],
      ["useKeepAwake", "/reference/use-keep-awake/"],
    ],
    image: "dashboard.jpg",
    port: 9106,
  },
  {
    slug: "settings",
    name: "Settings",
    pitch: "Onboarding, forms and preferences for a made-up streaming service.",
    highlights: [
      "A step-by-step onboarding flow with live validation",
      "Email, PIN and name fields with matching keyboards",
      "Toggles, ratings and confirmations, saved on the device",
    ],
    apis: [
      ["useNavigation", "/reference/use-navigation/"],
      ["useLocalStorage", "/reference/use-local-storage/"],
      ["textField", "/reference/elements/"],
    ],
    image: "settings.jpg",
    port: 9107,
  },
  {
    slug: "photos",
    name: "Photos",
    pitch: "The tutorial's app: browse photos, open them, and save favorites.",
    highlights: [
      "Loading and error screens around a grid",
      "A detail screen with a Favorite button",
      "Two tabs, with favorites saved on the device",
    ],
    apis: [
      ["useScreenQuery", "/reference/use-screen-query/"],
      ["useNavigation", "/reference/use-navigation/"],
      ["useLocalStorage", "/reference/use-local-storage/"],
      ["MenuBar", "/reference/menu-bar/"],
    ],
    image: "photos.jpg",
    port: 9109,
  },
  {
    slug: "hello",
    name: "Hello",
    pitch: "A small tour: albums, search, a native list, and every platform hook.",
    highlights: [
      "Albums that open a page and play",
      "Search that filters as you type",
      "The native SimplifiedList, and live platform values",
    ],
    apis: [
      ["usePlayer", "/reference/use-player/"],
      ["SimplifiedList", "/reference/simplified-list/"],
      ["useLocalStorage", "/reference/use-local-storage/"],
    ],
    image: "hello.jpg",
    port: 9100,
  },
  {
    slug: "kitchen-sink",
    name: "Kitchen Sink",
    pitch: "Every TVML template, opened with the remote by the UI tests.",
    highlights: [
      "A screen for each of the 17 templates, plus lockups and previews",
      "The layout components and remote events, with screens to test them",
    ],
    apis: [
      ["TVML elements", "/reference/elements/"],
      ["tvml-react/layout", "/reference/screen/"],
    ],
    image: "kitchen-sink.jpg",
    port: 9108,
  },
];
