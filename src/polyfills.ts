import {
  AbortControllerPolyfill,
  AbortSignalPolyfill,
  createFetch,
  HeadersPolyfill,
  ResponsePolyfill,
} from "./fetch.js";

// Polyfills required for React + scheduler to run inside the tvOS
// JavaScriptCore runtime. They must run before `react`/`scheduler` are
// evaluated: the `tvml-react` CLI/esbuild preset injects this module ahead of
// everything else, otherwise import it first from your entry point.

const globalScope = globalThis as unknown as {
  performance?: { now?: () => number };
  queueMicrotask?: (callback: () => void) => void;
  MessageChannel?: unknown;
  URL?: unknown;
  URLSearchParams?: unknown;
  fetch?: unknown;
  Headers?: unknown;
  Response?: unknown;
  AbortController?: unknown;
  AbortSignal?: unknown;
  XMLHttpRequest?: unknown;
};

if (
  typeof globalScope.performance !== "object" ||
  typeof globalScope.performance?.now !== "function"
) {
  globalScope.performance = { now: () => Date.now() };
}

if (typeof globalScope.queueMicrotask !== "function") {
  const resolved = Promise.resolve();
  globalScope.queueMicrotask = (callback: () => void) => {
    void resolved.then(callback).catch((error) => {
      setTimeout(() => {
        throw error;
      });
    });
  };
}

// The scheduler package prefers MessageChannel for yielding. JavaScriptCore on
// tvOS does not provide it; deleting any partial shim forces the setTimeout
// fallback path inside scheduler.
if (typeof globalScope.MessageChannel !== "function") {
  delete globalScope.MessageChannel;
}

// tvOS JavaScriptCore does not provide URL / URLSearchParams. Install minimal,
// spec-compatible-enough versions only when missing.
function decodeComponent(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, " "));
  } catch {
    return value;
  }
}

function encodeComponent(value: string): string {
  return encodeURIComponent(value).replace(/%20/g, "+");
}

class PolyfillURLSearchParams {
  private pairs: Array<[string, string]> = [];

  constructor(init?: string | Record<string, string> | PolyfillURLSearchParams) {
    if (!init) {
      return;
    }

    if (typeof init === "string") {
      const query = init.charAt(0) === "?" ? init.slice(1) : init;
      if (query) {
        for (const pair of query.split("&")) {
          if (!pair) {
            continue;
          }
          const eq = pair.indexOf("=");
          const key = eq === -1 ? pair : pair.slice(0, eq);
          const val = eq === -1 ? "" : pair.slice(eq + 1);
          this.pairs.push([decodeComponent(key), decodeComponent(val)]);
        }
      }
      return;
    }

    if (init instanceof PolyfillURLSearchParams) {
      this.pairs = init.pairs.map((pair) => [pair[0], pair[1]]);
      return;
    }

    for (const key of Object.keys(init)) {
      this.pairs.push([key, String(init[key])]);
    }
  }

  get(name: string): string | null {
    for (const pair of this.pairs) {
      if (pair[0] === name) {
        return pair[1];
      }
    }
    return null;
  }

  getAll(name: string): Array<string> {
    return this.pairs.filter((pair) => pair[0] === name).map((pair) => pair[1]);
  }

  has(name: string): boolean {
    return this.pairs.some((pair) => pair[0] === name);
  }

  set(name: string, value: string): void {
    const next: Array<[string, string]> = [];
    let placed = false;
    for (const pair of this.pairs) {
      if (pair[0] === name) {
        if (!placed) {
          next.push([name, String(value)]);
          placed = true;
        }
      } else {
        next.push(pair);
      }
    }
    if (!placed) {
      next.push([name, String(value)]);
    }
    this.pairs = next;
  }

  append(name: string, value: string): void {
    this.pairs.push([name, String(value)]);
  }

  delete(name: string): void {
    this.pairs = this.pairs.filter((pair) => pair[0] !== name);
  }

  toString(): string {
    return this.pairs
      .map((pair) => encodeComponent(pair[0]) + "=" + encodeComponent(pair[1]))
      .join("&");
  }
}

class PolyfillURL {
  href: string;
  protocol = "";
  host = "";
  hostname = "";
  pathname = "/";
  search: string;
  hash: string;
  searchParams: PolyfillURLSearchParams;

  constructor(url: string) {
    this.href = url;

    let rest = url;
    const hashIndex = rest.indexOf("#");
    this.hash = hashIndex === -1 ? "" : rest.slice(hashIndex);
    if (hashIndex !== -1) {
      rest = rest.slice(0, hashIndex);
    }

    const queryIndex = rest.indexOf("?");
    this.search = queryIndex === -1 ? "" : rest.slice(queryIndex);
    if (queryIndex !== -1) {
      rest = rest.slice(0, queryIndex);
    }

    this.searchParams = new PolyfillURLSearchParams(this.search);

    const match = /^([a-zA-Z][a-zA-Z0-9+.-]*:)\/\/([^/]*)(\/.*)?$/.exec(rest);
    if (!match) {
      throw new TypeError("Invalid URL: " + url);
    }

    this.protocol = match[1];
    this.host = match[2];
    this.hostname = match[2].split(":")[0];
    this.pathname = match[3] || "/";
  }

  toString(): string {
    return this.href;
  }
}

if (typeof globalScope.URLSearchParams !== "function") {
  globalScope.URLSearchParams = PolyfillURLSearchParams;
}

if (typeof globalScope.URL !== "function") {
  globalScope.URL = PolyfillURL;
}

// tvOS JavaScriptCore has XMLHttpRequest but no fetch / AbortController.
if (typeof globalScope.AbortController !== "function") {
  globalScope.AbortController = AbortControllerPolyfill;
  globalScope.AbortSignal = AbortSignalPolyfill;
}

if (
  typeof globalScope.fetch !== "function" &&
  typeof globalScope.XMLHttpRequest === "function"
) {
  globalScope.fetch = createFetch(
    globalScope.XMLHttpRequest as Parameters<typeof createFetch>[0],
  );
  globalScope.Headers = HeadersPolyfill;
  globalScope.Response = ResponsePolyfill;
}
