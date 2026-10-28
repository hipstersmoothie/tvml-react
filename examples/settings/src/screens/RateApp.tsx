import { useNavigation, type TVMLEvent } from "tvml-react";

import { usePreferences } from "../store";

/**
 * TVML's ratingTemplate turns its ratingBadge into a star picker that fires
 * `change` when the user picks a rating.
 *
 * ratingTemplate also ignores DOM changes once it's on screen (neither the
 * title nor the badge's value update), so the rating is saved and the screen
 * closed rather than showing a "thanks" state in place.
 */
export function RateApp() {
  const navigation = useNavigation();
  const [prefs, update] = usePreferences();

  const change = (event: TVMLEvent & { value?: unknown }) => {
    const rating = Number(event.value ?? event.target?.getAttribute("value"));
    if (!Number.isFinite(rating)) return;
    update({ rating });
    navigation.pop();
  };

  return (
    <ratingTemplate theme="dark">
      <title>
        {prefs.rating == null
          ? "How are you enjoying Couch?"
          : `You gave us ${Math.round(prefs.rating * 5)} out of 5. Changed your mind?`}
      </title>
      <ratingBadge value={prefs.rating ?? 0} onChange={change} />
    </ratingTemplate>
  );
}

export function stars(rating: number | null): string {
  if (rating == null) return "Not rated";
  const n = Math.round(rating * 5);
  return "★".repeat(n) + "☆".repeat(5 - n);
}
