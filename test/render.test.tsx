import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createRoot, launch, type TVMLRoot } from "../src/index.js";
import { SimplifiedList, SimplifiedListRow } from "../src/simplified-list.js";
import { FakeDocument, FakeElement, installTVJSGlobals } from "./fake-dom.js";

const roots: Array<TVMLRoot> = [];

function setup() {
  const doc = new FakeDocument();
  const root = createRoot(doc);
  roots.push(root);
  return { doc, root };
}

function byId(doc: FakeDocument, id: string): FakeElement {
  const element = doc.getElementById(id);
  if (!element) {
    throw new Error(`no element #${id}`);
  }
  return element;
}

// State updates triggered from events go through React's scheduler.
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(() => {
  for (const root of roots.splice(0)) {
    root.unmount();
  }
});

describe("rendering", () => {
  it("renders a TVML tree synchronously", () => {
    const { doc, root } = setup();

    root.render(
      <alertTemplate theme="dark">
        <title>Hello</title>
        <description>From React</description>
      </alertTemplate>,
    );

    expect(doc.toXML()).toBe(
      '<alertTemplate theme="dark"><title>Hello</title>' +
        "<description>From React</description></alertTemplate>",
    );
  });

  // libxml2 merges adjacent text nodes and frees one, which crashes TVMLKit
  // when React's handle to it is garbage collected.
  it("writes text-only children as a single text node", () => {
    const { doc, root } = setup();
    function Track({ n, extra }: { n: number; extra?: boolean }) {
      return (
        <title id="t">
          Track {n}
          {extra && "!"}
        </title>
      );
    }

    root.render(<Track n={1} />);
    const title = byId(doc, "t");
    expect(title.children).toHaveLength(1);
    expect(title.textContent).toBe("Track 1");
    const node = title.firstChild;

    root.render(<Track n={2} extra />);
    expect(title.children).toHaveLength(1);
    expect(title.firstChild).toBe(node);
    expect(title.textContent).toBe("Track 2!");
  });

  it("warns about adjacent text next to elements", () => {
    const { root } = setup();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const name = "Ada";
    root.render(
      <buttonLockup>
        Hi {name}
        <badge src="resource://button-play" />
      </buttonLockup>,
    );
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("<buttonLockup> has adjacent text"));
    warn.mockRestore();
  });

  it("switches between text and element children", () => {
    const { doc, root } = setup();
    function Row({ rich }: { rich: boolean }) {
      return <row id="r">{rich ? <text>rich</text> : `plain ${1}`}</row>;
    }

    root.render(<Row rich={false} />);
    expect(byId(doc, "r").textContent).toBe("plain 1");

    root.render(<Row rich />);
    expect(doc.toXML()).toBe('<row id="r"><text>rich</text></row>');

    root.render(<Row rich={false} />);
    expect(doc.toXML()).toBe('<row id="r">plain 1</row>');
  });

  it("serializes style objects, className and booleans", () => {
    const { doc, root } = setup();

    root.render(
      <stackTemplate>
        <banner
          id="banner"
          className="hero"
          style={{ tvAlign: "center", fontSize: 40, color: false }}
        />
        <lockup id="lockup" disabled autoHighlight={false} />
      </stackTemplate>,
    );

    const banner = byId(doc, "banner");
    expect(banner.getAttribute("class")).toBe("hero");
    expect(banner.getAttribute("style")).toBe("tv-align: center; font-size: 40;");

    const lockup = byId(doc, "lockup");
    expect(lockup.getAttribute("disabled")).toBe("true");
    expect(lockup.getAttribute("autoHighlight")).toBeNull();
  });

  it("updates, removes and skips identical attributes", () => {
    const { doc, root } = setup();

    root.render(
      <divTemplate>
        <text id="t" style={{ color: "white" }} accessibilityText="a">
          one
        </text>
      </divTemplate>,
    );
    const text = byId(doc, "t");
    const writes = text.setAttributeCalls;

    // A fresh but identical style object must not be rewritten.
    root.render(
      <divTemplate>
        <text id="t" style={{ color: "white" }}>
          two
        </text>
      </divTemplate>,
    );

    expect(text.setAttributeCalls).toBe(writes);
    expect(text.getAttribute("accessibilityText")).toBeNull();
    expect(text.textContent).toBe("two");
  });

  it("swaps the root template", () => {
    const { doc, root } = setup();

    root.render(<loadingTemplate />);
    expect(doc.toXML()).toBe("<loadingTemplate/>");

    root.render(
      <stackTemplate>
        <title>Ready</title>
      </stackTemplate>,
    );
    expect(doc.toXML()).toBe("<stackTemplate><title>Ready</title></stackTemplate>");
  });

  it("forwards refs to TVML elements", () => {
    const { doc, root } = setup();
    let ref: unknown = null;

    root.render(
      <stackTemplate>
        <title id="t" ref={(element) => void (ref = element)}>
          hi
        </title>
      </stackTemplate>,
    );

    expect(ref).toBe(byId(doc, "t"));
  });

  it("clears the document and listeners on unmount", () => {
    const doc = new FakeDocument();
    const root = createRoot(doc);

    root.render(<loadingTemplate />);
    expect(doc.listenerCount()).toBeGreaterThan(0);

    root.unmount();
    expect(doc.toXML()).toBe("");
    expect(doc.listenerCount()).toBe(0);
  });
});

describe("native components", () => {
  it("render their native tag with props as attributes", () => {
    const { doc, root } = setup();

    root.render(
      <divTemplate>
        <SimplifiedList summary="History" style={{ height: 800 }}>
          <SimplifiedListRow title="Song" accessory="now" />
        </SimplifiedList>
      </divTemplate>,
    );

    expect(doc.toXML()).toBe(
      '<divTemplate><simplifiedList summary="History" style="height: 800;">' +
        '<simplifiedListRow title="Song" accessory="now"/>' +
        "</simplifiedList></divTemplate>",
    );
  });
});

describe("events", () => {
  it("delegates select to the nearest handler", () => {
    const { doc, root } = setup();
    const onSelect = vi.fn();

    root.render(
      <stackTemplate>
        <lockup id="lockup" onSelect={onSelect}>
          <title id="title">Album</title>
        </lockup>
      </stackTemplate>,
    );

    doc.dispatch("select", byId(doc, "title"));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0]).toMatchObject({ type: "select" });
  });

  it("keeps event types separate", () => {
    const { doc, root } = setup();
    const onSelect = vi.fn();
    const onHighlight = vi.fn();
    const onPlay = vi.fn();
    const onHoldSelect = vi.fn();

    root.render(
      <stackTemplate>
        <lockup
          id="lockup"
          onSelect={onSelect}
          onHighlight={onHighlight}
          onPlay={onPlay}
          onHoldSelect={onHoldSelect}
        />
      </stackTemplate>,
    );
    const lockup = byId(doc, "lockup");

    doc.dispatch("highlight", lockup);
    doc.dispatch("play", lockup);
    doc.dispatch("holdselect", lockup);

    expect(onSelect).not.toHaveBeenCalled();
    expect(onHighlight).toHaveBeenCalledTimes(1);
    expect(onPlay).toHaveBeenCalledTimes(1);
    expect(onHoldSelect).toHaveBeenCalledTimes(1);
  });

  it("stops calling a handler once the prop is removed", () => {
    const { doc, root } = setup();
    const onSelect = vi.fn();

    root.render(
      <stackTemplate>
        <button id="b" onSelect={onSelect} />
      </stackTemplate>,
    );
    root.render(
      <stackTemplate>
        <button id="b" />
      </stackTemplate>,
    );

    doc.dispatch("select", byId(doc, "b"));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("re-renders from state updated in a handler", async () => {
    const { doc, root } = setup();

    function Counter() {
      const [count, setCount] = useState(0);
      return (
        <stackTemplate>
          <button id="b" onSelect={() => setCount((c) => c + 1)}>
            <text id="label">{`Pressed ${count}`}</text>
          </button>
        </stackTemplate>
      );
    }

    root.render(<Counter />);
    doc.dispatch("select", byId(doc, "label"));
    await flush();

    expect(byId(doc, "label").textContent).toBe("Pressed 1");
  });
});

describe("launch", () => {
  it("renders and presents a new document", () => {
    const globals = installTVJSGlobals();
    try {
      const root = launch(
        <alertTemplate>
          <title>Hi</title>
        </alertTemplate>,
      );
      if (root) {
        roots.push(root);
      }

      expect(globals.navigation.documents).toEqual([root?.document]);
      expect((root?.document as FakeDocument).toXML()).toBe(
        "<alertTemplate><title>Hi</title></alertTemplate>",
      );
    } finally {
      globals.restore();
    }
  });

  it("shows an alert in place of a screen that throws", () => {
    const globals = installTVJSGlobals();
    const onError = vi.fn();
    try {
      function Broken(): never {
        throw new Error("kaboom");
      }

      const root = launch(<Broken />, { errorTitle: "Oops", onError });
      if (root) roots.push(root);

      expect(onError).toHaveBeenCalled();
      expect(globals.navigation.documents).toEqual([root?.document]);
      const xml = (root?.document as FakeDocument).toXML();
      expect(xml).toContain("<alertTemplate><title>Oops</title>");
      expect(xml).toContain("kaboom");
    } finally {
      globals.restore();
    }
  });
});
