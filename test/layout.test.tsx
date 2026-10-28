import { afterEach, describe, expect, it, vi } from "vitest";

import { createRoot, type TVMLRoot } from "../src/index.js";
import { Cell, Columns, CONTENT_WIDTH, Image, Row, Screen, Spacer } from "../src/layout.js";
import { FakeDocument } from "./fake-dom.js";

const roots: Array<TVMLRoot> = [];

function render(element: React.ReactNode): string {
  const doc = new FakeDocument();
  const root = createRoot(doc);
  roots.push(root);
  root.render(element);
  return doc.toXML();
}

afterEach(() => {
  for (const root of roots.splice(0)) root.unmount();
  vi.restoreAllMocks();
});

const ROW = '<row style="tv-position: center; width: 1920;">';

describe("layout", () => {
  it("left-aligns a row in the safe area by filling the rest", () => {
    expect(
      render(
        <Row>
          <Cell width={100} color="red">
            a
          </Cell>
        </Row>,
      ),
    ).toBe(
      ROW +
        '<text style="width: 100; text-align: left; color: red; tv-text-max-lines: 1;">a</text>' +
        `<text style="width: ${CONTENT_WIDTH - 100};"> </text></row>`,
    );
  });

  it("right-aligns, centers, and counts gaps and offsets", () => {
    const right = render(
      <Row align="right" gap={20}>
        <Cell width={100}>a</Cell>
        <Spacer width={30} />
        <Image src="x" width={200} height={50} offset={10} />
      </Row>,
    );
    // 100 + 30 + 210 + 2 gaps = 380; the spacer takes the rest minus its own gap.
    expect(right).toMatch(
      new RegExp(`^<row style="[^"]*tv-interitem-spacing: 20;"><text style="width: ${CONTENT_WIDTH - 380 - 20};"> </text>`),
    );
    expect(right).toContain('<img src="x" style="width: 200; height: 50; margin: 0 0 0 10;"/>');

    const centered = render(
      <Row align="center">
        <Cell width={100}>a</Cell>
      </Row>,
    );
    expect(centered).not.toContain("> </text>");
  });

  it("sizes cells without a width to their text", () => {
    // No native bridge in tests: measureText estimates 0.55em per character.
    expect(render(<Cell size={40}>abc</Cell>)).toContain("width: 70;");
  });

  it("colors text from the Screen, white by default and black with the light theme", () => {
    expect(
      render(
        <Screen background="bg.jpg">
          <Row>
            <Cell width={10}>a</Cell>
          </Row>
        </Screen>,
      ),
    ).toMatch(/^<divTemplate><background><img src="bg.jpg"\/><\/background><row[^>]*><text style="[^"]*color: white;/);
    expect(
      render(
        <Screen theme="light">
          <Cell width={10}>a</Cell>
        </Screen>,
      ),
    ).toContain("color: black;");
  });

  it("keeps empty cells from collapsing", () => {
    expect(render(<Cell width={10}>{""}</Cell>)).toContain("> </text>");
  });

  it("renders columns as rows of cells", () => {
    const xml = render(
      <Columns
        region="bottom"
        columns={[
          { key: "a", width: 100, lines: ["1", "x"] },
          { key: "b", width: 100, lines: ["2"] },
        ]}
        lineStyles={[{ size: 20 }, { size: 30 }]}
      />,
    );
    expect(xml.match(/<row /g)).toHaveLength(2);
    expect(xml).toContain('<text style="width: 100; text-align: center; font-size: 30; color: white; tv-text-max-lines: 1;"> </text>');
  });

  it("warns when a row overflows the safe area", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <Row>
        <Cell width={CONTENT_WIDTH + 1}>a</Cell>
      </Row>,
    );
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("1pt wider than the safe area"));
  });

  it("lays out across the whole screen with bleed", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const xml = render(
      <Row bleed>
        <Image src="x" width={1920} height={800} />
      </Row>,
    );
    expect(warn).not.toHaveBeenCalled();
    expect(xml).not.toContain("> </text>");
  });
});

describe("divTemplate checks", () => {
  it("warns about styles divTemplate ignores", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <divTemplate>
        <row style={{ backgroundColor: "red" }}>
          <stack>
            <text style={{ color: "white", margin: "10 0 0 0" }}>a</text>
          </stack>
        </row>
        <img src="x" width={10} />
        <title>untitled</title>
      </divTemplate>,
    );
    const messages = warn.mock.calls.map(([message]) => String(message));
    for (const expected of [
      "background-color on <row>",
      "a <stack> without a style width",
      "a <stack> inside a <row>",
      "<img>'s width and height attributes",
      "<title> without a color",
    ]) {
      expect(messages.some((message) => message.includes(expected))).toBe(true);
    }
  });

  it("doesn't flag spacers", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <Screen>
        <Row>
          <Cell width={100}>a</Cell>
          <Spacer width={10} />
        </Row>
      </Screen>,
    );
    expect(warn).not.toHaveBeenCalled();
  });

  it("leaves other templates alone", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <stackTemplate>
        <banner>
          <title>plain</title>
        </banner>
      </stackTemplate>,
    );
    expect(warn).not.toHaveBeenCalled();
  });
});
