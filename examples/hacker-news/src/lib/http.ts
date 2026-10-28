// Typed JSON over `fetch` (polyfilled by tvml-react on TVJS), with a timeout
// and errors worth showing on screen.

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

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

export interface RequestOptions {
  signal?: AbortSignal;
  /** Milliseconds. Defaults to 15s. */
  timeout?: number;
}

export async function getJSON<T>(url: string, { signal, timeout = 15_000 }: RequestOptions = {}): Promise<T> {
  const host = new URL(url).host;
  // Abort on the caller's signal or the timeout, whichever comes first.
  const controller = new AbortController();
  const forward = () => controller.abort(signal?.reason);
  if (signal?.aborted) forward();
  signal?.addEventListener("abort", forward);
  const timer = setTimeout(() => controller.abort(new HttpError(`${host} timed out`, 0, url)), timeout);

  try {
    const response = await fetch(url, { headers: { Accept: "application/json" }, signal: controller.signal });
    if (!response.ok) throw new HttpError(`HTTP ${response.status} from ${host}`, response.status, url);
    try {
      return (await response.json()) as T;
    } catch {
      throw new HttpError(`Invalid JSON from ${host}`, response.status, url);
    }
  } catch (error) {
    // fetch rejects with a TypeError when the server can't be reached.
    throw error instanceof TypeError ? new HttpError(`Couldn't reach ${host}`, 0, url) : error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", forward);
  }
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
