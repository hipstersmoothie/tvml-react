import { useState } from "react";
import { useNavigation } from "tvml-react";

import { CommentScreen } from "./CommentScreen";
import { fetchThread, type Comment, type Story, type Thread } from "./hn";
import { useQuery } from "./lib/query";
import { domain, excerpt, plural, timeAgo } from "./text";

/** Comments are rendered in pages; big threads have 500+. */
const COMMENT_PAGE = 100;

export function StoryScreen({ story: initial }: { story: Story }) {
  const navigation = useNavigation();
  const thread = useQuery<Thread>(`thread:${initial.id}`, (signal) => fetchThread(initial.id, signal), {
    staleTime: 60_000,
  });
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
                  <title>Scan to open on your phone</title>
                  <description style={{ tvTextMaxLines: 4 }}>{story.url}</description>
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
                  <title>{`${story.by} · ${timeAgo(story.time)}`}</title>
                  <description style={{ tvTextMaxLines: 16 }}>{story.text}</description>
                </lockup>
              </relatedContent>
            </listItemLockup>
          )}
        </section>
        <section>
          <header>
            <title>
              {thread.status === "success"
                ? comments.length > 0
                  ? plural(comments.length, "comment")
                  : "No comments yet"
                : thread.status === "error"
                  ? "Couldn't load comments"
                  : "Loading comments…"}
            </title>
          </header>
          {thread.status === "error" && (
            <listItemLockup onSelect={() => void thread.refetch()} disabled={thread.isFetching}>
              <title>{thread.isFetching ? "Retrying…" : "Try Again"}</title>
              <relatedContent>
                <lockup>
                  <title>Couldn't load comments</title>
                  <description>{thread.error?.message ?? ""}</description>
                </lockup>
              </relatedContent>
            </listItemLockup>
          )}
          {comments.slice(0, shown).map((comment) => (
            <CommentRow
              key={comment.id}
              
              comment={comment}
              onSelect={() =>
                navigation.push(
                  <CommentScreen title={story.title} author={comment.author} time={comment.time} text={comment.text} />,
                )
              }
            />
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

const INDENT = " "; // em space

function CommentRow({ comment, onSelect }: { comment: Comment; onSelect: () => void }) {
  const indent = INDENT.repeat(Math.min(comment.depth, 8) * 2);
  return (
    <listItemLockup onSelect={onSelect}>
      <title>{`${indent}${comment.depth > 0 ? "↳ " : ""}${excerpt(comment.text, 90)}`}</title>
      <subtitle>{`${indent}${comment.author} · ${timeAgo(comment.time)}`}</subtitle>
      {comment.replies > 0 && <decorationLabel>{String(comment.replies)}</decorationLabel>}
      <relatedContent>
        <lockup>
          <title>{`${comment.author} · ${timeAgo(comment.time)}`}</title>
          <subtitle>{comment.replies > 0 ? plural(comment.replies, "reply", "replies") : "No replies"}</subtitle>
          <description style={{ tvTextMaxLines: 16 }}>{comment.text}</description>
        </lockup>
      </relatedContent>
    </listItemLockup>
  );
}
