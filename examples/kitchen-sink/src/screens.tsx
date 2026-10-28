import type { ComponentType } from "react";
import { MenuBar, MenuBarItem, useNavigation } from "tvml-react";

import { hero, poster, range, square, wide } from "./art";
import { EventsScreen, PlayerScreen } from "./interactive";
import { LayoutScreen } from "./layout";

// One minimal but realistic screen per TVML template, plus screens for the
// main container elements. Each shows its name so the UI tests can tell it
// rendered.

function Posters({ count = 8, seed = "p" }: { count?: number; seed?: string }) {
  return (
    <>
      {range(count).map((i) => (
        <lockup key={i}>
          <img src={poster(`${seed}${i}`)} width={250} height={375} />
          <title>Item {i + 1}</title>
        </lockup>
      ))}
    </>
  );
}

function AlertScreen() {
  const navigation = useNavigation();
  return (
    <alertTemplate>
      <title>alertTemplate</title>
      <description>A short message with buttons.</description>
      <button onSelect={() => navigation.pop()}>
        <text>OK</text>
      </button>
      <button>
        <text>Cancel</text>
      </button>
    </alertTemplate>
  );
}

function CatalogScreen() {
  return (
    <catalogTemplate>
      <banner>
        <title>catalogTemplate</title>
      </banner>
      <list>
        {["Drama", "Comedy", "Documentary"].map((genre) => (
          <section key={genre}>
            <listItemLockup>
              <title>{genre}</title>
              <decorationLabel>8</decorationLabel>
              <relatedContent>
                <grid>
                  <section>
                    <Posters seed={genre} />
                  </section>
                </grid>
              </relatedContent>
            </listItemLockup>
          </section>
        ))}
      </list>
    </catalogTemplate>
  );
}

function CompilationScreen() {
  return (
    <compilationTemplate>
      <list>
        <relatedContent>
          <itemBanner>
            <heroImg src={square("comp")} />
            <row>
              <buttonLockup>
                <badge src="resource://button-play" />
                <title>Play</title>
              </buttonLockup>
            </row>
          </itemBanner>
        </relatedContent>
        <header>
          <title>compilationTemplate</title>
          <subtitle>An album</subtitle>
          <row>
            <text>2026</text>
            <text>10 songs</text>
          </row>
        </header>
        <section>
          {range(10).map((i) => (
            <listItemLockup key={i}>
              <ordinal minLength={2}>{i + 1}</ordinal>
              <title>Track {i + 1}</title>
              <decorationLabel>3:2{i}</decorationLabel>
            </listItemLockup>
          ))}
        </section>
      </list>
    </compilationTemplate>
  );
}

function DescriptiveAlertScreen() {
  return (
    <descriptiveAlertTemplate>
      <title>descriptiveAlertTemplate</title>
      <description>
        {"A long block of text, such as terms or a synopsis.\n\n" +
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit. ".repeat(12)}
      </description>
      <row>
        <button>
          <text>Agree</text>
        </button>
        <button>
          <text>Disagree</text>
        </button>
      </row>
    </descriptiveAlertTemplate>
  );
}

function DivScreen() {
  return (
    // Text here is black unless colored, whatever the theme.
    <divTemplate>
      <title
        style={{ tvPosition: "top", tvAlign: "center", margin: "80 0 0 0", fontSize: 60, color: "white" }}
      >
        divTemplate
      </title>
      <text style={{ tvPosition: "center", tvAlign: "center", fontSize: 36, color: "white" }}>
        Nine regions, flow layout.
      </text>
      <text style={{ tvPosition: "bottom-left", margin: "0 0 60 90", color: "white" }}>bottom-left</text>
      <text style={{ tvPosition: "bottom-right", margin: "0 90 60 0", color: "white" }}>bottom-right</text>
      <button style={{ tvPosition: "bottom", tvAlign: "center", margin: "0 0 60 0" }}>
        <text>A button</text>
      </button>
    </divTemplate>
  );
}

function FormScreen() {
  return (
    <formTemplate>
      <banner>
        <img src="symbol://person.crop.circle" width={200} height={200} />
        <title>formTemplate</title>
        <description>Enter a display name.</description>
      </banner>
      <textField>Display name</textField>
      <footer>
        <button>
          <text>Continue</text>
        </button>
      </footer>
    </formTemplate>
  );
}

function ListScreen() {
  return (
    <listTemplate>
      <banner>
        <title>listTemplate</title>
      </banner>
      <list>
        <header>
          <title>Episodes</title>
        </header>
        <section>
          {range(12).map((i) => (
            <listItemLockup key={i}>
              <title>Episode {i + 1}</title>
              <decorationLabel>4{i} min</decorationLabel>
              <relatedContent>
                <lockup>
                  <img src={wide(`list${i}`)} width={857} height={482} />
                  <title>Episode {i + 1}</title>
                  <description>What happens in episode {i + 1}.</description>
                </lockup>
              </relatedContent>
            </listItemLockup>
          ))}
        </section>
      </list>
    </listTemplate>
  );
}

function LoadingScreen() {
  return (
    <loadingTemplate>
      <activityIndicator>
        <title>loadingTemplate</title>
      </activityIndicator>
    </loadingTemplate>
  );
}

function MenuBarScreen() {
  return (
    <menuBarTemplate>
      <MenuBar>
        <MenuBarItem id="one" title="menuBarTemplate">
          <stackTemplate>
            <collectionList>
              <shelf>
                <header>
                  <title>First tab</title>
                </header>
                <section>
                  <Posters seed="mb1" />
                </section>
              </shelf>
            </collectionList>
          </stackTemplate>
        </MenuBarItem>
        <MenuBarItem id="two" title="Second">
          <stackTemplate>
            <collectionList>
              <grid>
                <header>
                  <title>Second tab</title>
                </header>
                <section>
                  <Posters seed="mb2" count={12} />
                </section>
              </grid>
            </collectionList>
          </stackTemplate>
        </MenuBarItem>
      </MenuBar>
    </menuBarTemplate>
  );
}

function OneupScreen() {
  return (
    <oneupTemplate>
      <section>
        {range(5).map((i) => (
          <lockup key={i}>
            <img src={hero(`oneup${i}`)} />
            <title>oneupTemplate {i + 1}</title>
          </lockup>
        ))}
      </section>
    </oneupTemplate>
  );
}

function ParadeScreen() {
  return (
    <paradeTemplate>
      <list>
        <header>
          <title>paradeTemplate</title>
        </header>
        <section>
          {["Action", "Family", "Sci-Fi"].map((genre) => (
            <listItemLockup key={genre}>
              <title>{genre}</title>
            </listItemLockup>
          ))}
        </section>
        <relatedContent>
          <imgDeck>
            {range(5).map((i) => (
              <img key={i} src={poster(`parade${i}`)} />
            ))}
          </imgDeck>
        </relatedContent>
      </list>
    </paradeTemplate>
  );
}

function ProductBundleScreen() {
  return (
    <productBundleTemplate>
      <background />
      <banner>
        <stack>
          <title>productBundleTemplate</title>
          <row>
            <text>3 films</text>
            <text>2026</text>
          </row>
          <description>A bundle of related items.</description>
          <row>
            <buttonLockup>
              <badge src="resource://button-add" />
              <title>Buy</title>
            </buttonLockup>
          </row>
        </stack>
        <heroImg src={hero("bundle")} />
      </banner>
      <shelf>
        <header>
          <title>In this bundle</title>
        </header>
        <section>
          <Posters seed="bundle" count={3} />
        </section>
      </shelf>
    </productBundleTemplate>
  );
}

function ProductScreen() {
  return (
    <productTemplate>
      <background />
      <banner>
        <infoList>
          <info>
            <header>
              <title>Director</title>
            </header>
            <text>Someone</text>
          </info>
          <info>
            <header>
              <title>Starring</title>
            </header>
            <text>An actor</text>
            <text>Another</text>
          </info>
        </infoList>
        <stack>
          <title>productTemplate</title>
          <row>
            <text>2h 4m</text>
            <text>Drama</text>
            <textBadge>4K</textBadge>
            <badge src="resource://cc" />
          </row>
          <description handlesOverflow>
            {"A film about things that happen. ".repeat(10)}
          </description>
          <row>
            <buttonLockup>
              <badge src="resource://button-play" />
              <title>Play</title>
            </buttonLockup>
            <buttonLockup>
              <badge src="resource://button-add" />
              <title>Up Next</title>
            </buttonLockup>
          </row>
        </stack>
        <heroImg src={poster("product")} />
      </banner>
      <shelf>
        <header>
          <title>Viewers also watched</title>
        </header>
        <section>
          <Posters seed="product" />
        </section>
      </shelf>
      <shelf>
        <header>
          <title>Ratings and reviews</title>
        </header>
        <section>
          <ratingCard>
            <title>4.1 / 5</title>
            <ratingBadge value={0.82} />
            <description>Average of 2,000 ratings</description>
          </ratingCard>
          <reviewCard>
            <title>Great</title>
            <description>Loved it.</description>
            <text>A viewer</text>
          </reviewCard>
        </section>
      </shelf>
      <productInfo>
        <infoTable>
          <header>
            <title>Information</title>
          </header>
          <info>
            <header>
              <title>Studio</title>
            </header>
            <text>A studio</text>
          </info>
          <info>
            <header>
              <title>Runtime</title>
            </header>
            <text>2h 4m</text>
          </info>
        </infoTable>
      </productInfo>
    </productTemplate>
  );
}

function RatingScreen() {
  return (
    <ratingTemplate>
      <title>ratingTemplate</title>
      <ratingBadge value={0.6} />
    </ratingTemplate>
  );
}

function SearchScreen() {
  return (
    <searchTemplate>
      <searchField>searchTemplate</searchField>
      <collectionList>
        <grid>
          <header>
            <title>Popular</title>
          </header>
          <section>
            <Posters seed="search" count={10} />
          </section>
        </grid>
      </collectionList>
    </searchTemplate>
  );
}

function ShowcaseScreen() {
  return (
    <showcaseTemplate mode="showcase">
      <background />
      <banner>
        <title>showcaseTemplate</title>
        <row>
          <buttonLockup>
            <badge src="resource://button-play" />
            <title>Slideshow</title>
          </buttonLockup>
        </row>
      </banner>
      <carousel>
        <section>
          {range(6).map((i) => (
            <lockup key={i}>
              <img src={wide(`show${i}`)} width={960} height={540} />
              <title>Photo {i + 1}</title>
            </lockup>
          ))}
        </section>
      </carousel>
    </showcaseTemplate>
  );
}

function StackScreen() {
  return (
    <stackTemplate>
      <banner>
        <title>stackTemplate</title>
      </banner>
      <collectionList>
        <carousel>
          <section>
            {range(4).map((i) => (
              <lockup key={i}>
                <img src={wide(`stackc${i}`)} width={1740} height={500} />
              </lockup>
            ))}
          </section>
        </carousel>
        <shelf>
          <header>
            <title>A shelf</title>
          </header>
          <section>
            <Posters seed="stacks" />
          </section>
        </shelf>
        <grid>
          <header>
            <title>A grid</title>
          </header>
          <section>
            <Posters seed="stackg" count={10} />
          </section>
        </grid>
      </collectionList>
    </stackTemplate>
  );
}

// Lockup variants and decorations, in one stackTemplate.
function LockupsScreen() {
  return (
    <stackTemplate>
      <collectionList>
        <shelf>
          <header>
            <title>Lockups</title>
          </header>
          <section>
            <lockup>
              <img src={wide("lk1")} width={400} height={225} />
              <title>Overlay and progress</title>
              <overlay>
                <progressBar value={0.4} />
              </overlay>
            </lockup>
            <lockup>
              <img src={wide("lk2")} width={400} height={225} />
              <title>Text badge</title>
              <overlay>
                <textBadge>LIVE</textBadge>
              </overlay>
            </lockup>
            <lockup>
              <img src="https://invalid.example/missing.jpg" width={400} height={225} />
              <title>Missing image</title>
              <subtitle>What a failed load shows</subtitle>
            </lockup>
          </section>
        </shelf>
        <shelf>
          <header>
            <title>monogramLockup</title>
          </header>
          <section>
            {["Ada Lovelace", "Alan Turing", "Grace Hopper"].map((name) => {
              const [firstName, lastName] = name.split(" ");
              return (
                <monogramLockup key={name}>
                  <monogram firstName={firstName} lastName={lastName} />
                  <title>{name}</title>
                  <subtitle>Actor</subtitle>
                </monogramLockup>
              );
            })}
          </section>
        </shelf>
        <shelf>
          <header>
            <title>Built-in card</title>
          </header>
          <section>
            {/* Unstyled card text is small and black. */}
            <card style={{ width: 500, height: 200 }}>
              <title style={{ tvPosition: "top", tvAlign: "center", margin: 30, fontSize: 36, color: "white" }}>
                A card
              </title>
              <text style={{ tvPosition: "bottom", tvAlign: "center", margin: 30, fontSize: 28, color: "white" }}>
                Arranged with tv-position
              </text>
            </card>
          </section>
        </shelf>
        <row>
          <buttonLockup>
            <badge src="resource://button-play" />
            <title>buttonLockup</title>
          </buttonLockup>
          <buttonLockup>
            <badge src="symbol://heart" />
            <title>SF Symbol badge</title>
          </buttonLockup>
        </row>
      </collectionList>
    </stackTemplate>
  );
}

// Auto-playing previews inside a lockup.
function MediaContentScreen() {
  const clip = "https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8";
  return (
    <stackTemplate>
      <collectionList>
        <shelf>
          <header>
            <title>mediaContent</title>
          </header>
          <section>
            {(["focus", "always"] as const).map((mode) => (
              <lockup key={mode}>
                <mediaContent playbackMode={mode}>
                  <img src={wide(`mc${mode}`)} width={640} height={360} />
                  <video>
                    <asset src={clip} />
                  </video>
                </mediaContent>
                <title>playbackMode={mode}</title>
              </lockup>
            ))}
          </section>
        </shelf>
      </collectionList>
    </stackTemplate>
  );
}

export const SCREENS: Array<{ name: string; description: string; Screen: ComponentType }> = [
  { name: "alertTemplate", description: "A message with buttons.", Screen: AlertScreen },
  { name: "catalogTemplate", description: "Categories beside a grid.", Screen: CatalogScreen },
  { name: "compilationTemplate", description: "An album or season.", Screen: CompilationScreen },
  { name: "descriptiveAlertTemplate", description: "Long text with buttons.", Screen: DescriptiveAlertScreen },
  { name: "divTemplate", description: "Free-form nine-region layout.", Screen: DivScreen },
  { name: "formTemplate", description: "A single text field.", Screen: FormScreen },
  { name: "listTemplate", description: "A list with a preview panel.", Screen: ListScreen },
  { name: "loadingTemplate", description: "A spinner.", Screen: LoadingScreen },
  { name: "menuBarTemplate", description: "Tabs, each its own document.", Screen: MenuBarScreen },
  { name: "oneupTemplate", description: "Fullscreen images, one at a time.", Screen: OneupScreen },
  { name: "paradeTemplate", description: "A list beside an image deck.", Screen: ParadeScreen },
  { name: "productBundleTemplate", description: "A bundle of items.", Screen: ProductBundleScreen },
  { name: "productTemplate", description: "A single item's page.", Screen: ProductScreen },
  { name: "ratingTemplate", description: "Rate an item.", Screen: RatingScreen },
  { name: "searchTemplate", description: "A search field and results.", Screen: SearchScreen },
  { name: "showcaseTemplate", description: "A carousel of images.", Screen: ShowcaseScreen },
  { name: "stackTemplate", description: "Carousel, shelf and grid.", Screen: StackScreen },
  { name: "Lockups", description: "Overlays, badges, monograms, cards.", Screen: LockupsScreen },
  { name: "mediaContent", description: "Auto-playing previews.", Screen: MediaContentScreen },
  { name: "Layout", description: "tvml-react/layout rows and cells.", Screen: LayoutScreen },
  { name: "Events", description: "Select, play, long press, highlight.", Screen: EventsScreen },
  { name: "Player", description: "Audio and video with metadata.", Screen: PlayerScreen },
];
