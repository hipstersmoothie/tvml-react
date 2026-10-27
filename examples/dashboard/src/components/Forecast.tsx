import type { Forecast as ForecastData } from "../hooks/useWeather";
import { degrees, wallClock, wallClockNow, type Locale } from "../lib/locale";
import { condition } from "../lib/weather-codes";
import { Cell, Columns, CONTENT_WIDTH, Row, Spacer, type Column } from "../layout";
import { usePalette } from "../theme";

const HOURS = 8;
const HOUR_STEP = 3;
const DAYS = 5;

// Two groups of tiles that together span CONTENT_WIDTH.
const TILE_GAP = 8;
const GROUP_GAP = 48;
const HOUR_WIDTH = 118;
const HOURS_WIDTH = HOURS * HOUR_WIDTH + (HOURS - 1) * TILE_GAP;
const DAYS_WIDTH = CONTENT_WIDTH - HOURS_WIDTH - GROUP_GAP;
const DAY_WIDTH = (DAYS_WIDTH - (DAYS - 1) * TILE_GAP) / DAYS;

interface ForecastProps {
  forecast: ForecastData | undefined;
  locale: Locale;
  now: Date;
}

/** "2026-10-27T15:00" for the current hour at the forecast location. */
function currentHourISO(forecast: ForecastData, now: Date): string {
  return wallClockNow(forecast.utc_offset_seconds, now.getTime()).toISOString().slice(0, 14) + "00";
}

function hourlyColumns(forecast: ForecastData, locale: Locale, now: Date, highlight: string): Array<Column> {
  const { hourly } = forecast;
  const start = Math.max(0, hourly.time.indexOf(currentHourISO(forecast, now)));
  const columns: Array<Column> = [];
  for (let i = 0; i < HOURS; i++) {
    const index = start + i * HOUR_STEP;
    if (index >= hourly.time.length) break;
    const rain = hourly.precipitation_probability[index] ?? 0;
    columns.push({
      key: hourly.time[index],
      width: HOUR_WIDTH,
      background: i === 0 ? highlight : undefined,
      lines: [
        i === 0 ? "Now" : locale.hour.format(wallClock(hourly.time[index])),
        condition(hourly.weather_code[index], hourly.is_day[index] === 1).icon,
        degrees(hourly.temperature_2m[index]),
        rain >= 10 ? `💧${rain}%` : "",
      ],
    });
  }
  return columns;
}

function dailyColumns(forecast: ForecastData, locale: Locale, highlight: string): Array<Column> {
  const { daily } = forecast;
  return daily.time.slice(0, DAYS).map((day, i) => ({
    key: day,
    width: DAY_WIDTH,
    offset: i === 0 ? GROUP_GAP - TILE_GAP : undefined,
    background: i === 0 ? highlight : undefined,
    lines: [
      i === 0 ? "Today" : locale.weekday.format(wallClock(day)),
      condition(daily.weather_code[i]).icon,
      degrees(daily.temperature_2m_max[i]),
      degrees(daily.temperature_2m_min[i]),
    ],
  }));
}

/** Placeholder tiles so the layout doesn't jump when data arrives. */
function emptyColumns(count: number, width: number, prefix: string, offset?: number): Array<Column> {
  return Array.from({ length: count }, (_, i) => ({
    key: `${prefix}${i}`,
    width,
    offset: i === 0 ? offset : undefined,
    lines: ["", "·", "", ""],
  }));
}

export function Forecast({ forecast, locale, now }: ForecastProps) {
  const palette = usePalette();
  const columns = forecast
    ? [...hourlyColumns(forecast, locale, now, palette.panelStrong), ...dailyColumns(forecast, locale, palette.panelStrong)]
    : [...emptyColumns(HOURS, HOUR_WIDTH, "h"), ...emptyColumns(DAYS, DAY_WIDTH, "d", GROUP_GAP - TILE_GAP)];

  const heading = { size: 24, weight: "semibold", color: palette.secondary } as const;

  return (
    <>
      <Row region="bottom" marginBottom={10}>
        <Cell width={HOURS_WIDTH} {...heading}>
          {"NEXT 24 HOURS"}
        </Cell>
        <Spacer width={GROUP_GAP} />
        <Cell width={DAYS_WIDTH} {...heading}>
          {"THIS WEEK"}
        </Cell>
      </Row>
      <Columns
        region="bottom"
        gap={TILE_GAP}
        columns={columns}
        lineStyles={[
          { size: 28, weight: "medium", color: palette.secondary, background: palette.panel, height: 56 },
          { size: 58, color: palette.text, background: palette.panel, height: 80 },
          { size: 38, weight: "medium", color: palette.text, background: palette.panel, height: 54 },
          { size: 26, color: palette.tertiary, background: palette.panel, height: 48 },
        ]}
      />
    </>
  );
}
