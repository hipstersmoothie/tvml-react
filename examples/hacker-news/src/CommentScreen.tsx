import { timeAgo } from "./text";

// The full text of a comment or self-post. descriptiveAlertTemplate is the
// TVML template whose description scrolls when it's longer than the screen.
export function CommentScreen({
  title,
  author,
  time,
  text,
}: {
  title: string;
  author: string;
  time: number;
  text: string;
}) {
  return (
    <descriptiveAlertTemplate theme="dark">
      <title>{`${author} · ${timeAgo(time)}`}</title>
      <description>{text}</description>
      <subtitle>{title}</subtitle>
    </descriptiveAlertTemplate>
  );
}
