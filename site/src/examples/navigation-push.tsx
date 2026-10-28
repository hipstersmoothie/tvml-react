import { useNavigation } from "tvml-react";

const ALBUMS = ["Kind of Blue", "Rumours", "OK Computer"];

export default function Albums() {
  const navigation = useNavigation();
  return (
    <listTemplate>
      <list>
        <section>
          {ALBUMS.map((album) => (
            <listItemLockup key={album} onSelect={() => navigation.push(<Album title={album} />)}>
              <title>{album}</title>
            </listItemLockup>
          ))}
        </section>
      </list>
    </listTemplate>
  );
}

function Album({ title }: { title: string }) {
  const navigation = useNavigation();
  return (
    <alertTemplate>
      <title>{title}</title>
      <button onSelect={() => navigation.pop()}>
        <text>Back</text>
      </button>
    </alertTemplate>
  );
}
