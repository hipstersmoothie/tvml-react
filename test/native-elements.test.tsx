import { afterEach, describe, expect, it } from "vitest";

import { createRoot, measureText, type TVMLRoot } from "../src/index.js";
import { Avatar, Backdrop, Card, QRCode, SimplifiedListRow } from "../src/native-elements.js";
import { FakeDocument } from "./fake-dom.js";

const roots: Array<TVMLRoot> = [];
afterEach(() => {
  for (const root of roots.splice(0)) root.unmount();
});

function render(element: React.ReactNode) {
  const doc = new FakeDocument();
  const root = createRoot(doc);
  roots.push(root);
  root.render(element);
  return doc;
}

describe("native element components", () => {
  it("render their tags with props as attributes", () => {
    const doc = render(
      <divTemplate>
        <Backdrop src="https://x/bg.jpg" dim={0.4} />
        <QRCode value="https://example.com" foreground="#112233" style={{ width: 200, height: 200 }} />
        <Avatar src="https://x/a.jpg" name="Miles Davis" />
        <Card title="T" subtitle="S" body="B" material="light" lines={3} />
      </divTemplate>,
    );
    expect(doc.toXML()).toBe(
      "<divTemplate>" +
        '<backdrop src="https://x/bg.jpg" dim="0.4" style="width: 1; height: 1; tv-position: top-left;"/>' +
        '<qrCode value="https://example.com" foreground="#112233" style="width: 200; height: 200;"/>' +
        '<avatar src="https://x/a.jpg" name="Miles Davis"/>' +
        '<materialCard title="T" subtitle="S" body="B" material="light" lines="3"/>' +
        "</divTemplate>",
    );
  });

  it("lets SimplifiedList rows take onSelect", () => {
    const doc = render(
      <divTemplate>
        <SimplifiedListRow title="One" onSelect={() => {}} />
      </divTemplate>,
    );
    expect(doc.toXML()).toBe('<divTemplate><simplifiedListRow title="One"/></divTemplate>');
  });
});

describe("measureText", () => {
  it("estimates without the native bridge", () => {
    const size = measureText("12:45", { fontSize: 100 });
    expect(size.width).toBeGreaterThan(200);
    expect(size.height).toBe(120);
  });

  it("place themselves with position", () => {
    const doc = new FakeDocument();
    const root = createRoot(doc);
    root.render(
      <divTemplate>
        <QRCode value="x" position="bottom" style={{ width: 200, height: 200 }} />
      </divTemplate>,
    );
    expect(doc.toXML()).toContain(
      '<qrCode value="x" style="tv-position: bottom; tv-align: center; width: 200; height: 200;"/>',
    );
    root.unmount();
  });
});
