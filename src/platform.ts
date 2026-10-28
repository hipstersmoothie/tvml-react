// Hooks over the platform APIs TVJS exposes as globals: App lifecycle,
// Device, Settings, App.traitCollection, localStorage and openURL.

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

interface TVJSApp {
  onSuspend?: (options?: unknown) => void;
  onResume?: (options?: unknown) => void;
  reload?: (options?: { when?: "now" | "onResume" }, data?: unknown) => void;
  traitCollection?: TVMLTraitCollection;
}

export interface TVMLTraitCollection {
  /** Points. */
  screenWidth: number;
  /** Points. */
  screenHeight: number;
  /** Points to pixels. */
  displayScale: number;
  /** Text direction for the user's language. */
  layoutDirection: "ltr" | "rtl";
  /** Always "tv" on Apple TV. */
  userInterfaceIdiom: string;
}

export interface DeviceInfo {
  /** e.g. "Apple TV" */
  model: string;
  /** e.g. "AppleTV14,1" */
  productType: string;
  /** tvOS version, e.g. "26.5" */
  systemVersion: string;
  /** The app's bundle identifier. */
  appIdentifier: string;
  /** The app's version (`CFBundleShortVersionString`). */
  appVersion: string;
  /** Stable per vendor; resets if all of the vendor's apps are removed. */
  vendorIdentifier: string;
}

export interface Restrictions {
  /** Explicit content is allowed. */
  allowsExplicit: boolean;
  /** Music videos are allowed. */
  allowsMusicVideos: boolean;
  /** Erotica (books) is allowed. */
  allowsErotica: boolean;
  /** Highest movie rating allowed, as a rank in the storefront's rating system. */
  maxMovieRank: number;
  /** Highest TV show rating allowed, as a rank. */
  maxTVShowRank: number;
}

export interface PlatformSettings {
  /** e.g. "en-US" */
  language: string;
  /** App Store storefront, e.g. "US" */
  storefrontCountryCode: string;
  /** Parental restrictions from Settings → General → Restrictions. */
  restrictions: Partial<Restrictions>;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface TVJSGlobals {
  App?: TVJSApp;
  Device?: DeviceInfo & { isNetworkReachable?: boolean };
  Settings?: PlatformSettings;
  localStorage?: StorageLike;
  openURL?: (url: string) => void;
  canOpenURL?: (url: string) => boolean;
}

const tvjs = globalThis as unknown as TVJSGlobals;

// ---------------------------------------------------------------------------
// App lifecycle

export type AppState = "active" | "background";
type AppEvent = "suspend" | "resume";

const appListeners = new Set<(event: AppEvent) => void>();
let appState: AppState = "active";
let lifecycleInstalled = false;

function installLifecycle(): void {
  const app = tvjs.App;
  if (lifecycleInstalled || !app) {
    return;
  }
  lifecycleInstalled = true;

  // App.onX are single slots; chain whatever was there before.
  const previousSuspend = app.onSuspend;
  const previousResume = app.onResume;
  app.onSuspend = (options) => {
    previousSuspend?.(options);
    appState = "background";
    for (const listener of appListeners) listener("suspend");
  };
  app.onResume = (options) => {
    previousResume?.(options);
    appState = "active";
    for (const listener of appListeners) listener("resume");
  };
}

/**
 * Subscribe to the app being suspended or resumed, outside React. Returns an
 * unsubscribe function.
 */
export function onAppStateChange(listener: (state: AppState) => void): () => void {
  return subscribeApp((event) => listener(event === "resume" ? "active" : "background"));
}

/** The app's current state, outside React. */
export function getAppState(): AppState {
  return appState;
}

function subscribeApp(listener: (event: AppEvent) => void): () => void {
  installLifecycle();
  appListeners.add(listener);
  return () => appListeners.delete(listener);
}

/** `"background"` while the app is suspended (another app or the screensaver is up). */
export function useAppState(): AppState {
  return useSyncExternalStore(subscribeApp, () => appState);
}

/** Run `handler` when the app is suspended or resumed. */
export function useAppEvent(event: AppEvent, handler: () => void): void {
  const latest = useRef(handler);
  latest.current = handler;
  useEffect(
    () =>
      subscribeApp((fired) => {
        if (fired === event) latest.current();
      }),
    [event],
  );
}

/** Restart the JavaScript app, re-running the bootstrap. */
export function reloadApp(when: "now" | "onResume" = "now"): void {
  tvjs.App?.reload?.({ when });
}

// ---------------------------------------------------------------------------
// Device, settings, screen

const FALLBACK_DEVICE: DeviceInfo = {
  model: "",
  productType: "",
  systemVersion: "",
  appIdentifier: "",
  appVersion: "",
  vendorIdentifier: "",
};

/** Device and app identity from TVJS `Device`. */
export function useDevice(): DeviceInfo {
  const [device] = useState<DeviceInfo>(() => {
    const d = tvjs.Device;
    if (!d) return FALLBACK_DEVICE;
    return {
      model: d.model,
      productType: d.productType,
      systemVersion: d.systemVersion,
      appIdentifier: d.appIdentifier,
      appVersion: d.appVersion,
      vendorIdentifier: d.vendorIdentifier,
    };
  });
  return device;
}

/** Language, storefront and parental restrictions from TVJS `Settings`. */
export function usePlatformSettings(): PlatformSettings {
  const [settings] = useState<PlatformSettings>(() => {
    const s = tvjs.Settings;
    return {
      language: s?.language ?? "en",
      storefrontCountryCode: s?.storefrontCountryCode ?? "",
      restrictions: { ...(s?.restrictions ?? {}) },
    };
  });
  return settings;
}

/** Screen size (points), scale and layout direction from `App.traitCollection`. */
export function useTraitCollection(): TVMLTraitCollection {
  const [traits] = useState<TVMLTraitCollection>(() => ({
    screenWidth: 1920,
    screenHeight: 1080,
    displayScale: 1,
    layoutDirection: "ltr",
    userInterfaceIdiom: "tv",
    ...tvjs.App?.traitCollection,
  }));
  return traits;
}

// ---------------------------------------------------------------------------
// Storage

const storageListeners = new Map<string, Set<() => void>>();

function readStored<T>(key: string, initial: T): T {
  const raw = tvjs.localStorage?.getItem(key);
  if (raw == null) return initial;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return initial;
  }
}

/**
 * State persisted to TVJS `localStorage` as JSON. Survives relaunches, and
 * every component using the same key stays in sync.
 */
export function useLocalStorage<T>(
  key: string,
  initial: T,
): [T, (next: T | ((current: T) => T)) => void] {
  const initialRef = useRef(initial);
  // Cache the parsed value per raw string so snapshots are stable.
  const cache = useRef<{ raw: string | null | undefined; value: T }>({
    raw: undefined,
    value: initial,
  });

  const value = useSyncExternalStore(
    (onChange) => {
      let set = storageListeners.get(key);
      if (!set) {
        set = new Set();
        storageListeners.set(key, set);
      }
      set.add(onChange);
      return () => set.delete(onChange);
    },
    () => {
      const raw = tvjs.localStorage?.getItem(key) ?? null;
      if (raw !== cache.current.raw) {
        cache.current = { raw, value: readStored(key, initialRef.current) };
      }
      return cache.current.value;
    },
  );

  const setValue = useCallback((next: T | ((current: T) => T)) => {
    const current = readStored(key, initialRef.current);
    const resolved =
      typeof next === "function" ? (next as (current: T) => T)(current) : next;
    if (resolved === undefined) {
      tvjs.localStorage?.removeItem(key);
    } else {
      tvjs.localStorage?.setItem(key, JSON.stringify(resolved));
    }
    for (const listener of storageListeners.get(key) ?? []) listener();
  }, [key]);

  return [value, setValue];
}

// ---------------------------------------------------------------------------
// Links

/** Open a URL in another app (e.g. an App Store or TV app link). */
export function openURL(url: string): void {
  tvjs.openURL?.(url);
}

/** Whether some installed app can open `url`. */
export function canOpenURL(url: string): boolean {
  return tvjs.canOpenURL?.(url) ?? false;
}
