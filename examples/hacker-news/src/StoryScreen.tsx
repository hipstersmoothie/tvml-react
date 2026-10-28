import { useState } from "react";
import { useNavigation } from "tvml-react";
import { useScreenQuery } from "tvml-react/query";

import { CommentScreen } from "./CommentScreen";
import { CommentRow, PREVIEW_SUBTITLE, PREVIEW_TEXT, PREVIEW_TITLE } from "./Comments";
import type { Story } from "./hn";
import { threadQuery } from "./queries";
import { domain, excerpt, plural, timeAgo } from "./text";

/** Comments are rendered in pages; big threads have 500+. */
const COMMENT_PAGE = 100;

export function StoryScreen({ story: initial }: { story: Story }) {
  const navigation = useNavigation();
  // Paused while a comment covers this screen; refetched if stale when it's back.
  const thread = useScreenQuery(threadQuery(initial.id));
  const [shown, setShown] = useState(COMMENT_PAGE);

  // Show what the list already knew while the comment tree loads.
  const story = thread.data?.story ?? initial;
  const comments = thread.data?.comments ?? [];
  const site = domain(story.url);

  return (
    <listTemplate theme="dark">
      <banner>
        <title>{story.title}</title>
      </banner>
      <list>
        <section>
          <header>
            <title>{`${plural(story.score, "point")} · by ${story.by} · ${timeAgo(story.time)}`}</title>
          </header>
          {story.url && (
            <listItemLockup>
              <title>{site ?? story.url}</title>
              <decorationLabel>Link</decorationLabel>
              <relatedContent>
                <lockup>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=12&data=${encodeURIComponent(story.url)}`}
                    width={400}
                    height={400}
                  />
                  <title style={PREVIEW_TITLE}>Scan to open on your phone</title>
                  <description style={{ ...PREVIEW_TEXT, tvTextMaxLines: 4 }}>{story.url}</description>
                </lockup>
              </relatedContent>
            </listItemLockup>
          )}
          {story.text && (
            <listItemLockup onSelect={() => navigation.push(<CommentScreen title={story.title} author={story.by} time={story.time} text={story.text!} />)}>
              <title>{excerpt(story.text, 80)}</title>
              <decorationLabel>Read</decorationLabel>
              <relatedContent>
                <lockup>
                  <title style={PREVIEW_TITLE}>{story.by}</title>
                  <subtitle style={PREVIEW_SUBTITLE}>{timeAgo(story.time)}</subtitle>
                  <description style={PREVIEW_TEXT}>{story.text}</description>
                </lockup>
              </relatedContent>
            </listItemLockup>
          )}
        </section>
        <section>
          <header>
            <title>
              {thread.data
                ? (comments.length > 0 ? plural(story.comments, "comment") : "No comments yet") +
                  (thread.isRefetchError ? " · couldn't refresh" : "")
                : thread.isLoadingError
                  ? "Couldn't load comments"
                  : "Loading comments…"}
            </title>
          </header>
          {thread.isLoadingError && (
            <listItemLockup onSelect={() => void thread.refetch()}>
              <title>Try Again</title>
              <relatedContent>
                <lockup>
                  <title>Couldn't load comments</title>
                  <description>{thread.error.message}</description>
                </lockup>
              </relatedContent>
            </listItemLockup>
          )}
          {comments.slice(0, shown).map((comment) => (
            <CommentRow key={comment.id} comment={comment} story={story.title} />
          ))}
          {comments.length > shown && (
            <listItemLockup onSelect={() => setShown((n) => n + COMMENT_PAGE)}>
              <title>{`Show more comments (${comments.length - shown} left)`}</title>
            </listItemLockup>
          )}
        </section>
      </list>
    </listTemplate>
  );
}
