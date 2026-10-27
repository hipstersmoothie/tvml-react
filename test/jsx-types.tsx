// Compile-time checks for the TVML JSX typings (run via `pnpm typecheck`).

import { SimplifiedList, SimplifiedListRow } from "../src/simplified-list.js";

export const valid = (
  <stackTemplate theme="dark">
    <banner style={{ tvAlign: "center", padding: 40 }}>
      <title>Albums</title>
    </banner>
    <collectionList>
      <shelf centered>
        <section>
          <lockup onSelect={(event) => void event.target} data-album-id="42">
            <img src="https://example.com/a.jpg" width={300} height={300} />
            <title>Album</title>
          </lockup>
        </section>
      </shelf>
    </collectionList>
    <SimplifiedList summary="History" style={{ width: 1920, height: 800 }}>
      <SimplifiedListRow key="1" title="Song" accessory="now" />
    </SimplifiedList>
  </stackTemplate>
);

// @ts-expect-error -- not a TVML element
export const unknownTag = <div />;

// @ts-expect-error -- theme only exists on templates
export const wrongAttribute = <lockup theme="dark" />;

// @ts-expect-error -- not a valid theme
export const wrongTheme = <alertTemplate theme="blue" />;

// @ts-expect-error -- native elements are components, not intrinsic tags
export const nativeAsIntrinsic = <simplifiedList />;

// @ts-expect-error -- unknown prop on a native component
export const wrongNativeProp = <SimplifiedListRow artist="x" />;
