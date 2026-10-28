import type { ReactNode } from "react";
import { useScreenInfiniteQuery } from "tvml-react/query";

import type { ArtworkQuery } from "../api";
import { ArtworkGrid } from "../components/ArtworkGrid";
import { ErrorMessage, Loading } from "../components/Status";
import { artworkPagesQuery, loadNextPage } from "../queries";

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
  // Paused while another tab or screen covers this one, like useScreenQuery.
  const pages = useScreenInfiniteQuery(artworkPagesQuery(query));

  if (!pages.data) {
    if (pages.isError) {
      return <ErrorMessage message={pages.error.message} onRetry={() => void pages.refetch()} />;
    }
    return <Loading title={title} />;
  }
  const { items, total } = pages.data;
  if (items.length === 0) {
    return <ErrorMessage title="Nothing here yet" message="No artworks with images matched." />;
  }

  const footer = pages.isFetchNextPageError
    ? `Couldn't load more: ${pages.error?.message}`
    : pages.hasNextPage
      ? `${formatCount(items.length)} of ${formatCount(total)}`
      : `All ${formatCount(items.length)} works`;

  return (
    <stackTemplate theme="dark">
      <banner>
        {showTitle ? <title>{title}</title> : null}
        {showTitle ? <description>{footer}</description> : null}
        {actions}
      </banner>
      <collectionList>
        <ArtworkGrid
          items={items}
          onEndReached={() => loadNextPage(pages)}
          title={showTitle ? undefined : footer}
        />
      </collectionList>
    </stackTemplate>
  );
}
