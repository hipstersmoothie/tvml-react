import { useEffect, useRef } from "react";
import { useNavigation, type TVMLElement, type TVMLEvent } from "tvml-react";

import { usePreferences } from "../store";

/**
 * TVML's ratingTemplate turns its ratingBadge into a star picker. tvml-react
 * only delegates select/highlight/play/holdselect, so the badge's `change`
 * event (TVElementEventTypeChange) is subscribed by hand through a ref.
 *
 * ratingTemplate also ignores DOM changes once it's on screen (neither the
 * title nor the badge's value update), so the rating is saved and the screen
 * closed rather than showing a "thanks" state in place.
 */
export function RateApp() {
  const navigation = useNavigation();
  const [prefs, update] = usePreferences();
  const badge = useRef<TVMLElement>(null);
  const save = useRef<(rating: number) => void>(() => {});
  save.current = (rating) => {
    update({ rating });
    navigation.pop();
  };

  useEffect(() => {
    const element = badge.current;
    if (!element) return;
    const onChange = (event: TVMLEvent & { value?: unknown }) => {
      const value = Number(event.value ?? element.getAttribute("value"));
      if (Number.isFinite(value)) save.current(value);
    };
    element.addEventListener("change", onChange);
    return () => element.removeEventListener("change", onChange);
  }, []);

  return (
    <ratingTemplate theme="dark">
      <title>
        {prefs.rating == null
          ? "How are you enjoying Couch?"
          : `You gave us ${Math.round(prefs.rating * 5)} out of 5. Changed your mind?`}
      </title>
      <ratingBadge ref={badge} value={prefs.rating ?? 0} />
    </ratingTemplate>
  );
}

export function stars(rating: number | null): string {
  if (rating == null) return "Not rated";
  const n = Math.round(rating * 5);
  return "★".repeat(n) + "☆".repeat(5 - n);
}
