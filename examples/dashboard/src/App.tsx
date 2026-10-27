import { useEffect, useRef, useState } from "react";
import {
  useAccessibility,
  useAppState,
  useKeepAwake,
  useNavigation,
  useNetworkStatus,
} from "tvml-react";

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
 * Picks the backdrop and keeps a <Dashboard> on screen with it.
 *
 * TVMLKit reads a template's <background> once, when the document is
 * presented: changing the <img> src, remounting the <img> or <background>, or
 * swapping the whole template all leave the old photo up. So each new photo
 * (or appearance change) presents a fresh document with
 * `navigation.replace()`. Data lives in localStorage-backed hooks, so the new
 * screen renders with it immediately.
 */
export function App() {
  const { scheme } = usePalette();
  const { reduceMotion } = useAccessibility();
  const { online } = useNetworkStatus();
  const foreground = useAppState() === "active";
  const navigation = useNavigation();

  // A changing backdrop is motion on a screen nobody's touching; with Reduce
  // Motion on, keep one photo.
  const photo = useRotation(PHOTOS.length, 5 * MINUTE, foreground && online && !reduceMotion);
  const backdrop = photoURL(PHOTOS[photo], scheme);

  const [initial] = useState(backdrop);
  const [replaced, setReplaced] = useState(false);
  const shown = useRef(backdrop);
  useEffect(() => {
    if (backdrop === shown.current) return;
    shown.current = backdrop;
    setReplaced(true);
    navigation.replace(<Dashboard backdrop={backdrop} />);
  }, [backdrop, navigation]);

  // Once replaced, the launch document is off screen; leave it empty so its
  // timers and requests stop.
  return replaced ? <divTemplate /> : <Dashboard backdrop={initial} />;
}

function Dashboard({ backdrop }: { backdrop: string }) {
  // An ambient screen shouldn't hand over to the screensaver.
  useKeepAwake();

  const { scheme } = usePalette();
  const locale = useLocale();
  const now = useNow();
  const place = useLocation(locale.region);
  const weather = useWeather(place, locale.temperatureUnit);
  const events = useOnThisDay(locale.language, now);
  const { online } = useNetworkStatus();
  const foreground = useAppState() === "active";
  const event = useRotation(events.length, MINUTE, foreground);

  return (
    <divTemplate theme={scheme}>
      <background>
        <img src={backdrop} />
      </background>
      <Header
        now={now}
        locale={locale}
        place={place}
        forecast={weather.data}
        offline={!online}
        fetchedAt={weather.fetchedAt}
      />
      <OnThisDay event={events[event]} />
      <Forecast forecast={weather.data} locale={locale} now={now} />
      <Credits updated={weather.fetchedAt ? locale.deviceTime.format(weather.fetchedAt) : undefined} />
    </divTemplate>
  );
}
