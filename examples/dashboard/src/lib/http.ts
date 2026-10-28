// tvml-react polyfills `fetch` and `AbortController` for TVJS.

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/**
 * GET a JSON body. Pass TanStack Query's `signal` so a cancelled query aborts
 * its request; a request that hangs for `timeout` ms fails (and is retried)
 * instead of holding up every later refetch of that query.
 */
export async function getJSON<T>(url: string, signal?: AbortSignal, timeout = 15_000): Promise<T> {
  const deadline = AbortSignal.timeout(timeout);
  const response = await fetch(url, { signal: signal ? AbortSignal.any([signal, deadline]) : deadline });
  if (!response.ok) throw new HttpError(`HTTP ${response.status}: ${url}`, response.status);
  return (await response.json()) as T;
}
