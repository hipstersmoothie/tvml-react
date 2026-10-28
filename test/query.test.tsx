import { QueryClient, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext } from "react";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { launch, useNavigation, type Navigation, type TVMLRoot } from "../src/index.js";
import { TVMLQueryProvider, useScreenQueries, useScreenQuery } from "../src/query.js";
import { installTVJSGlobals } from "./fake-dom.js";

const scope = globalThis as Record<string, unknown>;
const app: Record<string, ((options?: unknown) => void) | undefined> = {};
let globals: ReturnType<typeof installTVJSGlobals>;

beforeAll(() => {
  globals = installTVJSGlobals();
  scope.App = app;
});
afterAll(() => {
  globals.restore();
  delete scope.App;
});

const roots: Array<TVMLRoot> = [];
afterEach(() => {
  for (const root of roots.splice(0)) root.unmount();
  globals.navigation.clear();
});

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function mount(element: React.ReactNode, client: QueryClient) {
  const root = launch(element, {
    wrapper: ({ children }) => <TVMLQueryProvider client={client}>{children}</TVMLQueryProvider>,
  })!;
  roots.push(root);
  return root;
}

describe("tvml-react/query", () => {
  it("polls (TVJS isn't treated as a server) and refetches on app resume", async () => {
    let calls = 0;
    function Clock() {
      useScreenQuery({
        queryKey: ["clock"],
        queryFn: async () => ++calls,
        refetchInterval: 20,
      });
      return <stackTemplate />;
    }
    mount(<Clock />, new QueryClient());
    await wait(90);
    expect(calls).toBeGreaterThanOrEqual(3);

    // Backgrounded: polling stops (refetchIntervalInBackground is off).
    app.onSuspend?.();
    await wait(10);
    const atSuspend = calls;
    await wait(80);
    expect(calls).toBe(atSuspend);

    // Resumed: "window focus" refetches stale data and polling restarts.
    app.onResume?.();
    await wait(60);
    expect(calls).toBeGreaterThan(atSuspend);
  });

  it("pauses queries on hidden screens and refetches stale data when they reappear", async () => {
    let homeCalls = 0;
    let navigation!: Navigation;
    function Home() {
      navigation = useNavigation();
      useScreenQuery({
        queryKey: ["home"],
        queryFn: async () => ++homeCalls,
        refetchInterval: 20,
        staleTime: 0,
      });
      return <stackTemplate />;
    }
    mount(<Home />, new QueryClient());
    await wait(50);
    expect(homeCalls).toBeGreaterThan(0);

    navigation.push(<alertTemplate />);
    await wait(30);
    const covered = homeCalls;
    await wait(80);
    expect(homeCalls).toBe(covered);

    navigation.pop();
    await wait(40);
    expect(homeCalls).toBeGreaterThan(covered);
  });

  it("keeps a covered screen's data cached past gcTime", async () => {
    let calls = 0;
    let navigation!: Navigation;
    let status = "";
    function Home() {
      navigation = useNavigation();
      const query = useScreenQuery({
        queryKey: ["kept"],
        queryFn: async () => ++calls,
        gcTime: 10,
        staleTime: Infinity,
      });
      status = query.status;
      return <stackTemplate />;
    }
    mount(<Home />, new QueryClient());
    await wait(30);
    expect(calls).toBe(1);

    navigation.push(<alertTemplate />);
    await wait(80); // well past gcTime
    navigation.pop();
    await wait(30);
    // Still fresh in the cache: no loading state, no refetch.
    expect(status).toBe("success");
    expect(calls).toBe(1);
  });

  it("composes a list of wrappers outermost first", async () => {
    const Theme = createContext("none");
    let seen = "";
    let hasClient = false;
    function Leaf() {
      seen = useContext(Theme);
      hasClient = Boolean(useQueryClient());
      return <stackTemplate />;
    }
    const client = new QueryClient();
    const root = launch(<Leaf />, {
      wrapper: [
        ({ children }) => <TVMLQueryProvider client={client}>{children}</TVMLQueryProvider>,
        ({ children }) => <Theme.Provider value="blue">{children}</Theme.Provider>,
      ],
    })!;
    roots.push(root);
    expect(seen).toBe("blue");
    expect(hasClient).toBe(true);
  });

  it("pauses useScreenQueries while hidden", async () => {
    let calls = 0;
    let navigation!: Navigation;
    function Home() {
      navigation = useNavigation();
      useScreenQueries({
        queries: [1, 2].map((n) => ({
          queryKey: ["many", n],
          queryFn: async () => ++calls,
          refetchInterval: 20,
        })),
      });
      return <stackTemplate />;
    }
    mount(<Home />, new QueryClient());
    await wait(50);
    expect(calls).toBeGreaterThan(2);

    navigation.push(<alertTemplate />);
    await wait(30);
    const covered = calls;
    await wait(80);
    expect(calls).toBe(covered);
  });

  it("keeps refreshWhileHidden queries polling under a covering screen", async () => {
    let calls = 0;
    let navigation!: Navigation;
    function Home() {
      navigation = useNavigation();
      useScreenQuery({
        queryKey: ["live-chat"],
        queryFn: async () => ++calls,
        refetchInterval: 20,
        refreshWhileHidden: true,
      });
      return <stackTemplate />;
    }
    mount(<Home />, new QueryClient());
    await wait(30);
    navigation.push(<alertTemplate />);
    await wait(30);
    const covered = calls;
    await wait(80);
    expect(calls).toBeGreaterThan(covered);
  });
});
