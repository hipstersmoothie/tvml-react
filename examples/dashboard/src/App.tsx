import { useEffect, useState } from "react";
import {
  useAccessibility,
  useAppState,
  useKeepAwake,
  useNavigation,
  useNetworkStatus,
} from "tvml-react";
import { Screen } from "tvml-react/layout";

import { Credits } from "./components/Credits";
import { Forecast } from "./components/Forecast";
import { Header } from "./components/Header";
import { OnThisDay } from "./components/OnThisDay";
import { useLocation } from "./hooks/useLocation";
import { useNow } from "./hooks/useNow";
import { useOnThisDay } from "./hooks/useOnThisDay";
import { useRotation } from "./hooks/useRotation";
import { useWeather } from "./hooks/useWeather";
import { useLocale } from "./lib/locale";
import { usePalette, type Palette } from "./theme";

// Landscape photos from picsum.photos (Unsplash) at exactly 1080p.
const PHOTOS = [1015, 1016, 1018, 1036, 1039, 1043, 1044, 1050];

// TVML has no way to lay a scrim over a <background> image: a second child is
// ignored, row/stack backgrounds aren't drawn, and tv-tint-color recolors the
// image like a template glyph instead of shading it. So the photo is dimmed
// (or, in light mode, washed out and frosted) by an image proxy before it
// arrives.
function photoURL(id: number, scheme: Palette["scheme"]): string {
  const source = `picsum.photos/id/${id}/1920/1080`;
  const adjust = scheme === "dark" ? "mod=0.6" : "mod=1.6&sat=0.5&blur=5";
  return `https://images.weserv.nl/?url=${encodeURIComponent(source)}&${adjust}&output=jpg&q=82`;
}

const MINUTE = 60_000;

/**
 * The launch screen: a random photo to start with.
 *
 * TVMLKit reads a template's <background> once, when the document is
 * presented: changing the <img> src, remounting the <img> or <background>, or
 * swapping the whole template all leave the old photo up. So each new photo
 * (or appearance change) presents a fresh document with
 * `navigation.replace()`, and the old screen unmounts along with its timers.
 * Data lives in the QueryClient provided in `launch`'s wrapper, shared by
 * every screen, so the new one renders with it immediately.
 */
export function App() {
  const [photo] = useState(() => Math.floor(Math.random() * PHOTOS.length));
  return <Dashboard photo={photo} />;
}

function Dashboard({ photo }: { photo: number }) {
  // An ambient screen shouldn't hand over to the screensaver.
  useKeepAwake();

  const { scheme } = usePalette();
  const { reduceMotion } = useAccessibility();
  const { online } = useNetworkStatus();
  const foreground = useAppState() === "active";
  const navigation = useNavigation();

  // Fixed for the life of this screen; see above.
  const [backdrop] = useState(() => photoURL(PHOTOS[photo], scheme));
  const [presentedScheme] = useState(scheme);
  useEffect(() => {
    if (scheme !== presentedScheme) navigation.replace(<Dashboard photo={photo} />);
  }, [scheme, presentedScheme, photo, navigation]);

  // A changing backdrop is motion on a screen nobody's touching; with Reduce
  // Motion on, keep one photo.
  const rotate = foreground && online && !reduceMotion;
  useEffect(() => {
    if (!rotate) return;
    const next = (photo + 1) % PHOTOS.length;
    const timer = setTimeout(() => navigation.replace(<Dashboard photo={next} />), 5 * MINUTE);
    return () => clearTimeout(timer);
  }, [rotate, photo, navigation]);

  const locale = useLocale();
  const now = useNow();
  const place = useLocation(locale.region);
  const weather = useWeather(place, locale.temperatureUnit);
  const events = useOnThisDay(locale.language, now);
  const event = useRotation(events.length, MINUTE, foreground);
  // 0 until the forecast has loaded (or been restored from localStorage).
  const fetchedAt = weather.dataUpdatedAt || undefined;

  return (
    <Screen theme={scheme} background={backdrop}>
      <Header
        now={now}
        locale={locale}
        place={place}
        forecast={weather.data}
        offline={!online}
        fetchedAt={fetchedAt}
      />
      <OnThisDay event={events[event]} />
      <Forecast forecast={weather.data} locale={locale} now={now} />
      <Credits updated={fetchedAt ? locale.deviceTime.format(fetchedAt) : undefined} />
    </Screen>
  );
}
