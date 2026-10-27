// Hooks backed by the native bridge `TVMLReact.launch` installs (the
// `TVMLReactNative` global; see native/…/NativeBridge.swift). Without the
// bridge they return sensible defaults, using TVJS where it has something.

import { useEffect, useSyncExternalStore } from "react";

export type ColorScheme = "light" | "dark";

export interface AccessibilitySettings {
  reduceMotion: boolean;
  voiceOver: boolean;
  boldText: boolean;
  reduceTransparency: boolean;
  closedCaptioning: boolean;
  darkerSystemColors: boolean;
}

export interface NetworkStatus {
  online: boolean;
  /** Cellular or personal hotspot. */
  expensive: boolean;
  /** Low Data Mode. */
  constrained: boolean;
}

export interface DisplayInfo {
  /** Points. */
  width: number;
  height: number;
  scale: number;
  nativeScale: number;
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

/** Whether the Apple TV is online. Updates when connectivity changes. */
export function useNetworkStatus(): NetworkStatus {
  const native = hasNativeBridge();
  return useSyncExternalStore(native ? subscribe : subscribePolling, () => {
    if (native) {
      return bridge()?.state?.network ?? FALLBACK.network;
    }
    polledOnline = globals.Device?.isNetworkReachable ?? polledOnline;
    return polledOnline ? FALLBACK.network : offlineFallback;
  });
}

// Reference-counted so any mounted component can keep the screen awake.
let keepAwakeCount = 0;

/**
 * Keep the screensaver from starting while the calling component is mounted
 * (and `enabled` is true). Requires the native bridge.
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
    }
    return () => {
      keepAwakeCount -= 1;
      if (keepAwakeCount === 0) {
        native.setIdleTimerDisabled(false);
      }
    };
  }, [enabled]);
}
