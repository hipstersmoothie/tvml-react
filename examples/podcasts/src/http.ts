// GET helpers over the `fetch` / `AbortController` that tvml-react installs in
// TVJS (which has neither). Network failures, timeouts and HTTP errors become
// RequestErrors with a message a screen can show as is. A cancelled request
// (TanStack Query aborting `signal`) rethrows the abort untouched.

const TIMEOUT = 20 * 1000;

export class RequestError extends Error {
  /** Whether trying again might help (network trouble, timeouts, 5xx). */
  readonly retryable: boolean;

  constructor(message: string, retryable: boolean) {
    super(message);
    this.name = "RequestError";
    this.retryable = retryable;
  }
}

export async function requestText(url: string, signal?: AbortSignal): Promise<string> {
  const timeout = AbortSignal.timeout(TIMEOUT);
  let response: Response;
  try {
    response = await fetch(url, { signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
  } catch (error) {
    if (signal?.aborted) throw error;
    if (timeout.aborted) throw new RequestError(`${hostOf(url)} took too long to respond`, true);
    throw new RequestError(`Couldn't reach ${hostOf(url)}`, true);
  }
  if (!response.ok) {
    const { status } = response;
    throw new RequestError(`${hostOf(url)} responded ${status}`, status >= 500 || status === 429);
  }
  return response.text();
}

export async function requestJSON<T>(url: string, signal?: AbortSignal): Promise<T> {
  return JSON.parse(await requestText(url, signal)) as T;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
