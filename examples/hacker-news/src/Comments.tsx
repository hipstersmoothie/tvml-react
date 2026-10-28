import { useNavigation } from "tvml-react";

import { CommentScreen } from "./CommentScreen";
import type { Comment } from "./hn";
import { excerpt, plural, timeAgo } from "./text";

// The preview beside a list: big enough to read from the couch.
export const PREVIEW_TITLE = { fontSize: 44, fontWeight: "bold", color: "white", tvTextMaxLines: 4 } as const;
export const PREVIEW_SUBTITLE = { fontSize: 28, color: "rgb(255, 102, 0)" } as const;
export const PREVIEW_TEXT = { fontSize: 30, tvTextMaxLines: 18 } as const;

const replyCount = (comment: Comment) =>
  comment.replies > 0 ? plural(comment.replies, "reply", "replies") : "No replies";

/**
 * A comment in a list, with its full text in the preview. Selecting it opens
 * its replies, or just the comment when there aren't any; Play always opens
 * the comment.
 */
export function CommentRow({ comment, story }: { comment: Comment; story: string }) {
  const navigation = useNavigation();
  const read = () =>
    navigation.push(<CommentScreen title={story} author={comment.author} time={comment.time} text={comment.text} />);
  const open = () =>
    comment.children.length > 0 ? navigation.push(<RepliesScreen comment={comment} story={story} />) : read();

  return (
    <listItemLockup onSelect={open} onPlay={read}>
      <title>{excerpt(comment.text, 90)}</title>
      <subtitle>{`${comment.author} · ${timeAgo(comment.time)}`}</subtitle>
      {comment.replies > 0 && <decorationLabel>{`${comment.replies} ›`}</decorationLabel>}
      <relatedContent>
        <lockup>
          <title style={PREVIEW_TITLE}>{comment.author}</title>
          <subtitle style={PREVIEW_SUBTITLE}>{`${timeAgo(comment.time)} · ${replyCount(comment)}`}</subtitle>
          <description style={PREVIEW_TEXT}>{comment.text}</description>
        </lockup>
      </relatedContent>
    </listItemLockup>
  );
}

/** One comment and the replies to it: one level of the thread at a time. */
function RepliesScreen({ comment, story }: { comment: Comment; story: string }) {
  const navigation = useNavigation();
  return (
    <listTemplate theme="dark">
      <banner>
        <title>{`${comment.author} · ${timeAgo(comment.time)}`}</title>
      </banner>
      <list>
        <section>
          <listItemLockup
            onSelect={() =>
              navigation.push(<CommentScreen title={story} author={comment.author} time={comment.time} text={comment.text} />)
            }
          >
            <title>{excerpt(comment.text, 90)}</title>
            <subtitle>{`${comment.author} · ${timeAgo(comment.time)}`}</subtitle>
            <decorationLabel>Read</decorationLabel>
            <relatedContent>
              <lockup>
                <title style={PREVIEW_TITLE}>{comment.author}</title>
                <subtitle style={PREVIEW_SUBTITLE}>{timeAgo(comment.time)}</subtitle>
                <description style={PREVIEW_TEXT}>{comment.text}</description>
              </lockup>
            </relatedContent>
          </listItemLockup>
        </section>
        <section>
          <header>
            <title>{replyCount(comment)}</title>
          </header>
          {comment.children.map((reply) => (
            <CommentRow key={reply.id} comment={reply} story={story} />
          ))}
        </section>
      </list>
    </listTemplate>
  );
}
