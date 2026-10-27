import { useEffect, useState } from "react";

/**
 * Cycles an index through `count` items every `interval` ms while `enabled`.
 */
export function useRotation(count: number, interval: number, enabled = true): number {
  const [index, setIndex] = useState(() => (count > 0 ? Math.floor(Math.random() * count) : 0));

  useEffect(() => {
    if (!enabled || count < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), interval);
    return () => clearInterval(id);
  }, [count, interval, enabled]);

  return count > 0 ? index % count : 0;
}
