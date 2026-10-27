// Everything the app remembers, persisted with useLocalStorage. Each slice has
// its own key so components only re-render for the data they read.

import { useLocalStorage } from "tvml-react";

export const GENRES = [
  "Action",
  "Comedy",
  "Documentary",
  "Drama",
  "Animation",
  "Horror",
  "Sci-Fi",
  "Romance",
  "Thriller",
  "Kids & Family",
] as const;
export type Genre = (typeof GENRES)[number];

export interface Profile {
  name: string;
  email: string;
  /** Four-digit parental PIN, or "" when not set. */
  pin: string;
  genres: Array<Genre>;
  /** Flipped at the end of onboarding; the root screen switches on it. */
  onboarded: boolean;
}

export const DEFAULT_PROFILE: Profile = {
  name: "",
  email: "",
  pin: "",
  genres: [],
  onboarded: false,
};

export interface Option<T extends string> {
  value: T;
  label: string;
  detail?: string;
}

export const SUBTITLE_OPTIONS = [
  { value: "off", label: "Off" },
  { value: "auto", label: "Automatic", detail: "Shown when the audio isn't in your language." },
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
] as const satisfies ReadonlyArray<Option<string>>;
export type Subtitles = (typeof SUBTITLE_OPTIONS)[number]["value"];

export const QUALITY_OPTIONS = [
  { value: "auto", label: "Automatic", detail: "Best quality your connection allows." },
  { value: "4k", label: "4K HDR", detail: "Uses up to 7 GB per hour." },
  { value: "hd", label: "HD", detail: "Uses up to 3 GB per hour." },
  { value: "saver", label: "Data Saver", detail: "Uses up to 0.7 GB per hour." },
] as const satisfies ReadonlyArray<Option<string>>;
export type Quality = (typeof QUALITY_OPTIONS)[number]["value"];

export interface Preferences {
  autoplay: boolean;
  previews: boolean;
  reduceLoudness: boolean;
  pinForPurchases: boolean;
  subtitles: Subtitles;
  quality: Quality;
  /** 0–1, as the ratingBadge reports it; null until the user rates. */
  rating: number | null;
}

export const DEFAULT_PREFERENCES: Preferences = {
  autoplay: true,
  previews: true,
  reduceLoudness: false,
  pinForPurchases: true,
  subtitles: "auto",
  quality: "auto",
  rating: null,
};

export function useProfile() {
  const [profile, setProfile] = useLocalStorage<Profile>("settings.profile", DEFAULT_PROFILE);
  const update = (patch: Partial<Profile>) => setProfile((p) => ({ ...p, ...patch }));
  // Functional, so several toggles before a re-render don't clobber each other.
  const toggleGenre = (genre: Genre) =>
    setProfile((p) => ({
      ...p,
      genres: p.genres.includes(genre)
        ? p.genres.filter((g) => g !== genre)
        : GENRES.filter((g) => g === genre || p.genres.includes(g)),
    }));
  return [profile, update, setProfile, toggleGenre] as const;
}

export function usePreferences() {
  const [prefs, setPrefs] = useLocalStorage<Preferences>("settings.prefs", DEFAULT_PREFERENCES);
  const update = (patch: Partial<Preferences>) => setPrefs((p) => ({ ...p, ...patch }));
  return [prefs, update, setPrefs] as const;
}

export function labelFor<T extends string>(options: ReadonlyArray<Option<T>>, value: T): string {
  return options.find((o) => o.value === value)?.label ?? value;
}
