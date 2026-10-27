import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createRoot, launch, type TVMLRoot } from "../src/index.js";
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

  it("presents an alert when the first render throws", () => {
    const globals = installTVJSGlobals();
    const onError = vi.fn();
    try {
      function Broken(): never {
        throw new Error("kaboom");
      }

      const root = launch(<Broken />, { errorTitle: "Oops", onError });

      expect(root).toBeUndefined();
      expect(onError).toHaveBeenCalled();
      expect(globals.navigation.documents).toHaveLength(1);
      const alert = globals.parsed.at(-1) ?? "";
      expect(alert).toContain("<title>Oops</title>");
      expect(alert).toContain("kaboom");
    } finally {
      globals.restore();
    }
  });
});
