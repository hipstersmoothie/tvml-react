// TVJS has no `fetch` and no `AbortController`, only XMLHttpRequest. This is
// the smallest promise-based wrapper that still supports cancellation,
// timeouts and typed JSON responses.

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly url: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/** A minimal stand-in for AbortSignal (TVJS has no AbortController). */
export interface CancelSignal {
  readonly cancelled: boolean;
  onCancel(listener: () => void): () => void;
}

export function createCancelToken(): { signal: CancelSignal; cancel(): void } {
  let cancelled = false;
  const listeners = new Set<() => void>();
  return {
    signal: {
      get cancelled() {
        return cancelled;
      },
      onCancel(listener) {
        if (cancelled) {
          listener();
          return () => {};
        }
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    },
    cancel() {
      if (cancelled) return;
      cancelled = true;
      for (const listener of listeners) listener();
      listeners.clear();
    },
  };
}

export class CancelledError extends Error {
  constructor() {
    super("Request cancelled");
    this.name = "CancelledError";
  }
}

export interface RequestOptions {
  signal?: CancelSignal;
  /** Milliseconds. Defaults to 15s. */
  timeout?: number;
}

export function getJSON<T>(url: string, { signal, timeout = 15_000 }: RequestOptions = {}): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (signal?.cancelled) {
      reject(new CancelledError());
      return;
    }
    const xhr = new XMLHttpRequest();
    const stop = signal?.onCancel(() => {
      xhr.abort();
      reject(new CancelledError());
    });
    xhr.open("GET", url);
    xhr.timeout = timeout;
    xhr.setRequestHeader("Accept", "application/json");
    xhr.onload = () => {
      stop?.();
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new HttpError(`HTTP ${xhr.status} from ${new URL(url).host}`, xhr.status, url));
        return;
      }
      try {
        resolve(JSON.parse(xhr.responseText) as T);
      } catch {
        reject(new HttpError(`Invalid JSON from ${new URL(url).host}`, xhr.status, url));
      }
    };
    xhr.onerror = () => {
      stop?.();
      reject(new HttpError(`Couldn't reach ${new URL(url).host}`, 0, url));
    };
    xhr.ontimeout = () => {
      stop?.();
      reject(new HttpError(`${new URL(url).host} timed out`, 0, url));
    };
    xhr.send();
  });
}

/** Map over `items` with at most `limit` promises in flight. */
export async function mapLimit<T, R>(
  items: ReadonlyArray<T>,
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<Array<R>> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]!);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
