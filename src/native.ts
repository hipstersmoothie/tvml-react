// Hooks backed by the native bridge `TVMLReact.launch` installs (the
// `TVMLReactNative` global; see native/…/NativeBridge.swift). Without the
// bridge they return sensible defaults, using TVJS where it has something.

import { useEffect, useSyncExternalStore } from "react";

import { onAppStateChange } from "./platform.js";

export type ColorScheme = "light" | "dark";

export interface AccessibilitySettings {
  /** Settings → Accessibility → Motion → Reduce Motion. */
  reduceMotion: boolean;
  /** VoiceOver is running. */
  voiceOver: boolean;
  /** Bold Text is on. */
  boldText: boolean;
  /** Reduce Transparency is on. */
  reduceTransparency: boolean;
  /** Closed captions and SDH are on. */
  closedCaptioning: boolean;
  /** Increase Contrast is on. */
  darkerSystemColors: boolean;
}

export interface NetworkStatus {
  /** The Apple TV has a network connection. */
  online: boolean;
  /** Cellular or personal hotspot. */
  expensive: boolean;
  /** Low Data Mode. */
  constrained: boolean;
}

export interface DisplayInfo {
  /** Points. */
  width: number;
  /** Points. */
  height: number;
  /** Points to pixels: 1 on HD, 2 on 4K. */
  scale: number;
  /** The physical display's scale. */
  nativeScale: number;
  /** The display's refresh rate. */
  maximumFramesPerSecond: number;
  /** Whether this TV and Apple TV can play HDR content. */
  hdr: boolean;
}

interface NativeState {
  colorScheme: ColorScheme;
  accessibility: AccessibilitySettings;
  network: NetworkStatus;
  display: DisplayInfo;
}

interface NativeBridgeGlobal {
  state: NativeState;
  onChange?: (() => void) | null;
  setIdleTimerDisabled(disabled: boolean): void;
  measureText?(text: string, fontSize: number, fontWeight: string): { width: number; height: number };
}

interface Globals {
  TVMLReactNative?: NativeBridgeGlobal;
  Device?: { isNetworkReachable?: boolean };
  App?: { traitCollection?: { screenWidth?: number; screenHeight?: number; displayScale?: number } };
}

const globals = globalThis as unknown as Globals;

function bridge(): NativeBridgeGlobal | undefined {
  return globals.TVMLReactNative;
}

/** Whether the app was started with `TVMLReact.launch` (the native bridge is present). */
export function hasNativeBridge(): boolean {
  return bridge() !== undefined;
}

// ---------------------------------------------------------------------------
// Store

const listeners = new Set<() => void>();
let wired = false;

function subscribe(listener: () => void): () => void {
  const native = bridge();
  if (native && !wired) {
    wired = true;
    native.onChange = () => {
      for (const l of listeners) l();
    };
  }
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const traits = () => globals.App?.traitCollection;

const FALLBACK: NativeState = {
  colorScheme: "dark",
  accessibility: {
    reduceMotion: false,
    voiceOver: false,
    boldText: false,
    reduceTransparency: false,
    closedCaptioning: false,
    darkerSystemColors: false,
  },
  network: { online: true, expensive: false, constrained: false },
  display: {
    width: traits()?.screenWidth ?? 1920,
    height: traits()?.screenHeight ?? 1080,
    scale: traits()?.displayScale ?? 1,
    nativeScale: traits()?.displayScale ?? 1,
    maximumFramesPerSecond: 60,
    hdr: false,
  },
};

function useNativeState<K extends keyof NativeState>(key: K): NativeState[K] {
  return useSyncExternalStore(subscribe, () => bridge()?.state?.[key] ?? FALLBACK[key]);
}

// ---------------------------------------------------------------------------
// Hooks

/** The system appearance (Settings → General → Appearance). */
export function useColorScheme(): ColorScheme {
  return useNativeState("colorScheme");
}

/** Accessibility settings that affect how the UI should look and move. */
export function useAccessibility(): AccessibilitySettings {
  return useNativeState("accessibility");
}

/** Screen size, refresh rate and HDR support. */
export function useDisplay(): DisplayInfo {
  return useNativeState("display");
}

// Without the bridge, poll TVJS's Device.isNetworkReachable.
const offlineFallback = { ...FALLBACK.network, online: false };
let polledOnline = true;
let pollTimer: ReturnType<typeof setInterval> | undefined;

function subscribePolling(listener: () => void): () => void {
  listeners.add(listener);
  if (!pollTimer) {
    pollTimer = setInterval(() => {
      const next = globals.Device?.isNetworkReachable ?? true;
      if (next !== polledOnline) {
        polledOnline = next;
        for (const l of listeners) l();
      }
    }, 5000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && pollTimer) {
      clearInterval(pollTimer);
      pollTimer = undefined;
    }
  };
}

function readNetworkStatus(native: boolean): NetworkStatus {
  if (native) {
    return bridge()?.state?.network ?? FALLBACK.network;
  }
  polledOnline = globals.Device?.isNetworkReachable ?? polledOnline;
  return polledOnline ? FALLBACK.network : offlineFallback;
}

/**
 * Subscribe to connectivity changes outside React (e.g. to drive a data
 * library's online manager). Returns an unsubscribe function.
 */
export function onNetworkStatusChange(
  listener: (status: NetworkStatus) => void,
): () => void {
  const native = hasNativeBridge();
  return (native ? subscribe : subscribePolling)(() =>
    listener(readNetworkStatus(native)),
  );
}

/** Current connectivity, outside React. */
export function getNetworkStatus(): NetworkStatus {
  return readNetworkStatus(hasNativeBridge());
}

/** Whether the Apple TV is online. Updates when connectivity changes. */
export function useNetworkStatus(): NetworkStatus {
  const native = hasNativeBridge();
  return useSyncExternalStore(native ? subscribe : subscribePolling, () =>
    readNetworkStatus(native),
  );
}

// Reference-counted so any mounted component can keep the screen awake.
let keepAwakeCount = 0;
let stopReapplying: (() => void) | undefined;

/**
 * Keep the screensaver from starting while the calling component is mounted
 * (and `enabled` is true). Re-applied when the app resumes, since tvOS can
 * reset the idle timer in the background. Requires the native bridge.
 */
export function useKeepAwake(enabled = true): void {
  useEffect(() => {
    const native = bridge();
    if (!enabled || !native) {
      return;
    }
    keepAwakeCount += 1;
    if (keepAwakeCount === 1) {
      native.setIdleTimerDisabled(true);
      stopReapplying = onAppStateChange((state) => {
        if (state === "active" && keepAwakeCount > 0) native.setIdleTimerDisabled(true);
      });
    }
    return () => {
      keepAwakeCount -= 1;
      if (keepAwakeCount === 0) {
        stopReapplying?.();
        stopReapplying = undefined;
        native.setIdleTimerDisabled(false);
      }
    };
  }, [enabled]);
}

export interface TextMeasurement {
  /** Points. */
  width: number;
  /** Points. */
  height: number;
}

/**
 * Measure text set in the system font, for sizing cells to their content
 * (TVML has no intrinsic sizing). Uses the native bridge; without it, a rough
 * estimate.
 */
export function measureText(
  text: string,
  { fontSize = 29, fontWeight = "regular" }: { fontSize?: number; fontWeight?: string } = {},
): TextMeasurement {
  const native = bridge()?.measureText;
  if (native) {
    return native(text, fontSize, fontWeight);
  }
  const lines = text.split("\n");
  return {
    width: Math.ceil(Math.max(...lines.map((line) => line.length)) * fontSize * 0.55),
    height: Math.ceil(lines.length * fontSize * 1.2),
  };
}
