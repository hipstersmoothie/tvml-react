import { useEffect, useState } from "react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { createFetch, AbortControllerPolyfill } from "../src/fetch.js";
import {
  createRoot,
  DocumentPortal,
  launch,
  MenuBar,
  MenuBarItem,
  useIsScreenVisible,
  useMenuBar,
  useNavigation,
  PlayerOverlay,
  usePlayer,
  type Navigation,
  type PlayerControls,
  type TVMLDocument,
  type TVMLRoot,
} from "../src/index.js";
import { FakeDocument, FakeElement, installTVJSGlobals } from "./fake-dom.js";

let globals: ReturnType<typeof installTVJSGlobals>;
const scope = globalThis as Record<string, unknown>;

beforeAll(() => {
  globals = installTVJSGlobals();
});
afterAll(() => globals.restore());

const roots: Array<TVMLRoot> = [];
afterEach(() => {
  for (const root of roots.splice(0)) root.unmount();
  globals.navigation.clear();
});

const flush = async () => {
  for (let i = 0; i < 5; i++) await new Promise((resolve) => setTimeout(resolve, 0));
};

function mount(element: React.ReactNode) {
  const root = launch(element)!;
  roots.push(root);
  return root.document as FakeDocument;
}

const text = (doc: TVMLDocument, id: string) =>
  (doc.getElementById(id) as FakeElement | null)?.textContent ?? null;

// --- DocumentPortal ---------------------------------------------------------

describe("DocumentPortal", () => {
  it("wires events and screen context into another document", async () => {
    const onSelect = vi.fn();
    let portalDoc: FakeDocument | undefined;

    function Overlay() {
      const visible = useIsScreenVisible();
      return (
        <alertTemplate>
          <button id="b" onSelect={onSelect}>
            <text id="v">{String(visible)}</text>
          </button>
        </alertTemplate>
      );
    }

    mount(
      <stackTemplate>
        <DocumentPortal onReady={(doc) => (portalDoc = doc as FakeDocument)}>
          <Overlay />
        </DocumentPortal>
      </stackTemplate>,
    );

    expect(portalDoc).toBeDefined();
    portalDoc!.dispatch("select", portalDoc!.getElementById("b")!);
    expect(onSelect).toHaveBeenCalledTimes(1);

    // Visibility follows the portal's own document, not the root.
    expect(text(portalDoc!, "v")).toBe("false");
    portalDoc!.dispatch("appear");
    await flush();
    expect(text(portalDoc!, "v")).toBe("true");
  });
});

// --- MenuBar -----------------------------------------------------------------

describe("MenuBar", () => {
  function menuBarFeature(doc: FakeDocument) {
    const attached = new Map<FakeElement, TVMLDocument>();
    const feature = {
      getDocument: (item: FakeElement) => attached.get(item),
      setDocument: vi.fn((tab: TVMLDocument, item: FakeElement) => void attached.set(item, tab)),
      setSelectedItem: vi.fn((item: FakeElement) => doc.dispatch("select", item)),
    };
    const create = doc.createElement.bind(doc);
    doc.createElement = (tag: string) => {
      const element = create(tag);
      if (tag === "menuBar") element.features.MenuBarDocument = feature;
      return element;
    };
    return { feature, attached };
  }

  it("attaches each tab's document lazily and switches on select", async () => {
    const doc = new FakeDocument();
    const { feature, attached } = menuBarFeature(doc);
    let menu!: ReturnType<typeof useMenuBar>;
    const mounted = vi.fn();

    function Search() {
      useEffect(() => mounted(), []);
      return (
        <searchTemplate>
          <title id="search">search</title>
        </searchTemplate>
      );
    }
    function Grab() {
      menu = useMenuBar();
      return null;
    }

    const root = createRoot(doc);
    roots.push(root);
    root.render(
      <menuBarTemplate>
        <MenuBar>
          <MenuBarItem id="home" title="Home">
            <stackTemplate>
              <title id="home">home</title>
            </stackTemplate>
          </MenuBarItem>
          <MenuBarItem id="search" title="Search">
            <Search />
            <Grab />
          </MenuBarItem>
        </MenuBar>
      </menuBarTemplate>,
    );

    expect(feature.setDocument).toHaveBeenCalledTimes(1);
    const [homeDoc] = feature.setDocument.mock.calls[0];
    expect(text(homeDoc, "home")).toBe("home");
    expect(mounted).not.toHaveBeenCalled();

    // Focus landing on the Search item: TVMLKit fires select on it.
    const items = doc.documentElement.children[0].children[0].children.filter(
      (c) => c.tagName === "menuItem",
    );
    doc.dispatch("select", items[1]);
    await flush();
    expect(mounted).toHaveBeenCalledTimes(1);
    const searchDoc = attached.get(items[1])!;
    expect(text(searchDoc, "search")).toBe("search");

    // From code.
    menu.select("home");
    await flush();
    expect(feature.setSelectedItem).toHaveBeenCalledWith(items[0]);
    expect(menu.selected).toBe("home");
  });
});

// --- Navigation fixes ----------------------------------------------------------

describe("error boundaries", () => {
  it("keeps a crash inside the screen that threw", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    let navigation!: Navigation;
    function Home() {
      navigation = useNavigation();
      return (
        <stackTemplate>
          <title id="home">home</title>
        </stackTemplate>
      );
    }
    function Broken(): never {
      throw new Error("detail exploded");
    }
    const home = mount(<Home />);
    navigation.push(<Broken />);
    await flush();

    expect(text(home, "home")).toBe("home");
    const detail = globals.navigation.documents[1] as FakeDocument;
    expect(detail.toXML()).toContain("detail exploded");
    expect(detail.toXML()).toContain("Try Again");
    error.mockRestore();
  });
});

describe("navigation", () => {
  it("marks pushed screens visible as soon as they're presented", async () => {
    let navigation!: Navigation;
    const seen: Array<boolean> = [];
    function Detail() {
      const visible = useIsScreenVisible();
      seen.push(visible);
      return <alertTemplate />;
    }
    function Home() {
      navigation = useNavigation();
      return <stackTemplate />;
    }
    mount(<Home />);
    navigation.push(<Detail />);
    await flush();
    expect(seen.at(-1)).toBe(true);
  });

  it("stops rendering the root screen once replace() unloads it", async () => {
    let navigation!: Navigation;
    const cleanup = vi.fn();
    function Home() {
      navigation = useNavigation();
      useEffect(() => cleanup, []);
      return <stackTemplate />;
    }
    mount(<Home />);
    // Our fake replaceDocument doesn't fire unload; do what TVMLKit does.
    const rootDoc = globals.navigation.documents[0] as FakeDocument;
    navigation.replace(<alertTemplate />);
    await flush();
    rootDoc.dispatch("unload");
    await flush();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});

// --- Host config ----------------------------------------------------------------

describe("host config", () => {
  it("serializes srcset objects and warns about commas", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const doc = new FakeDocument();
    const root = createRoot(doc);
    roots.push(root);
    root.render(
      <stackTemplate>
        <img id="a" srcset={{ "1x": "https://x/a.jpg", "2x": "https://x/a@2x.jpg" }} />
        <img id="b" srcset={{ "1x": "https://x/!300,300/a.jpg" }} />
      </stackTemplate>,
    );
    expect(doc.getElementById("a")!.getAttribute("srcset")).toBe(
      "https://x/a.jpg 1x, https://x/a@2x.jpg 2x",
    );
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it("doesn't read attributes back on new elements, or rewrite equal styles", () => {
    const doc = new FakeDocument();
    let reads = 0;
    const create = doc.createElement.bind(doc);
    doc.createElement = (tag: string) => {
      const element = create(tag);
      const get = element.getAttribute.bind(element);
      element.getAttribute = (name: string) => {
        reads++;
        return get(name);
      };
      return element;
    };
    const root = createRoot(doc);
    roots.push(root);
    const tree = () => (
      <stackTemplate>
        <title id="t" style={{ color: "white", fontSize: 30 }}>
          x
        </title>
      </stackTemplate>
    );
    root.render(tree());
    expect(reads).toBe(0);
    root.render(tree());
    expect(reads).toBe(0);
  });

  it("commits handler updates synchronously and restores a rejected keystroke", () => {
    const doc = new FakeDocument();
    const keyboard: { text: string | null; onTextChange?: () => void } = { text: null };
    const create = doc.createElement.bind(doc);
    doc.createElement = (tag: string) => {
      const element = create(tag);
      if (tag === "textField") element.features.Keyboard = keyboard;
      return element;
    };
    function Pin() {
      const [pin, setPin] = useState("");
      return (
        <formTemplate>
          <textField value={pin} onTextChange={(t) => setPin(t.replace(/\D/g, "").slice(0, 4))}>
            PIN
          </textField>
          <text id="pin">{`pin:${pin}`}</text>
        </formTemplate>
      );
    }
    const root = createRoot(doc);
    roots.push(root);
    root.render(<Pin />);

    keyboard.text = "25a8";
    keyboard.onTextChange?.();
    // Committed before onTextChange returned; the field shows the filtered text.
    expect(text(doc, "pin")).toBe("pin:258");
    expect(keyboard.text).toBe("258");

    keyboard.text = "2580";
    keyboard.onTextChange?.();
    keyboard.text = "25809";
    keyboard.onTextChange?.();
    // State didn't change (still "2580"), but the extra digit is removed.
    expect(keyboard.text).toBe("2580");
  });

  it("supports value, defaultValue and onChange", () => {
    const doc = new FakeDocument();
    const keyboards: Array<{ text: string | null }> = [];
    const create = doc.createElement.bind(doc);
    doc.createElement = (tag: string) => {
      const element = create(tag);
      if (tag === "textField") {
        const keyboard = { text: null };
        keyboards.push(keyboard);
        element.features.Keyboard = keyboard;
      }
      return element;
    };
    const onChange = vi.fn();
    const root = createRoot(doc);
    roots.push(root);
    const tree = (value: string) => (
      <formTemplate>
        <textField defaultValue="Ada">Name</textField>
        <textField value={value}>Email</textField>
        <ratingBadge id="r" onChange={onChange} />
      </formTemplate>
    );
    root.render(tree("a@b.c"));
    expect(keyboards.map((k) => k.text)).toEqual(["Ada", "a@b.c"]);

    root.render(tree("new@b.c"));
    expect(keyboards[1].text).toBe("new@b.c");

    doc.dispatch("change", doc.getElementById("r")!);
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

// --- Player -------------------------------------------------------------------------

describe("usePlayer", () => {
  class FakePlayer {
    static last: FakePlayer;
    listeners = new Map<string, (event: Record<string, unknown>) => void>();
    playlist: unknown;
    currentMediaItem: { url: string } | undefined;
    currentMediaItemDuration = 60;
    present = vi.fn();
    play = vi.fn();
    stop = vi.fn();
    pause = vi.fn();
    seekToTime = vi.fn();
    changeToMediaAtIndex = vi.fn();
    constructor() {
      FakePlayer.last = this;
    }
    addEventListener(type: string, fn: (event: Record<string, unknown>) => void) {
      this.listeners.set(type, fn);
    }
    removeEventListener() {}
    emit(type: string, event: Record<string, unknown> = {}) {
      this.listeners.get(type)?.(event);
    }
  }

  beforeAll(() => {
    scope.Player = FakePlayer;
    scope.Playlist = class {
      push() {}
    };
    scope.MediaItem = class {
      constructor(
        public type: string,
        public url: string,
      ) {}
    };
    scope.MediaItemChangeReason = { ERRORED: 4 };
  });
  afterAll(() => {
    for (const key of ["Player", "Playlist", "MediaItem", "MediaItemChangeReason"]) delete scope[key];
  });

  it("assigns an overlay mounted before play() once the player is presented", async () => {
    let player!: PlayerControls;
    function Screen() {
      player = usePlayer();
      return (
        <stackTemplate>
          <title id="state">{player.state}</title>
          <PlayerOverlay player={player}>
            <divTemplate>
              <text>now playing</text>
            </divTemplate>
          </PlayerOverlay>
        </stackTemplate>
      );
    }
    const doc = mount(<Screen />);
    await flush();
    // Mounting the overlay doesn't create the player or change its state.
    expect(text(doc, "state")).toBe("idle");

    player.play({ url: "u" });
    const fake = FakePlayer.last as unknown as FakePlayer & { overlayDocument?: FakeDocument };
    expect(fake.present).toHaveBeenCalled();
    // Assigned once playback is underway, when TVMLKit reliably shows it.
    expect(fake.overlayDocument).toBeUndefined();
    fake.emit("stateDidChange", { state: "playing" });
    expect(fake.overlayDocument?.toXML()).toContain("now playing");
  });

  it("ignores the state a new Player reports before play()", async () => {
    let player!: PlayerControls;
    function Screen() {
      player = usePlayer();
      return <title>{player.state}</title>;
    }
    mount(
      <stackTemplate>
        <Screen />
      </stackTemplate>,
    );
    player.nativePlayer();
    FakePlayer.last.emit("stateDidChange", { state: "begin" });
    await flush();
    expect(player.state).toBe("idle");
  });

  it("seeks to startTime, keeps the last time on stop, and reports errors", async () => {
    let player!: PlayerControls;
    function Video() {
      player = usePlayer();
      const [, force] = useState(0);
      void force;
      return <title>{String(player.currentTime)}</title>;
    }
    mount(
      <stackTemplate>
        <Video />
      </stackTemplate>,
    );

    player.play({ url: "u", startTime: 42 });
    const fake = FakePlayer.last;
    fake.emit("timeDidChange", { time: 0.5 });
    fake.emit("stateDidChange", { state: "playing" });
    expect(fake.seekToTime).toHaveBeenCalledWith(42);
    await flush();
    // The moment before the seek landed isn't reported.
    expect(player.currentTime).toBe(42);

    fake.emit("timeDidChange", { time: 50 });
    fake.currentMediaItem = undefined;
    fake.emit("mediaItemDidChange");
    fake.emit("timeDidChange", { time: 0 });
    fake.emit("mediaItemWillChange", { reason: 4 });
    await flush();
    expect(player.currentTime).toBe(50);
    expect(player.error).toBe(true);
  });
});

// --- fetch polyfill ----------------------------------------------------------------

describe("fetch polyfill", () => {
  class FakeXHR {
    static respond: (xhr: FakeXHR) => void;
    status = 0;
    statusText = "";
    responseText = "";
    readyState = 0;
    method = "";
    url = "";
    headers: Record<string, string> = {};
    body: string | null = null;
    aborted = false;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    open(method: string, url: string) {
      this.method = method;
      this.url = url;
    }
    setRequestHeader(name: string, value: string) {
      this.headers[name] = value;
    }
    getAllResponseHeaders() {
      return "content-type: application/json\r\nx-count: 2";
    }
    send(body: string | null) {
      this.body = body;
      setTimeout(() => FakeXHR.respond(this), 0);
    }
    abort() {
      this.aborted = true;
    }
  }
  const fetch = createFetch(FakeXHR);

  it("resolves JSON responses with headers", async () => {
    FakeXHR.respond = (xhr) => {
      xhr.status = 200;
      xhr.responseText = '{"ok":true}';
      xhr.onload?.();
    };
    const response = await fetch("https://api/x", {
      method: "post",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    expect(response.ok).toBe(true);
    expect(response.headers.get("X-Count")).toBe("2");
    expect(await response.json()).toEqual({ ok: true });
  });

  it("treats TVJS's onerror-with-status as an HTTP response, not a network error", async () => {
    FakeXHR.respond = (xhr) => {
      xhr.status = 404;
      xhr.responseText = "not found";
      xhr.onerror?.();
    };
    const response = await fetch("https://api/missing");
    expect(response.status).toBe(404);
    expect(response.ok).toBe(false);
  });

  it("rejects network errors and aborts", async () => {
    FakeXHR.respond = (xhr) => xhr.onerror?.();
    await expect(fetch("https://down")).rejects.toThrow(TypeError);

    FakeXHR.respond = () => {};
    const controller = new AbortControllerPolyfill();
    const pending = fetch("https://slow", { signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  });
});
