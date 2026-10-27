// Full-screen loading and error states. Returning a different template from a
// screen swaps the document's content in place.

export function Loading({ title = "Loading…" }: { title?: string }) {
  return (
    <loadingTemplate theme="dark">
      <activityIndicator>
        <title>{title}</title>
      </activityIndicator>
    </loadingTemplate>
  );
}

export function ErrorMessage({
  title = "Couldn't load artworks",
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <alertTemplate theme="dark">
      <title>{title}</title>
      {message ? <description>{message}</description> : null}
      {onRetry ? (
        <button onSelect={onRetry}>
          <text>Try again</text>
        </button>
      ) : null}
    </alertTemplate>
  );
}
