import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import {
  launch,
  PlayerOverlay,
  PlayerProvider,
  useNavigation,
  usePlayer,
  usePlayerControls,
  usePlayerEvent,
  usePlayerState,
  type ItemEndEvent,
  type Navigation,
  type PlayerActions,
  type TVMLRoot,
} from "../src/index.js";
import { FakeDocument, installTVJSGlobals } from "./fake-dom.js";

const scope = globalThis as Record<string, unknown>;

class FakePlayer {
  static instances: Array<FakePlayer> = [];
  listeners = new Map<string, (event: Record<string, unknown>) => void>();
  playlist: unknown;
  currentMediaItem: { url: string } | undefined;
  currentMediaItemDuration = 60;
  overlayDocument?: FakeDocument;
  present = vi.fn();
  play = vi.fn();
  stop = vi.fn();
  pause = vi.fn();
  seekToTime = vi.fn();
  changeToMediaAtIndex = vi.fn();
  constructor() {
    FakePlayer.instances.push(this);
  }
  addEventListener(type: string, fn: (event: Record<string, unknown>) => void) {
    this.listeners.set(type, fn);
  }
  removeEventListener() {}
  emit(type: string, event: Record<string, unknown> = {}) {
    this.listeners.get(type)?.(event);
  }
}

let globals: ReturnType<typeof installTVJSGlobals>;
beforeAll(() => {
  globals = installTVJSGlobals();
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
  scope.MediaItemChangeReason = { PLAYED_TO_END: 1, ERRORED: 4, USER_INITIATED: 6 };
});
afterAll(() => {
  globals.restore();
  for (const key of ["Player", "Playlist", "MediaItem", "MediaItemChangeReason"]) delete scope[key];
});

const roots: Array<TVMLRoot> = [];
afterEach(() => {
  for (const root of roots.splice(0)) root.unmount();
  globals.navigation.clear();
  FakePlayer.instances = [];
});

const flush = async () => {
  for (let i = 0; i < 5; i++) await new Promise((resolve) => setTimeout(resolve, 0));
};

function mount(element: React.ReactNode, onItemEnd?: (event: ItemEndEvent) => void) {
  const root = launch(element, {
    wrapper: ({ children }) => <PlayerProvider onItemEnd={onItemEnd}>{children}</PlayerProvider>,
  })!;
  roots.push(root);
  return root;
}

describe("PlayerProvider", () => {
  it("shares one player across screens", async () => {
    let controls!: PlayerActions;
    let navigation!: Navigation;
    let homeTitle = "";

    function Home() {
      navigation = useNavigation();
      homeTitle = usePlayerState((s) => s.currentItem?.title ?? "");
      return <stackTemplate />;
    }
    function Detail() {
      controls = usePlayerControls();
      return <alertTemplate />;
    }

    mount(<Home />);
    navigation.push(<Detail />);
    await flush();

    controls.play({ url: "a", title: "Episode 1" });
    await flush();
    expect(FakePlayer.instances).toHaveLength(1);
    expect(homeTitle).toBe("Episode 1");
  });

  it("re-renders selectors only when the selected value changes", async () => {
    const renders = { time: 0, playing: 0 };
    let controls!: PlayerActions;

    function Time() {
      usePlayerState((s) => s.currentTime);
      renders.time++;
      return null;
    }
    function Playing() {
      usePlayerState((s) => s.state === "playing");
      renders.playing++;
      return null;
    }
    function Grab() {
      controls = usePlayerControls();
      return null;
    }

    mount(
      <stackTemplate>
        <Time />
        <Playing />
        <Grab />
      </stackTemplate>,
    );
    controls.play({ url: "a" });
    const player = FakePlayer.instances[0];
    player.emit("stateDidChange", { state: "playing" });
    await flush();
    const before = { ...renders };

    for (const time of [1, 2, 3]) {
      player.emit("timeDidChange", { time });
      await flush();
    }
    expect(renders.time).toBe(before.time + 3);
    expect(renders.playing).toBe(before.playing);
  });

  it("reports itemEnd with the last position and why", async () => {
    const ends: Array<ItemEndEvent> = [];
    const fromHook: Array<ItemEndEvent> = [];
    let controls!: PlayerActions;

    function Screen() {
      controls = usePlayerControls();
      usePlayerEvent("itemEnd", (event) => fromHook.push(event));
      return <stackTemplate />;
    }
    mount(<Screen />, (event) => ends.push(event));
    await flush();

    controls.play({ url: "a", title: "A" });
    const player = FakePlayer.instances[0];
    player.emit("stateDidChange", { state: "playing" });
    player.emit("timeDidChange", { time: 42 });
    player.emit("mediaItemWillChange", { reason: 1 });
    // Only reported once per item, even if more end signals follow.
    player.emit("stateDidChange", { state: "end" });

    expect(ends).toEqual([
      { item: { url: "a", title: "A" }, time: 42, duration: 60, reason: "playedToEnd" },
    ]);
    expect(fromHook).toEqual(ends);

    controls.play({ url: "b" });
    player.emit("timeDidChange", { time: 7 });
    controls.stop();
    expect(ends.at(-1)).toMatchObject({ time: 7, reason: "stopped" });
  });

  it("flags live streams and finds the shared player for overlays", async () => {
    let controls!: PlayerActions;
    let live = false;
    function Screen() {
      controls = usePlayerControls();
      live = usePlayerState((s) => s.isLive);
      return (
        <stackTemplate>
          <PlayerOverlay>
            <divTemplate>
              <text>chat</text>
            </divTemplate>
          </PlayerOverlay>
        </stackTemplate>
      );
    }
    mount(<Screen />);
    await flush();

    controls.play({ url: "live" });
    const player = FakePlayer.instances[0];
    player.currentMediaItemDuration = Number.NaN;
    player.emit("stateDidChange", { state: "playing" });
    await flush();
    expect(live).toBe(true);
    expect(player.overlayDocument?.toXML()).toContain("chat");
  });

  it("usePlayer uses the shared player inside a provider", async () => {
    let a!: ReturnType<typeof usePlayer>;
    let b!: ReturnType<typeof usePlayer>;
    function A() {
      a = usePlayer();
      return null;
    }
    function B() {
      b = usePlayer();
      return null;
    }
    mount(
      <stackTemplate>
        <A />
        <B />
      </stackTemplate>,
    );
    a.play({ url: "x", title: "X" });
    await flush();
    expect(b.currentItem?.title).toBe("X");
    expect(FakePlayer.instances).toHaveLength(1);
  });
});
