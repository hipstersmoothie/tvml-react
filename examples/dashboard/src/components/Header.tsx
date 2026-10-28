import { useMemo } from "react";
import { Cell, cellWidth, CONTENT_WIDTH, Row, SAFE_Y, Spacer } from "tvml-react/layout";

import type { Place } from "../hooks/useLocation";
import type { Forecast } from "../hooks/useWeather";
import { degrees, wallClock, type Locale } from "../lib/locale";
import { condition } from "../lib/weather-codes";
import { usePalette } from "../theme";

interface HeaderProps {
  now: Date;
  locale: Locale;
  /** Undefined while locating. */
  place: Place | undefined;
  forecast: Forecast | undefined;
  offline: boolean;
  fetchedAt: number | undefined;
}

// Column widths, left to right; each row adds up to CONTENT_WIDTH.
const CLOCK_SIZE = 200;
const CLOCK = 790; // digits + day period

const ICON = 170;
const TEMPERATURE = 300;
const GAP = CONTENT_WIDTH - CLOCK - ICON - TEMPERATURE;
const LEFT = CLOCK + GAP;
const RIGHT = ICON + TEMPERATURE;
const BADGE = 460;

/** Splits "3:45 PM" into "3:45" and "PM" so the period can be drawn smaller. */
function useClockParts(language: string, now: Date) {
  const format = useMemo(
    () => new Intl.DateTimeFormat(language, { hour: "numeric", minute: "2-digit" }),
    [language],
  );
  const parts = format.formatToParts(now);
  const dayPeriod = parts.find((part) => part.type === "dayPeriod")?.value ?? "";
  const time = parts
    .filter((part) => part.type !== "dayPeriod")
    .map((part) => part.value)
    .join("")
    .trim();
  return { time, dayPeriod };
}

export function Header({ now, locale, place, forecast, offline, fetchedAt }: HeaderProps) {
  const palette = usePalette();
  const { time, dayPeriod } = useClockParts(locale.language, now);
  // Measured, so the day period sits right after the digits.
  const digitsWidth = Math.min(CLOCK, cellWidth({ children: time, size: CLOCK_SIZE, weight: "thin" }) + 16);
  const date = useMemo(
    () => new Intl.DateTimeFormat(locale.language, { weekday: "long", month: "long", day: "numeric" }).format(now),
    [locale.language, now],
  );

  const current = forecast?.current;
  const today = forecast?.daily;
  const { label, icon } = condition(current?.weather_code, current?.is_day !== 0);

  const where = [place?.city || "Locating…"];
  if (today) {
    where.push(`🌅 ${locale.time.format(wallClock(today.sunrise[0]))}`);
    where.push(`🌇 ${locale.time.format(wallClock(today.sunset[0]))}`);
  }

  const details = current
    ? [
        `H ${degrees(today?.temperature_2m_max[0])}  L ${degrees(today?.temperature_2m_min[0])}`,
        `💨 ${Math.round(current.wind_speed_10m)} ${locale.temperatureUnit === "fahrenheit" ? "mph" : "km/h"}`,
        `💧 ${current.relative_humidity_2m}%`,
      ].join("   ")
    : "";

  return (
    <>
      <Row region="top" marginTop={SAFE_Y - 20}>
        <Cell width={digitsWidth} size={CLOCK_SIZE} weight="thin" color={palette.text}>
          {time}
        </Cell>
        <Cell width={CLOCK - digitsWidth} size={54} weight="light" color={palette.secondary}>
          {dayPeriod}
        </Cell>
        <Spacer width={GAP} />
        <Cell width={ICON} size={110} align="center" color={palette.text}>
          {current ? icon : ""}
        </Cell>
        <Cell width={TEMPERATURE} size={170} weight="thin" align="right" color={palette.text}>
          {degrees(current?.temperature_2m)}
        </Cell>
      </Row>
      <Row region="top">
        <Cell width={LEFT} size={50} weight="medium" color={palette.text}>
          {date}
        </Cell>
        <Cell width={RIGHT} size={40} align="right" color={palette.secondary}>
          {current ? `${label} · Feels ${degrees(current.apparent_temperature)}` : ""}
        </Cell>
      </Row>
      <Row region="top" marginTop={12}>
        <Cell width={LEFT - BADGE} size={30} color={palette.tertiary}>
          {`📍 ${where.join("     ")}${place?.approximate ? " (approx.)" : ""}`}
        </Cell>
        {offline ? (
          <Cell width={BADGE} height={50} size={28} weight="semibold" align="center" color="white" background={palette.warning} offset={RIGHT}>
            {fetchedAt ? `Offline · as of ${locale.deviceTime.format(fetchedAt)}` : "Offline"}
          </Cell>
        ) : (
          <Cell width={BADGE + RIGHT} size={30} align="right" color={palette.tertiary}>
            {details}
          </Cell>
        )}
      </Row>
    </>
  );
}
