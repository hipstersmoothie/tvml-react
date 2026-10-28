import { useState } from "react";
import { useNavigation } from "tvml-react";
import { useScreenInfiniteQuery } from "tvml-react/query";

import { DEPARTMENTS, type Department } from "../api";
import { ArtworkGrid } from "../components/ArtworkGrid";
import { artworkPagesQuery, loadNextPage } from "../queries";
import { BrowseScreen } from "./BrowseScreen";

/**
 * Museum departments in a `catalogTemplate`: the list on the left, a preview
 * grid of the highlighted department on the right. A department's artworks
 * are only fetched once it has been highlighted. The preview shares its cache
 * entry with the department's own screen, which opens with it already loaded.
 */
export function CollectionsScreen() {
  return (
    <catalogTemplate theme="dark">
      <banner>
        <title>Collections</title>
      </banner>
      <list>
        <section>
          {DEPARTMENTS.map((department, index) => (
            <DepartmentItem key={department.id} department={department} first={index === 0} />
          ))}
        </section>
      </list>
    </catalogTemplate>
  );
}

function DepartmentItem({ department, first }: { department: Department; first: boolean }) {
  const navigation = useNavigation();
  // The first department is highlighted when the tab opens.
  const [highlighted, setHighlighted] = useState(first);
  const query = { departmentId: department.id };
  const pages = useScreenInfiniteQuery({ ...artworkPagesQuery(query), enabled: highlighted });

  return (
    <listItemLockup
      onHighlight={() => setHighlighted(true)}
      onSelect={() => navigation.push(<BrowseScreen title={department.title} query={query} />)}
    >
      <title>{department.title}</title>
      <decorationLabel>
        {pages.data ? new Intl.NumberFormat("en-US").format(pages.data.total) : ""}
      </decorationLabel>
      <relatedContent>
        {pages.data?.items.length ? (
          <ArtworkGrid items={pages.data.items} onEndReached={() => loadNextPage(pages)} />
        ) : (
          <grid>
            <header>
              <title>{pages.isError ? pages.error.message : "Loading…"}</title>
            </header>
            <section />
          </grid>
        )}
      </relatedContent>
    </listItemLockup>
  );
}
