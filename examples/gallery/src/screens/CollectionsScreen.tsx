import { useState } from "react";
import { useNavigation } from "tvml-react";

import { DEPARTMENTS, type Department } from "../api";
import { ArtworkGrid } from "../components/ArtworkGrid";
import { usePagedArtworks } from "../hooks";
import { BrowseScreen } from "./BrowseScreen";

/**
 * Museum departments in a `catalogTemplate`: the list on the left, a preview
 * grid of the highlighted department on the right. A department's artworks
 * are only fetched once it has been highlighted.
 */
export function CollectionsScreen() {
  const [visited, setVisited] = useState(() => new Set([DEPARTMENTS[0].id]));
  const visit = (id: string) =>
    setVisited((current) => (current.has(id) ? current : new Set(current).add(id)));

  return (
    <catalogTemplate theme="dark">
      <banner>
        <title>Collections</title>
      </banner>
      <list>
        <section>
          {DEPARTMENTS.map((department) => (
            <DepartmentItem
              key={department.id}
              department={department}
              enabled={visited.has(department.id)}
              onHighlight={() => visit(department.id)}
            />
          ))}
        </section>
      </list>
    </catalogTemplate>
  );
}

function DepartmentItem({
  department,
  enabled,
  onHighlight,
}: {
  department: Department;
  enabled: boolean;
  onHighlight: () => void;
}) {
  const navigation = useNavigation();
  const paged = usePagedArtworks({ departmentId: department.id }, { enabled });

  return (
    <listItemLockup
      onHighlight={onHighlight}
      onSelect={() =>
        navigation.push(<BrowseScreen title={department.title} query={{ departmentId: department.id }} />)
      }
    >
      <title>{department.title}</title>
      <decorationLabel>
        {paged.total ? new Intl.NumberFormat("en-US").format(paged.total) : ""}
      </decorationLabel>
      <relatedContent>
        {paged.items.length > 0 ? (
          <ArtworkGrid items={paged.items} onEndReached={paged.loadMore} />
        ) : (
          <grid>
            <header>
              <title>{paged.status === "error" ? (paged.error ?? "Error") : "Loading…"}</title>
            </header>
            <section />
          </grid>
        )}
      </relatedContent>
    </listItemLockup>
  );
}
