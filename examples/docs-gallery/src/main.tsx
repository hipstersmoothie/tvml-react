import { launch, useNavigation, type StartOptions } from "tvml-react";

import { EXAMPLES } from "./examples.gen";

// Every example the docs site shows, by name. DocsGalleryTests opens each one
// with the remote and captures it for the docs.
function Index() {
  const navigation = useNavigation();
  return (
    <listTemplate>
      <banner>
        <title>Docs gallery</title>
      </banner>
      <list>
        <section>
          {EXAMPLES.map(({ name, Component }) => (
            <listItemLockup key={name} onSelect={() => navigation.push(<Component />)}>
              <title>{name}</title>
            </listItemLockup>
          ))}
        </section>
      </list>
    </listTemplate>
  );
}

export function start(_options: StartOptions) {
  launch(<Index />, { errorTitle: "Docs gallery crashed" });
}
