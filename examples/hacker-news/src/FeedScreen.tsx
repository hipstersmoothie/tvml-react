import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigation } from "tvml-react";
import { useScreenInfiniteQuery } from "tvml-react/query";

import { PAGE_SIZE, type FeedId, type Story } from "./hn";
import { PREVIEW_SUBTITLE, PREVIEW_TEXT, PREVIEW_TITLE } from "./Comments";
import { feedQuery, threadQuery } from "./queries";
import { ErrorScreen, Loading } from "./Status";
import { StoryScreen } from "./StoryScreen";
import { domain, excerpt, plural, timeAgo } from "./text";

export function FeedScreen({ feed, title }: { feed: FeedId; title: string }) {
  const navigation = useNavigation();
  // The story whose comments the preview shows, once focus rests on it.
  const [highlighted, setHighlighted] = useState<number>();
  const active = useDebouncedValue(highlighted, 400);
  const {
    data: stories,
    error,
    fetchStatus,
    isFetching,
    isRefetching,
    isRefetchError,
    dataUpdatedAt,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  } = useScreenInfiniteQuery({
    ...feedQuery(feed),
    // What useScreenQuery does: only observe the feed while this tab is the
    // one on screen, so it refetches stale stories when the tab reappears.
  });

  if (!stories) {
    if (error) return <ErrorScreen title={`Couldn't load ${title}`} error={error} onRetry={() => void refetch()} />;
    return <Loading title={fetchStatus === "paused" ? "Waiting for a network connection…" : `Loading ${title}…`} />;
  }

  // One request at a time: a refresh refetches every loaded page anyway.
  const loadMore = () => {
    if (hasNextPage && !isFetching) void fetchNextPage();
  };

  const age = Date.now() - dataUpdatedAt < 60_000 ? "just now" : timeAgo(dataUpdatedAt / 1000);
  const header = isRefetching
    ? "Refreshing…"
    : isRefetchError
      ? `Couldn't refresh (${error?.message}) · from ${age}`
      : `Updated ${age}`;

  return (
    <listTemplate theme="dark">
      <banner>
        <title>{title}</title>
      </banner>
      <list>
        <section>
          <header>
            <title>{header}</title>
          </header>
          {stories.map((story, index) => (
            <StoryRow
              key={story.id}
              story={story}
              rank={index + 1}
              active={story.id === active}
              onSelect={() => navigation.push(<StoryScreen story={story} />)}
              onHighlight={() => {
                setHighlighted(story.id);
                // Infinite scroll: start loading the next page a few rows early.
                if (index >= stories.length - 5 && !isFetchNextPageError) loadMore();
              }}
            />
          ))}
          {hasNextPage && (
            <listItemLockup onSelect={loadMore} disabled={isFetching}>
              <title>
                {isFetchingNextPage
                  ? "Loading more…"
                  : isFetchNextPageError
                    ? "Couldn't load more. Try again"
                    : `Load ${PAGE_SIZE} more`}
              </title>
              <relatedContent>
                <lockup>
                  <title>{`${stories.length} stories loaded`}</title>
                  <description>{isFetchNextPageError ? (error?.message ?? "") : ""}</description>
                </lockup>
              </relatedContent>
            </listItemLockup>
          )}
          <listItemLockup onSelect={() => void refetch()} disabled={isFetching}>
            <title>{isRefetching ? "Refreshing…" : "Refresh"}</title>
          </listItemLockup>
        </section>
      </list>
    </listTemplate>
  );
}

function StoryRow({
  story,
  rank,
  active,
  onSelect,
  onHighlight,
}: {
  story: Story;
  rank: number;
  /** Highlighted for a moment: load its comments for the preview. */
  active: boolean;
  onSelect: () => void;
  onHighlight: () => void;
}) {
  // The same query the story screen uses, so opening it is instant.
  const { data: thread } = useQuery({ ...threadQuery(story.id), enabled: active && story.comments > 0 });
  const top = thread?.comments[0];
  const site = domain(story.url) ?? "news.ycombinator.com";
  const meta = [
    plural(story.score, "point"),
    story.type === "job" ? undefined : plural(story.comments, "comment"),
    `by ${story.by}`,
    timeAgo(story.time),
  ]
    .filter(Boolean)
    .join(" · ");
  const body = story.text
    ? excerpt(story.text, 600)
    : top
      ? `Top comment, from ${top.author}:\n\n${excerpt(top.text, 600)}`
      : "";

  return (
    <listItemLockup onSelect={onSelect} onHighlight={onHighlight}>
      <ordinal>{String(rank)}</ordinal>
      <title>{story.title}</title>
      <subtitle>{story.type === "job" ? site : `${site} · ${plural(story.comments, "comment")}`}</subtitle>
      <decorationLabel>{`▲ ${story.score}`}</decorationLabel>
      <relatedContent>
        <lockup>
          <title style={PREVIEW_TITLE}>{story.title}</title>
          <subtitle style={PREVIEW_SUBTITLE}>{site}</subtitle>
          <description style={PREVIEW_TEXT}>{body ? `${meta}\n\n${body}` : meta}</description>
        </lockup>
      </relatedContent>
    </listItemLockup>
  );
}

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
