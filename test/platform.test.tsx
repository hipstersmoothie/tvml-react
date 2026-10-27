import { createContext, useContext, useState } from "react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import {
  createRoot,
  launch,
  useAccessibility,
  useAppState,
  useColorScheme,
  useIsScreenVisible,
  useKeepAwake,
  useLocalStorage,
  useNavigation,
  usePlayer,
  useScreenEvent,
  type Navigation,
  type PlayerControls,
  type TVMLRoot,
} from "../src/index.js";
import { FakeDocument, FakeElement, installTVJSGlobals } from "./fake-dom.js";

// --- TVJS / native globals --------------------------------------------------

const scope = globalThis as Record<string, unknown>;
const app: Record<string, ((options?: unknown) => void) | undefined> = {};
const storage = new Map<string, string>();
const nativeBridge = {
  state: {
    colorScheme: "dark",
    accessibility: { reduceMotion: false, voiceOver: false },
  } as Record<string, unknown>,
  onChange: null as (() => void) | null,
  setIdleTimerDisabled: vi.fn(),
};

class FakePlayer {
  static last: FakePlayer;
  listeners = new Map<string, (event: Record<string, unknown>) => void>();
  playlist: { items: Array<{ url: string; title?: string }> } | undefined;
  currentMediaItem: { url: string } | undefined;
  currentMediaItemDuration = 120;
  present = vi.fn();
  play = vi.fn();
  pause = vi.fn();
  stop = vi.fn();
  seekToTime = vi.fn();
  changeToMediaAtIndex = vi.fn();
  constructor() {
    FakePlayer.last = this;
  }
  addEventListener(type: string, listener: (event: Record<string, unknown>) => void) {
    this.listeners.set(type, listener);
  }
  removeEventListener() {}
  emit(type: string, event: Record<string, unknown> = {}) {
    this.listeners.get(type)?.(event);
  }
}

let globals: ReturnType<typeof installTVJSGlobals>;

beforeAll(() => {
  globals = installTVJSGlobals();
  scope.App = app;
  scope.TVMLReactNative = nativeBridge;
  scope.localStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => void storage.set(key, value),
    removeItem: (key: string) => void storage.delete(key),
  };
  scope.Player = FakePlayer;
  scope.Playlist = class {
    items: Array<unknown> = [];
    push(item: unknown) {
      this.items.push(item);
    }
  };
  scope.MediaItem = class {
    constructor(
      public type: string,
      public url: string,
    ) {}
  };
});

afterAll(() => {
  globals.restore();
  for (const key of ["App", "TVMLReactNative", "localStorage", "Player", "Playlist", "MediaItem"]) {
    delete scope[key];
  }
});

const roots: Array<TVMLRoot> = [];
afterEach(() => {
  for (const root of roots.splice(0)) root.unmount();
  globals.navigation.clear();
  storage.clear();
});

// Let React's scheduler commit and run passive effects (several macrotasks).
const flush = async () => {
  for (let i = 0; i < 5; i++) await new Promise((resolve) => setTimeout(resolve, 0));
};

function mount(element: React.ReactNode, options?: Parameters<typeof launch>[1]) {
  const root = launch(element, options);
  if (!root) throw new Error("launch failed");
  roots.push(root);
  return root.document as FakeDocument;
}

function text(doc: FakeDocument, id: string): string | null {
  return (doc.getElementById(id) as FakeElement | null)?.textContent ?? null;
}

// --- Navigation ----------------------------------------------------------------

describe("useNavigation", () => {
  const Theme = createContext("default");

  it("pushes screens that share context and unmount when popped", async () => {
    let navigation!: Navigation;
    const unmounted = vi.fn();

    function Detail() {
      const theme = useContext(Theme);
      useScreenEvent("unload", unmounted);
      return (
        <alertTemplate>
          <title id="detail">{`detail in ${theme}`}</title>
        </alertTemplate>
      );
    }

    function Home() {
      navigation = useNavigation();
      return (
        <stackTemplate>
          <title id="home">home</title>
        </stackTemplate>
      );
    }

    // Providers in `wrapper` reach every screen, including pushed ones.
    const home = mount(<Home />, {
      wrapper: ({ children }) => <Theme.Provider value="blue">{children}</Theme.Provider>,
    });
    expect(globals.navigation.documents).toHaveLength(1);

    navigation.push(<Detail />);
    await flush();

    // Presented only after its content was committed.
    expect(globals.navigation.documents).toHaveLength(2);
    const detail = globals.navigation.documents[1] as FakeDocument;
    expect(text(detail, "detail")).toBe("detail in blue");
    expect(text(home, "home")).toBe("home");

    // Menu button / pop: TVMLKit unloads the document and the screen unmounts.
    navigation.pop();
    await flush();
    expect(unmounted).toHaveBeenCalledTimes(1);
    expect(globals.navigation.documents).toHaveLength(1);
    expect(detail.toXML()).toBe("");
  });

  it("presents and dismisses modals", async () => {
    let navigation!: Navigation;
    function Home() {
      navigation = useNavigation();
      return <stackTemplate />;
    }
    mount(<Home />);

    navigation.presentModal(
      <alertTemplate>
        <title id="modal">sure?</title>
      </alertTemplate>,
    );
    await flush();
    const modal = globals.navigation.modal as FakeDocument;
    expect(text(modal, "modal")).toBe("sure?");

    navigation.dismissModal();
    await flush();
    expect(modal.toXML()).toBe("");
  });

  it("delegates events inside pushed screens", async () => {
    let navigation!: Navigation;
    const onSelect = vi.fn();
    function Home() {
      navigation = useNavigation();
      return <stackTemplate />;
    }
    mount(<Home />);

    navigation.push(
      <alertTemplate>
        <button id="ok" onSelect={onSelect} />
      </alertTemplate>,
    );
    await flush();
    const detail = globals.navigation.documents[1] as FakeDocument;
    detail.dispatch("select", detail.getElementById("ok")!);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});

// --- Screens -----------------------------------------------------------------------

describe("screen hooks", () => {
  it("tracks whether a screen is visible", async () => {
    let navigation!: Navigation;
    function Home() {
      navigation = useNavigation();
      const visible = useIsScreenVisible();
      return (
        <stackTemplate>
          <title id="visible">{String(visible)}</title>
        </stackTemplate>
      );
    }
    const home = mount(<Home />);
    await flush();
    expect(text(home, "visible")).toBe("true");

    navigation.push(<alertTemplate />);
    await flush();
    expect(text(home, "visible")).toBe("false");

    navigation.pop();
    await flush();
    expect(text(home, "visible")).toBe("true");
  });
});

// --- Platform ------------------------------------------------------------------------

describe("useAppState", () => {
  it("follows App.onSuspend / onResume and keeps existing handlers", async () => {
    const previous = vi.fn();
    app.onSuspend = previous;

    function State() {
      return (
        <stackTemplate>
          <title id="state">{useAppState()}</title>
        </stackTemplate>
      );
    }
    const doc = mount(<State />);
    expect(text(doc, "state")).toBe("active");

    app.onSuspend?.();
    await flush();
    expect(text(doc, "state")).toBe("background");
    expect(previous).toHaveBeenCalled();

    app.onResume?.();
    await flush();
    expect(text(doc, "state")).toBe("active");
  });
});

describe("useLocalStorage", () => {
  it("persists JSON and syncs components using the same key", async () => {
    let setCount!: (n: number | ((n: number) => number)) => void;
    function Writer() {
      const [count, set] = useLocalStorage("count", 0);
      setCount = set;
      return <title id="a">{String(count)}</title>;
    }
    function Reader() {
      const [count] = useLocalStorage("count", 0);
      return <title id="b">{String(count)}</title>;
    }
    const doc = mount(
      <stackTemplate>
        <Writer />
        <Reader />
      </stackTemplate>,
    );
    expect(text(doc, "a")).toBe("0");

    setCount((n) => n + 5);
    await flush();
    expect(storage.get("count")).toBe("5");
    expect(text(doc, "a")).toBe("5");
    expect(text(doc, "b")).toBe("5");
  });
});

describe("onTextChange", () => {
  it("hooks the element's keyboard once mounted", () => {
    const doc = new FakeDocument();
    const keyboard: { text: string; onTextChange?: () => void } = { text: "" };
    const original = doc.createElement.bind(doc);
    doc.createElement = (tag: string) => {
      const element = original(tag);
      if (tag === "searchField") element.features.Keyboard = keyboard;
      return element;
    };
    const onTextChange = vi.fn();

    const root = createRoot(doc);
    roots.push(root);
    root.render(
      <searchTemplate>
        <searchField onTextChange={onTextChange} />
      </searchTemplate>,
    );

    keyboard.text = "miles";
    keyboard.onTextChange?.();
    expect(onTextChange).toHaveBeenCalledWith("miles");
  });
});

// --- Native bridge -----------------------------------------------------------------

describe("native bridge hooks", () => {
  it("read state and re-render on onChange", async () => {
    function Native() {
      const scheme = useColorScheme();
      const { reduceMotion } = useAccessibility();
      return <title id="native">{`${scheme} ${reduceMotion}`}</title>;
    }
    const doc = mount(
      <stackTemplate>
        <Native />
      </stackTemplate>,
    );
    expect(text(doc, "native")).toBe("dark false");

    nativeBridge.state = {
      colorScheme: "light",
      accessibility: { reduceMotion: true, voiceOver: false },
    };
    nativeBridge.onChange?.();
    await flush();
    expect(text(doc, "native")).toBe("light true");
  });

  it("keeps the screen awake while any user is mounted", async () => {
    nativeBridge.setIdleTimerDisabled.mockClear();
    let setShown!: (shown: boolean) => void;
    function Awake() {
      useKeepAwake();
      return null;
    }
    function Host() {
      const [shown, set] = useState(true);
      setShown = set;
      return (
        <stackTemplate>
          {shown && <Awake />}
          <Awake />
        </stackTemplate>
      );
    }
    const root = createRoot(new FakeDocument());
    roots.push(root);
    root.render(<Host />);
    await flush();
    expect(nativeBridge.setIdleTimerDisabled.mock.calls).toEqual([[true]]);

    setShown(false);
    await flush();
    expect(nativeBridge.setIdleTimerDisabled.mock.calls).toEqual([[true]]);

    root.unmount();
    roots.pop();
    expect(nativeBridge.setIdleTimerDisabled.mock.calls).toEqual([[true], [false]]);
  });
});

// --- Player ---------------------------------------------------------------------------

describe("usePlayer", () => {
  it("presents a playlist and mirrors player events into state", async () => {
    let player!: PlayerControls;
    function Video() {
      player = usePlayer();
      return <title id="player">{`${player.state} ${player.currentTime}`}</title>;
    }
    const doc = mount(
      <stackTemplate>
        <Video />
      </stackTemplate>,
    );

    player.play({ url: "https://example.com/a.m3u8", title: "A" });
    const fake = FakePlayer.last;
    expect(fake.present).toHaveBeenCalled();
    expect(fake.play).toHaveBeenCalled();

    fake.emit("stateDidChange", { state: "playing" });
    fake.emit("timeDidChange", { time: 42 });
    await flush();
    expect(text(doc, "player")).toBe("playing 42");
    expect(player.duration).toBe(120);
  });
});
