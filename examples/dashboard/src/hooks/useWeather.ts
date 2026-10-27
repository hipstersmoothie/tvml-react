import { getJSON } from "../lib/http";
import type { TemperatureUnit } from "../lib/locale";
import type { Place } from "./useLocation";
import { useLiveResource, type LiveResource } from "./useLiveResource";

/** The subset of Open-Meteo's /v1/forecast response this app asks for. */
export interface Forecast {
  utc_offset_seconds: number;
  timezone: string;
  current: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    weather_code: number;
    is_day: 0 | 1;
  };
  hourly: {
    time: Array<string>;
    temperature_2m: Array<number>;
    weather_code: Array<number>;
    precipitation_probability: Array<number>;
    is_day: Array<0 | 1>;
  };
  daily: {
    time: Array<string>;
    weather_code: Array<number>;
    temperature_2m_max: Array<number>;
    temperature_2m_min: Array<number>;
    precipitation_probability_max: Array<number>;
    sunrise: Array<string>;
    sunset: Array<string>;
  };
}

const MINUTE = 60_000;

export function forecastURL(place: Place, unit: TemperatureUnit): string {
  const params = new URLSearchParams({
    latitude: place.latitude.toFixed(2),
    longitude: place.longitude.toFixed(2),
    current: "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day",
    hourly: "temperature_2m,weather_code,precipitation_probability,is_day",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset",
    forecast_days: "7",
    timezone: "auto",
    temperature_unit: unit,
    wind_speed_unit: unit === "fahrenheit" ? "mph" : "kmh",
  });
  return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
}

export function useWeather(place: Place, unit: TemperatureUnit): LiveResource<Forecast> {
  const url = forecastURL(place, unit);
  return useLiveResource<Forecast>("dashboard.forecast", url, () => getJSON<Forecast>(url), {
    refreshEvery: 15 * MINUTE,
    staleAfter: 10 * MINUTE,
  });
}
