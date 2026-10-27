import { useNavigation } from "tvml-react";

import { PodcastDetail } from "./PodcastDetail";
import type { Podcast } from "./types";

export function PodcastLockup({ podcast, size = 300 }: { podcast: Podcast; size?: number }) {
  const navigation = useNavigation();
  return (
    <lockup onSelect={() => navigation.push(<PodcastDetail podcast={podcast} />)}>
      <img src={podcast.artwork} width={size} height={size} />
      <title>{podcast.title}</title>
      <subtitle>{podcast.author}</subtitle>
    </lockup>
  );
}

export function LoadingScreen({ title }: { title?: string }) {
  return (
    <loadingTemplate theme="dark">
      <activityIndicator>{title ? <title>{title}</title> : null}</activityIndicator>
    </loadingTemplate>
  );
}

export function ErrorScreen({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const navigation = useNavigation();
  return (
    <alertTemplate theme="dark">
      <title>Couldn't load this podcast</title>
      <description>{error.message}</description>
      <button onSelect={onRetry}>
        <text>Try Again</text>
      </button>
      <button onSelect={() => navigation.pop()}>
        <text>Go Back</text>
      </button>
    </alertTemplate>
  );
}
