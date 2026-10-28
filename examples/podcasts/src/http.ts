// GET helpers over the `fetch` / `AbortController` that tvml-react installs in
// TVJS (which has neither). Network failures and HTTP errors become messages a
// screen can show as is.

export async function requestText(url: string, signal?: AbortSignal): Promise<string> {
  let response: Response;
  try {
    response = await fetch(url, { signal });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error(`Couldn't reach ${hostOf(url)}`);
  }
  if (!response.ok) {
    throw new Error(`${hostOf(url)} responded ${response.status}`);
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
