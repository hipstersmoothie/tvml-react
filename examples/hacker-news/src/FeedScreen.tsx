import { useNavigation } from "tvml-react";

import { PAGE_SIZE, type FeedId, type Story } from "./hn";
import { ErrorScreen, Loading } from "./Status";
import { StoryScreen } from "./StoryScreen";
import { domain, excerpt, plural, timeAgo } from "./text";
import { useFeed } from "./useFeed";

export function FeedScreen({ feed, title }: { feed: FeedId; title: string }) {
  const navigation = useNavigation();
  const {
    status,
    error,
    isFetching,
    updatedAt,
    refetch,
    stories,
    hasMore,
    loadMore,
    loadingMore,
    loadMoreError,
  } = useFeed(feed);

  if (status === "loading") return <Loading title={`Loading ${title}…`} />;
  if (status === "error") {
    return (
      <ErrorScreen
        title={`Couldn't load ${title}`}
        error={error}
        onRetry={() => void refetch()}
      />
    );
  }

  const age = Date.now() - updatedAt < 60_000 ? "just now" : timeAgo(updatedAt / 1000);
  const header = isFetching
    ? "Refreshing…"
    : error
      ? `Couldn't refresh (${error.message}) · from ${age}`
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
              onHighlight={
                hasMore && index >= stories.length - 5 && !loadMoreError ? () => void loadMore() : undefined
              }
            />
          ))}
          {hasMore && (
            <listItemLockup onSelect={() => void loadMore()} disabled={loadingMore}>
              <title>
                {loadingMore ? "Loading more…" : loadMoreError ? "Couldn't load more. Try again" : `Load ${PAGE_SIZE} more`}
              </title>
              <relatedContent>
                <lockup>
                  <title>{`${stories.length} stories loaded`}</title>
                  <description>{loadMoreError?.message ?? ""}</description>
                </lockup>
              </relatedContent>
            </listItemLockup>
          )}
          <listItemLockup onSelect={() => void refetch()} disabled={isFetching}>
            <title>{isFetching ? "Refreshing…" : "Refresh"}</title>
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
