// Full-screen loading and error states. Returning a different template from a
// screen swaps the whole document in place.

export function Loading({ title }: { title: string }) {
  return (
    <loadingTemplate theme="dark">
      <activityIndicator>
        <title>{title}</title>
      </activityIndicator>
    </loadingTemplate>
  );
}

export function ErrorScreen({
  title,
  error,
  onRetry,
}: {
  title: string;
  error: Error | undefined;
  onRetry: () => void;
}) {
  return (
    <alertTemplate theme="dark">
      <title>{title}</title>
      <description>{error?.message ?? "Something went wrong."}</description>
      <button onSelect={onRetry}>
        <text>Try Again</text>
      </button>
    </alertTemplate>
  );
}
