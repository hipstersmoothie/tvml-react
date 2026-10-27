import { useEffect, useState } from "react";
import { useAppEvent } from "tvml-react";

/**
 * The current time, re-rendering at the top of every `unit` (default: minute)
 * rather than on a drifting interval. Resyncs when the app resumes, since
 * timers don't run while TVJS is suspended.
 */
export function useNow(unit = 60_000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const delay = unit - (Date.now() % unit) + 20;
      timer = setTimeout(() => {
        setNow(new Date());
        schedule();
      }, delay);
    };
    schedule();
    return () => clearTimeout(timer);
  }, [unit]);

  useAppEvent("resume", () => setNow(new Date()));

  return now;
}
