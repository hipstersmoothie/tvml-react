import { useNavigation } from "tvml-react";

import { SCREENS } from "./screens";

// Every template and the main container elements, one row each. Selecting a
// row pushes that screen; the UI tests walk this list with the remote.
export function Index() {
  const navigation = useNavigation();
  return (
    <listTemplate>
      <banner>
        <title>Kitchen sink</title>
      </banner>
      <list>
        <section>
          {SCREENS.map(({ name, description, Screen }) => (
            <listItemLockup key={name} onSelect={() => navigation.push(<Screen />)}>
              <title>{name}</title>
              <relatedContent>
                <lockup>
                  <description>{description}</description>
                </lockup>
              </relatedContent>
            </listItemLockup>
          ))}
        </section>
      </list>
    </listTemplate>
  );
}
