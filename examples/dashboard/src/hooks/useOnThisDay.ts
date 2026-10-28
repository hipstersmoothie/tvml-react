import { useScreenQuery } from "tvml-react/query";

import { getJSON } from "../lib/http";
import { persisted } from "../lib/persist";

export interface HistoricalEvent {
  year: number;
  text: string;
}

interface OnThisDayResponse {
  selected?: Array<{ year: number; text: string }>;
}

const HOUR = 60 * 60_000;

/** Wikipedia's "On this day" selected anniversaries, in the TV's language when available. */
export function useOnThisDay(language: string, today: Date): Array<HistoricalEvent> {
  const lang = language.split(/[-_]/)[0] || "en";
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const queryKey = ["onthisday", lang, mm, dd];

  const { data } = useScreenQuery<Array<HistoricalEvent>>({
    queryKey,
    queryFn: async ({ signal }) => {
      const url = `https://api.wikimedia.org/feed/v1/wikipedia/${lang}/onthisday/selected/${mm}/${dd}`;
      const body = await getJSON<OnThisDayResponse>(url, signal);
      return (body.selected ?? [])
        .filter((event) => event.text.length < 160)
        .map(({ year, text }) => ({ year, text }));
    },
    staleTime: 6 * HOUR,
    refetchInterval: 6 * HOUR,
    ...persisted<Array<HistoricalEvent>>("dashboard.onthisday", queryKey),
  });
  return data ?? [];
}
