// A standard `WebSocket` for TVJS, backed by the native bridge's
// URLSessionWebSocketTask (native/…/WebSocketBridge.swift). The polyfills
// install it as the global `WebSocket` when the app was started with
// `TVMLReact.launch`.
//
// Differences from the browser: binary messages arrive as ArrayBuffer
// (`binaryType` is always "arraybuffer"; TVJS has no Blob), and
// `bufferedAmount` is always 0.

export interface WebSocketBridge {
  webSocketOpen(id: number, url: string, protocols: Array<string>): void;
  webSocketSend(id: number, data: string, isBinary: boolean): void;
  webSocketClose(id: number, code: number, reason: string): void;
  onWebSocketEvent?: ((id: number, type: string, a: unknown, b: unknown) => void) | null;
}

type Listener = (event: never) => void;

export interface WebSocketMessageEvent {
  type: "message";
  target: unknown;
  data: string | ArrayBuffer;
}

export interface WebSocketCloseEvent {
  type: "close";
  target: unknown;
  code: number;
  reason: string;
  wasClean: boolean;
}

export interface WebSocketPlainEvent {
  type: "open" | "error";
  target: unknown;
}

function toBase64(data: ArrayBuffer | ArrayBufferView): string {
  const bytes =
    data instanceof ArrayBuffer
      ? new Uint8Array(data)
      : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function fromBase64(data: string): ArrayBuffer {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function invalidState(message: string): Error {
  const error = new Error(message);
  error.name = "InvalidStateError";
  return error;
}

export interface TVMLWebSocket {
  readonly url: string;
  readonly readyState: number;
  readonly protocol: string;
  readonly extensions: string;
  readonly bufferedAmount: number;
  binaryType: "arraybuffer";
  onopen: ((event: WebSocketPlainEvent) => void) | null;
  onmessage: ((event: WebSocketMessageEvent) => void) | null;
  onerror: ((event: WebSocketPlainEvent) => void) | null;
  onclose: ((event: WebSocketCloseEvent) => void) | null;
  send(data: string | ArrayBuffer | ArrayBufferView): void;
  close(code?: number, reason?: string): void;
  addEventListener(type: string, listener: Listener): void;
  removeEventListener(type: string, listener: Listener): void;
  readonly CONNECTING: 0;
  readonly OPEN: 1;
  readonly CLOSING: 2;
  readonly CLOSED: 3;
}

export interface TVMLWebSocketConstructor {
  new (url: string | { toString(): string }, protocols?: string | Array<string>): TVMLWebSocket;
  readonly CONNECTING: 0;
  readonly OPEN: 1;
  readonly CLOSING: 2;
  readonly CLOSED: 3;
}

/** Build a `WebSocket` class that talks to `bridge`. */
export function createWebSocketClass(bridge: WebSocketBridge): TVMLWebSocketConstructor {
  const sockets = new Map<number, WebSocketImpl>();
  let nextId = 1;

  bridge.onWebSocketEvent = (id, type, a, b) => {
    sockets.get(id)?._receive(type, a, b);
  };

  class WebSocketImpl implements TVMLWebSocket {
    static readonly CONNECTING = 0 as const;
    static readonly OPEN = 1 as const;
    static readonly CLOSING = 2 as const;
    static readonly CLOSED = 3 as const;
    readonly CONNECTING = 0 as const;
    readonly OPEN = 1 as const;
    readonly CLOSING = 2 as const;
    readonly CLOSED = 3 as const;

    readonly url: string;
    readyState = 0;
    protocol = "";
    readonly extensions = "";
    readonly bufferedAmount = 0;
    binaryType: "arraybuffer" = "arraybuffer";

    onopen: ((event: WebSocketPlainEvent) => void) | null = null;
    onmessage: ((event: WebSocketMessageEvent) => void) | null = null;
    onerror: ((event: WebSocketPlainEvent) => void) | null = null;
    onclose: ((event: WebSocketCloseEvent) => void) | null = null;

    private readonly id = nextId++;
    private listeners = new Map<string, Set<Listener>>();

    constructor(url: string | { toString(): string }, protocols?: string | Array<string>) {
      this.url = String(url);
      const list = protocols === undefined ? [] : Array.isArray(protocols) ? protocols : [protocols];
      sockets.set(this.id, this);
      bridge.webSocketOpen(this.id, this.url, list);
    }

    send(data: string | ArrayBuffer | ArrayBufferView): void {
      if (this.readyState === WebSocketImpl.CONNECTING) {
        throw invalidState("WebSocket is still connecting");
      }
      if (this.readyState !== WebSocketImpl.OPEN) return;
      if (typeof data === "string") {
        bridge.webSocketSend(this.id, data, false);
      } else {
        bridge.webSocketSend(this.id, toBase64(data), true);
      }
    }

    close(code = 1000, reason = ""): void {
      if (this.readyState === WebSocketImpl.CLOSING || this.readyState === WebSocketImpl.CLOSED) {
        return;
      }
      this.readyState = WebSocketImpl.CLOSING;
      bridge.webSocketClose(this.id, code, reason);
    }

    addEventListener(type: string, listener: Listener): void {
      let set = this.listeners.get(type);
      if (!set) {
        set = new Set();
        this.listeners.set(type, set);
      }
      set.add(listener);
    }

    removeEventListener(type: string, listener: Listener): void {
      this.listeners.get(type)?.delete(listener);
    }

    private dispatch(
      event: WebSocketPlainEvent | WebSocketMessageEvent | WebSocketCloseEvent,
    ): void {
      const handler = this[`on${event.type}` as "onopen"] as ((e: never) => void) | null;
      handler?.call(this, event as never);
      for (const listener of this.listeners.get(event.type) ?? []) {
        (listener as (e: typeof event) => void)(event);
      }
    }

    /** @internal Called with events from the native bridge. */
    _receive(type: string, a: unknown, b: unknown): void {
      if (type === "open") {
        this.readyState = WebSocketImpl.OPEN;
        this.protocol = typeof a === "string" ? a : "";
        this.dispatch({ type: "open", target: this });
      } else if (type === "message") {
        if (this.readyState !== WebSocketImpl.OPEN) return;
        const data = b === true ? fromBase64(String(a)) : String(a);
        this.dispatch({ type: "message", target: this, data });
      } else if (type === "error") {
        this.dispatch({ type: "error", target: this });
      } else if (type === "close") {
        this.readyState = WebSocketImpl.CLOSED;
        sockets.delete(this.id);
        const code = typeof a === "number" ? a : 1006;
        this.dispatch({
          type: "close",
          target: this,
          code,
          reason: typeof b === "string" ? b : "",
          wasClean: code !== 1006,
        });
      }
    }
  }

  return WebSocketImpl;
}
