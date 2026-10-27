import { airTime, channel, endpoints, episodeCode, type ScheduledEpisode } from "./api";
import { ErrorScreen, Loading, ShowLockup, useWatchlist } from "./components";
import { useApi } from "./useApi";

interface Slot {
  time: string;
  episodes: Array<ScheduledEpisode>;
}

const endsAt = (episode: ScheduledEpisode) =>
  Date.parse(episode.airstamp) + (episode.runtime ?? 30) * 60_000;

// Group today's schedule into time slots, one poster per show, starting with
// whatever is on now. Late at night (nothing left today) show the whole day.
function toSlots([schedule]: Array<Array<ScheduledEpisode>>): Array<Slot> {
  const slots = new Map<string, Slot>();
  const seen = new Set<number>();
  const now = Date.now();
  const sorted = [...schedule].sort((a, b) => a.airstamp.localeCompare(b.airstamp));
  const upcoming = sorted.filter((episode) => endsAt(episode) > now);
  for (const episode of upcoming.length > 0 ? upcoming : sorted) {
    if (!episode.show.image || seen.has(episode.show.id)) continue;
    seen.add(episode.show.id);
    const time = Date.parse(episode.airstamp) <= now && endsAt(episode) > now ? "On Now" : airTime(episode);
    let slot = slots.get(time);
    if (!slot) {
      slot = { time, episodes: [] };
      slots.set(time, slot);
    }
    slot.episodes.push(episode);
  }
  return [...slots.values()];
}

export function Tonight() {
  const schedule = useApi(endpoints.schedule(), toSlots);
  const watchlist = useWatchlist();

  if (schedule.status === "loading") return <Loading title="Loading tonight’s schedule…" />;
  if (schedule.status === "error") return <ErrorScreen {...schedule} />;

  return (
    <stackTemplate theme="dark">
      <collectionList>
        {watchlist.shows.length > 0 && (
          <shelf>
            <header>
              <title>Your Watchlist</title>
            </header>
            <section>
              {watchlist.shows.map((show) => (
                <ShowLockup key={show.id} show={show} />
              ))}
            </section>
          </shelf>
        )}
        {schedule.data.map((slot) => (
          <shelf key={slot.time}>
            <header>
              <title>{slot.time}</title>
            </header>
            <section>
              {slot.episodes.map((episode) => (
                <ShowLockup
                  key={episode.id}
                  show={episode.show}
                  subtitle={[channel(episode.show), episodeCode(episode)].filter(Boolean).join(" · ")}
                />
              ))}
            </section>
          </shelf>
        ))}
      </collectionList>
    </stackTemplate>
  );
}
