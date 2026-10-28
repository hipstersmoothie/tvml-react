import { describe, expect, it, vi } from "vitest";

import { createWebSocketClass, type WebSocketBridge } from "../src/websocket.js";

function setup() {
  const calls: Array<[string, ...Array<unknown>]> = [];
  const bridge: WebSocketBridge = {
    webSocketOpen: (...args) => void calls.push(["open", ...args]),
    webSocketSend: (...args) => void calls.push(["send", ...args]),
    webSocketClose: (...args) => void calls.push(["close", ...args]),
  };
  const WebSocket = createWebSocketClass(bridge);
  const fire = (id: number, type: string, a?: unknown, b?: unknown) =>
    bridge.onWebSocketEvent?.(id, type, a, b);
  return { WebSocket, calls, fire };
}

describe("WebSocket polyfill", () => {
  it("opens, exchanges text and closes", () => {
    const { WebSocket, calls, fire } = setup();
    const ws = new WebSocket("wss://example.com/socket", "chat");
    const id = calls[0][1] as number;
    expect(calls[0]).toEqual(["open", id, "wss://example.com/socket", ["chat"]]);
    expect(ws.readyState).toBe(WebSocket.CONNECTING);
    expect(() => ws.send("too early")).toThrow(/connecting/);

    const onopen = vi.fn();
    const messages: Array<unknown> = [];
    ws.onopen = onopen;
    ws.addEventListener("message", (event: { data: unknown }) => messages.push(event.data));

    fire(id, "open", "chat");
    expect(ws.readyState).toBe(WebSocket.OPEN);
    expect(ws.protocol).toBe("chat");
    expect(onopen).toHaveBeenCalledTimes(1);

    ws.send("hello");
    expect(calls.at(-1)).toEqual(["send", id, "hello", false]);

    fire(id, "message", "hi back", false);
    expect(messages).toEqual(["hi back"]);

    const onclose = vi.fn();
    ws.onclose = onclose;
    ws.close(1000, "bye");
    expect(ws.readyState).toBe(WebSocket.CLOSING);
    expect(calls.at(-1)).toEqual(["close", id, 1000, "bye"]);

    fire(id, "close", 1000, "bye");
    expect(ws.readyState).toBe(WebSocket.CLOSED);
    expect(onclose.mock.calls[0][0]).toMatchObject({ code: 1000, reason: "bye", wasClean: true });

    // Events for a closed socket are ignored.
    fire(id, "message", "late", false);
    expect(messages).toEqual(["hi back"]);
  });

  it("sends and receives binary as base64 over the bridge", () => {
    const { WebSocket, calls, fire } = setup();
    const ws = new WebSocket("wss://example.com");
    const id = calls[0][1] as number;
    fire(id, "open", "");

    ws.send(new Uint8Array([1, 2, 255]));
    expect(calls.at(-1)).toEqual(["send", id, btoa("\x01\x02\xff"), true]);

    let received: ArrayBuffer | undefined;
    ws.onmessage = (event) => void (received = event.data as ArrayBuffer);
    fire(id, "message", btoa("\x07\x08"), true);
    expect([...new Uint8Array(received!)]).toEqual([7, 8]);
  });

  it("keeps sockets apart and reports abnormal closes", () => {
    const { WebSocket, calls, fire } = setup();
    const a = new WebSocket("wss://a");
    const b = new WebSocket("wss://b");
    const [idA, idB] = [calls[0][1] as number, calls[1][1] as number];
    expect(idA).not.toBe(idB);

    const errors = vi.fn();
    const closes: Array<{ code: number; wasClean: boolean }> = [];
    b.onerror = errors;
    b.onclose = (event) => void closes.push(event);
    fire(idB, "error");
    fire(idB, "close", 1006, "");

    expect(errors).toHaveBeenCalledTimes(1);
    expect(closes).toEqual([expect.objectContaining({ code: 1006, wasClean: false })]);
    expect(a.readyState).toBe(WebSocket.CONNECTING);
  });
});
