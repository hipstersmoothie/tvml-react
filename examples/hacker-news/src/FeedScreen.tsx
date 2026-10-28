import { useNavigation } from "tvml-react";
import { useScreenInfiniteQuery } from "tvml-react/query";

import { PAGE_SIZE, type FeedId, type Story } from "./hn";
import { feedQuery } from "./queries";
import { ErrorScreen, Loading } from "./Status";
import { StoryScreen } from "./StoryScreen";
import { domain, excerpt, plural, timeAgo } from "./text";

export function FeedScreen({ feed, title }: { feed: FeedId; title: string }) {
  const navigation = useNavigation();
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
              onSelect={() => navigation.push(<StoryScreen story={story} />)}
              // Infinite scroll: start loading the next page a few rows early.
              onHighlight={index >= stories.length - 5 && !isFetchNextPageError ? loadMore : undefined}
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
  onSelect,
  onHighlight,
}: {
  story: Story;
  rank: number;
  onSelect: () => void;
  onHighlight?: () => void;
}) {
  const site = domain(story.url);
  const meta = [
    plural(story.score, "point"),
    story.type === "job" ? undefined : plural(story.comments, "comment"),
    `by ${story.by}`,
    timeAgo(story.time),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <listItemLockup onSelect={onSelect} onHighlight={onHighlight}>
      <ordinal>{String(rank)}</ordinal>
      <title>{story.title}</title>
      <decorationLabel>{`▲ ${story.score}`}</decorationLabel>
      <relatedContent>
        <lockup>
          <title style={{ tvTextMaxLines: 3 }}>{story.title}</title>
          <subtitle>{site ?? "news.ycombinator.com"}</subtitle>
          <description style={{ tvTextMaxLines: 12 }}>
            {story.text ? `${meta}\n\n${excerpt(story.text, 600)}` : meta}
          </description>
        </lockup>
      </relatedContent>
    </listItemLockup>
  );
}
