import { useScreenQuery } from "tvml-react/query";

import { getJSON } from "../lib/http";
import { persisted } from "../lib/persist";

export interface Place {
  latitude: number;
  longitude: number;
  city: string;
  /** True when we couldn't geolocate and fell back to the storefront's capital. */
  approximate: boolean;
}

// Apple TV has no location services for apps, so locate by IP. If that fails,
// fall back to the storefront country's capital.
const CAPITALS: Record<string, Omit<Place, "approximate">> = {
  US: { latitude: 38.9, longitude: -77.04, city: "Washington" },
  GB: { latitude: 51.51, longitude: -0.13, city: "London" },
  CA: { latitude: 45.42, longitude: -75.7, city: "Ottawa" },
  AU: { latitude: -35.28, longitude: 149.13, city: "Canberra" },
  DE: { latitude: 52.52, longitude: 13.4, city: "Berlin" },
  FR: { latitude: 48.86, longitude: 2.35, city: "Paris" },
  JP: { latitude: 35.68, longitude: 139.69, city: "Tokyo" },
  IN: { latitude: 28.61, longitude: 77.21, city: "New Delhi" },
  BR: { latitude: -15.79, longitude: -47.88, city: "Brasília" },
};

interface GeoJS {
  latitude?: string;
  longitude?: string;
  city?: string;
}

const DAY = 24 * 60 * 60_000;
const QUERY_KEY = ["location"];

/**
 * Where the forecast is for, or `undefined` while geolocation is still in
 * flight (so the forecast doesn't first load for the fallback city).
 */
export function useLocation(region: string): Place | undefined {
  const { data, isError } = useScreenQuery<Place>({
    queryKey: QUERY_KEY,
    queryFn: async ({ signal }) => {
      const geo = await getJSON<GeoJS>("https://get.geojs.io/v1/ip/geo.json", signal);
      const latitude = Number(geo.latitude);
      const longitude = Number(geo.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        throw new Error("No coordinates");
      }
      return { latitude, longitude, city: geo.city ?? "", approximate: false };
    },
    staleTime: DAY,
    refetchInterval: DAY,
    // Fall back to the capital after one retry rather than three backoffs.
    retry: 1,
    ...persisted<Place>("dashboard.location", QUERY_KEY),
  });
  if (data) return data;
  return isError ? { ...(CAPITALS[region] ?? CAPITALS.US), approximate: true } : undefined;
}
