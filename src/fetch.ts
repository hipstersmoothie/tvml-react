// A small `fetch` + `AbortController` over XMLHttpRequest for TVJS, which has
// neither. Enough for JSON APIs and libraries that expect fetch (TanStack
// Query, SWR, ...): method, headers, string body, `signal`, and a Response with
// ok/status/statusText/url/headers and text()/json(). No streaming or blobs.
//
// TVJS quirk handled here: XMLHttpRequest fires `error` (not `load`) for HTTP
// errors like 404, with status/body intact. Only status 0 is a network error.

type Listener = () => void;

export class AbortSignalPolyfill {
  aborted = false;
  reason: unknown = undefined;
  onabort: ((this: AbortSignalPolyfill) => void) | null = null;
  private listeners = new Set<Listener>();

  addEventListener(type: string, listener: Listener): void {
    if (type === "abort") this.listeners.add(listener);
  }

  removeEventListener(type: string, listener: Listener): void {
    if (type === "abort") this.listeners.delete(listener);
  }

  throwIfAborted(): void {
    if (this.aborted) throw this.reason;
  }

  /** A signal that aborts after `ms` milliseconds. */
  static timeout(ms: number): AbortSignalPolyfill {
    const signal = new AbortSignalPolyfill();
    setTimeout(() => {
      const error = new Error("The operation timed out.");
      error.name = "TimeoutError";
      signal._abort(error);
    }, ms);
    return signal;
  }

  /** A signal that aborts when any of `signals` does. */
  static any(signals: Array<AbortSignalPolyfill>): AbortSignalPolyfill {
    const combined = new AbortSignalPolyfill();
    const cleanups: Array<() => void> = [];
    const done = (reason: unknown) => {
      for (const cleanup of cleanups) cleanup();
      combined._abort(reason);
    };
    for (const signal of signals) {
      if (signal.aborted) {
        done(signal.reason);
        break;
      }
      const onAbort = () => done(signal.reason);
      signal.addEventListener("abort", onAbort);
      cleanups.push(() => signal.removeEventListener("abort", onAbort));
    }
    return combined;
  }

  /** @internal */
  _abort(reason: unknown): void {
    if (this.aborted) return;
    this.aborted = true;
    this.reason = reason;
    this.onabort?.call(this);
    for (const listener of [...this.listeners]) listener();
  }
}

function abortError(): Error {
  const error = new Error("The operation was aborted.");
  error.name = "AbortError";
  return error;
}

export class AbortControllerPolyfill {
  readonly signal = new AbortSignalPolyfill();

  abort(reason: unknown = abortError()): void {
    this.signal._abort(reason);
  }
}

export class HeadersPolyfill {
  private map = new Map<string, string>();

  constructor(init?: Record<string, string> | Array<[string, string]> | HeadersPolyfill) {
    if (!init) return;
    if (init instanceof HeadersPolyfill) {
      init.forEach((value, key) => this.set(key, value));
    } else if (Array.isArray(init)) {
      for (const [key, value] of init) this.append(key, value);
    } else {
      for (const key of Object.keys(init)) this.set(key, init[key]);
    }
  }

  get(name: string): string | null {
    return this.map.get(name.toLowerCase()) ?? null;
  }
  has(name: string): boolean {
    return this.map.has(name.toLowerCase());
  }
  set(name: string, value: string): void {
    this.map.set(name.toLowerCase(), String(value));
  }
  append(name: string, value: string): void {
    const key = name.toLowerCase();
    const existing = this.map.get(key);
    this.map.set(key, existing ? `${existing}, ${value}` : String(value));
  }
  delete(name: string): void {
    this.map.delete(name.toLowerCase());
  }
  forEach(callback: (value: string, key: string) => void): void {
    this.map.forEach((value, key) => callback(value, key));
  }
  entries(): IterableIterator<[string, string]> {
    return this.map.entries();
  }
  [Symbol.iterator](): IterableIterator<[string, string]> {
    return this.map.entries();
  }
}

function parseHeaders(raw: string): HeadersPolyfill {
  const headers = new HeadersPolyfill();
  for (const line of raw.split(/\r?\n/)) {
    const index = line.indexOf(":");
    if (index > 0) {
      headers.append(line.slice(0, index).trim(), line.slice(index + 1).trim());
    }
  }
  return headers;
}

export class ResponsePolyfill {
  readonly ok: boolean;
  readonly headers: HeadersPolyfill;
  bodyUsed = false;

  constructor(
    private body: string,
    init: { status: number; statusText?: string; headers?: HeadersPolyfill; url?: string },
  ) {
    this.status = init.status;
    this.statusText = init.statusText ?? "";
    this.headers = init.headers ?? new HeadersPolyfill();
    this.url = init.url ?? "";
    this.ok = this.status >= 200 && this.status < 300;
  }

  readonly status: number;
  readonly statusText: string;
  readonly url: string;

  async text(): Promise<string> {
    this.bodyUsed = true;
    return this.body;
  }

  async json(): Promise<unknown> {
    return JSON.parse(await this.text());
  }

  clone(): ResponsePolyfill {
    return new ResponsePolyfill(this.body, this);
  }
}

export interface FetchInit {
  method?: string;
  headers?: Record<string, string> | Array<[string, string]> | HeadersPolyfill;
  body?: string | null;
  signal?: AbortSignalPolyfill | null;
  /** Non-standard: fail with a TypeError after this many milliseconds. */
  timeout?: number;
}

interface XHRLike {
  status: number;
  statusText: string;
  responseText: string;
  readyState: number;
  timeout?: number;
  onload: (() => void) | null;
  onerror: (() => void) | null;
  ontimeout?: (() => void) | null;
  open(method: string, url: string): void;
  setRequestHeader(name: string, value: string): void;
  getAllResponseHeaders(): string;
  send(body?: string | null): void;
  abort(): void;
}

export function createFetch(XHR: new () => XHRLike) {
  return function fetch(input: string | { url: string }, init: FetchInit = {}) {
    const url = typeof input === "string" ? input : input.url;
    const { signal } = init;

    return new Promise<ResponsePolyfill>((resolve, reject) => {
      if (signal?.aborted) {
        reject(signal.reason ?? abortError());
        return;
      }

      const xhr = new XHR();
      let settled = false;
      const onAbort = () => {
        if (settled) return;
        settled = true;
        xhr.abort();
        reject(signal?.reason ?? abortError());
      };

      const settle = () => {
        if (settled) return;
        settled = true;
        signal?.removeEventListener("abort", onAbort);
        if (xhr.status === 0) {
          reject(new TypeError("Network request failed"));
          return;
        }
        resolve(
          new ResponsePolyfill(xhr.responseText ?? "", {
            status: xhr.status,
            statusText: xhr.statusText,
            headers: parseHeaders(xhr.getAllResponseHeaders() ?? ""),
            url,
          }),
        );
      };

      xhr.open((init.method ?? "GET").toUpperCase(), url);
      new HeadersPolyfill(init.headers).forEach((value, key) =>
        xhr.setRequestHeader(key, value),
      );
      xhr.onload = settle;
      // TVJS reports HTTP errors through onerror; settle() tells them apart.
      xhr.onerror = settle;
      if (init.timeout) xhr.timeout = init.timeout;
      xhr.ontimeout = () => {
        if (settled) return;
        settled = true;
        reject(new TypeError("Network request timed out"));
      };
      signal?.addEventListener("abort", onAbort);
      xhr.send(init.body ?? null);
    });
  };
}
