// WMO weather interpretation codes, as returned by Open-Meteo.
// https://open-meteo.com/en/docs#weathervariables
//
// Icons are emoji: TVML renders Apple Color Emoji in <text>, they scale with
// font-size, need no network and work in both light and dark themes.

interface Condition {
  label: string;
  day: string;
  night: string;
}

const CONDITIONS: Record<number, Condition> = {
  0: { label: "Clear", day: "☀️", night: "🌙" },
  1: { label: "Mostly clear", day: "🌤️", night: "🌙" },
  2: { label: "Partly cloudy", day: "⛅", night: "☁️" },
  3: { label: "Overcast", day: "☁️", night: "☁️" },
  45: { label: "Fog", day: "🌫️", night: "🌫️" },
  48: { label: "Freezing fog", day: "🌫️", night: "🌫️" },
  51: { label: "Light drizzle", day: "🌦️", night: "🌧️" },
  53: { label: "Drizzle", day: "🌦️", night: "🌧️" },
  55: { label: "Heavy drizzle", day: "🌧️", night: "🌧️" },
  56: { label: "Freezing drizzle", day: "🌧️", night: "🌧️" },
  57: { label: "Freezing drizzle", day: "🌧️", night: "🌧️" },
  61: { label: "Light rain", day: "🌦️", night: "🌧️" },
  63: { label: "Rain", day: "🌧️", night: "🌧️" },
  65: { label: "Heavy rain", day: "🌧️", night: "🌧️" },
  66: { label: "Freezing rain", day: "🌧️", night: "🌧️" },
  67: { label: "Freezing rain", day: "🌧️", night: "🌧️" },
  71: { label: "Light snow", day: "🌨️", night: "🌨️" },
  73: { label: "Snow", day: "🌨️", night: "🌨️" },
  75: { label: "Heavy snow", day: "❄️", night: "❄️" },
  77: { label: "Snow grains", day: "🌨️", night: "🌨️" },
  80: { label: "Showers", day: "🌦️", night: "🌧️" },
  81: { label: "Showers", day: "🌧️", night: "🌧️" },
  82: { label: "Heavy showers", day: "🌧️", night: "🌧️" },
  85: { label: "Snow showers", day: "🌨️", night: "🌨️" },
  86: { label: "Snow showers", day: "🌨️", night: "🌨️" },
  95: { label: "Thunderstorms", day: "⛈️", night: "⛈️" },
  96: { label: "Thunderstorms, hail", day: "⛈️", night: "⛈️" },
  99: { label: "Thunderstorms, hail", day: "⛈️", night: "⛈️" },
};

const UNKNOWN: Condition = { label: "—", day: "🌡️", night: "🌡️" };

export function condition(code: number | undefined, isDay = true): { label: string; icon: string } {
  const entry = (code != null && CONDITIONS[code]) || UNKNOWN;
  return { label: entry.label, icon: isDay ? entry.day : entry.night };
}
