import { useMemo } from "react";
import { usePlatformSettings } from "tvml-react";

// Countries that still use Fahrenheit for everyday weather.
const FAHRENHEIT = new Set(["US", "LR", "MM", "BS", "BZ", "KY", "PW", "FM", "MH"]);

export type TemperatureUnit = "celsius" | "fahrenheit";

export interface Locale {
  /** BCP 47 tag, e.g. "en-US". */
  language: string;
  /** ISO region from the App Store storefront, falling back to the language. */
  region: string;
  temperatureUnit: TemperatureUnit;
  /** Wall-clock times at the forecast location, e.g. "3:45 PM" or "15:45" (UTC-based; see below). */
  time: Intl.DateTimeFormat;
  /** Times on the Apple TV's own clock. */
  deviceTime: Intl.DateTimeFormat;
  hour: Intl.DateTimeFormat;
  weekday: Intl.DateTimeFormat;
}

function regionOf(language: string): string {
  const parts = language.split(/[-_]/);
  const region = parts.find((part, i) => i > 0 && /^[A-Za-z]{2}$/.test(part));
  return region?.toUpperCase() ?? "";
}

/**
 * Formatting and units for the Apple TV's language and storefront.
 *
 * Forecast times from Open-Meteo are wall-clock times at the forecast location
 * ("2026-10-27T15:00"), so every formatter here runs in UTC and callers feed it
 * `wallClock()` dates; that way the device's own time zone never shifts them.
 */
export function useLocale(): Locale {
  const { language, storefrontCountryCode } = usePlatformSettings();
  return useMemo(() => {
    const region = storefrontCountryCode || regionOf(language) || "US";
    const utc = { timeZone: "UTC" } as const;
    return {
      language,
      region,
      temperatureUnit: FAHRENHEIT.has(region) ? "fahrenheit" : "celsius",
      time: new Intl.DateTimeFormat(language, { ...utc, hour: "numeric", minute: "2-digit" }),
      deviceTime: new Intl.DateTimeFormat(language, { hour: "numeric", minute: "2-digit" }),
      hour: new Intl.DateTimeFormat(language, { ...utc, hour: "numeric" }),
      weekday: new Intl.DateTimeFormat(language, { ...utc, weekday: "short" }),
    };
  }, [language, storefrontCountryCode]);
}

/** Parse an ISO wall-clock time ("2026-10-27T15:00") into a Date to format in UTC. */
export function wallClock(iso: string): Date {
  const [date, time = "00:00"] = iso.split("T");
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh, mm));
}

/** The current wall-clock time at a location `utcOffsetSeconds` from UTC. */
export function wallClockNow(utcOffsetSeconds: number, now = Date.now()): Date {
  return new Date(now + utcOffsetSeconds * 1000);
}

export function degrees(value: number | undefined): string {
  return value == null || Number.isNaN(value) ? "–" : `${Math.round(value)}°`;
}
