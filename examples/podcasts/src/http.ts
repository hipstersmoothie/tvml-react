// TVJS has no fetch or AbortController, so requests are XMLHttpRequest wrapped
// in a promise, cancelled through a tiny token instead of an AbortSignal.

export interface CancelToken {
  readonly cancelled: boolean;
  onCancel(fn: () => void): void;
}

export function createCancelToken(): CancelToken & { cancel(): void } {
  let cancelled = false;
  const listeners: Array<() => void> = [];
  return {
    get cancelled() {
      return cancelled;
    },
    onCancel(fn) {
      if (cancelled) fn();
      else listeners.push(fn);
    },
    cancel() {
      if (cancelled) return;
      cancelled = true;
      for (const fn of listeners) fn();
    },
  };
}

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export class CancelledError extends Error {
  constructor() {
    super("Request cancelled");
  }
}

export function requestText(url: string, token?: CancelToken): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.responseText);
      } else {
        reject(new HttpError(`${url} responded ${xhr.status}`, xhr.status));
      }
    };
    xhr.onerror = () => reject(new HttpError(`Couldn't reach ${hostOf(url)}`, 0));
    xhr.ontimeout = () => reject(new HttpError(`${hostOf(url)} timed out`, 0));
    xhr.timeout = 20000;
    token?.onCancel(() => {
      xhr.abort();
      reject(new CancelledError());
    });
    xhr.send();
  });
}

export async function requestJSON<T>(url: string, token?: CancelToken): Promise<T> {
  return JSON.parse(await requestText(url, token)) as T;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
