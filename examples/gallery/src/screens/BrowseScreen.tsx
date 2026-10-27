import type { ReactNode } from "react";

import type { ArtworkQuery } from "../api";
import { ArtworkGrid } from "../components/ArtworkGrid";
import { ErrorMessage, Loading } from "../components/Status";
import { usePagedArtworks } from "../hooks";

const formatCount = (n: number) => new Intl.NumberFormat("en-US").format(n);

/** An endless grid of artworks for a query: highlights, a department, an artist. */
export function BrowseScreen({
  title,
  query,
  actions,
  showTitle = true,
}: {
  title: string;
  /** Off for screens under the menu bar, which covers the top of the banner. */
  showTitle?: boolean;
  query: ArtworkQuery;
  /** Buttons for the banner. */
  actions?: ReactNode;
}) {
  const paged = usePagedArtworks(query);

  if (paged.items.length === 0) {
    if (paged.status === "loading") return <Loading title={title} />;
    if (paged.status === "error") return <ErrorMessage message={paged.error} onRetry={paged.retry} />;
    return <ErrorMessage title="Nothing here yet" message="No artworks with images matched." />;
  }

  const footer =
    paged.status === "error"
      ? `Couldn't load more: ${paged.error}`
      : paged.hasMore
        ? `${formatCount(paged.items.length)} of ${formatCount(paged.total)}`
        : `All ${formatCount(paged.items.length)} works`;

  return (
    <stackTemplate theme="dark">
      <banner>
        {showTitle ? <title>{title}</title> : null}
        {showTitle ? <description>{footer}</description> : null}
        {actions}
      </banner>
      <collectionList>
        <ArtworkGrid
          items={paged.items}
          onEndReached={paged.loadMore}
          title={showTitle ? undefined : footer}
        />
      </collectionList>
    </stackTemplate>
  );
}
