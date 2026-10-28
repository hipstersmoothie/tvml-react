import { skipToken, type UseQueryResult } from "@tanstack/react-query";
import { useScreenQuery } from "tvml-react/query";

import { getJSON } from "../lib/http";
import type { TemperatureUnit } from "../lib/locale";
import { persisted } from "../lib/persist";
import type { Place } from "./useLocation";

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

/** The forecast for `place`; waits (dependent query) until there is one. */
export function useWeather(place: Place | undefined, unit: TemperatureUnit): UseQueryResult<Forecast> {
  // Rounded like the request, so a location that moves a few metres reuses the cache.
  const queryKey = ["forecast", place?.latitude.toFixed(2), place?.longitude.toFixed(2), unit];
  return useScreenQuery<Forecast>({
    queryKey,
    queryFn: place ? ({ signal }) => getJSON<Forecast>(forecastURL(place, unit), signal) : skipToken,
    staleTime: 10 * MINUTE,
    refetchInterval: 15 * MINUTE,
    ...persisted<Forecast>("dashboard.forecast", queryKey),
  });
}
