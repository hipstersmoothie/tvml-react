import { CheckRow, ValueRow } from "../components/Rows";
import { GENRES, type Genre } from "../store";

/**
 * Multi-select: every genre row toggles its checkmark in place (focus stays on
 * the row). TVML has no checkbox, so this is a listTemplate of checkmark rows
 * plus a final action row.
 */
export function GenrePicker({
  title,
  selected,
  onToggle,
  doneLabel,
  onDone,
}: {
  title: string;
  selected: ReadonlyArray<Genre>;
  onToggle: (genre: Genre) => void;
  doneLabel: string;
  onDone: () => void;
}) {
  const count = selected.length;
  // listTemplate's banner description renders as tiny corner text, so the
  // running selection goes in the right-hand relatedContent panel instead.
  const summary =
    count === 0
      ? "Pick a few so we can tune your recommendations."
      : `${count} selected: ${selected.join(", ")}`;

  return (
    <listTemplate theme="dark">
      <banner>
        <title>{title}</title>
      </banner>
      <list>
        <section>
          <header>
            <title>Choose any</title>
          </header>
          {GENRES.map((genre) => (
            <CheckRow
              key={genre}
              title={genre}
              about={summary}
              checked={selected.includes(genre)}
              onSelect={() => onToggle(genre)}
            />
          ))}
        </section>
        <section>
          <ValueRow
            title={doneLabel}
            value={count === 0 ? "Skip" : `${count} selected`}
            about={summary}
            onSelect={onDone}
          />
        </section>
      </list>
    </listTemplate>
  );
}
