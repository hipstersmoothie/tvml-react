// TVJS has no `fetch`, so this is a small promise wrapper over XMLHttpRequest.

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export interface GetJSONOptions {
  /** Milliseconds before the request is aborted. */
  timeout?: number;
  headers?: Record<string, string>;
}

export function getJSON<T>(url: string, { timeout = 15_000, headers }: GetJSONOptions = {}): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const timer = setTimeout(() => {
      xhr.abort();
      reject(new HttpError(`Timed out: ${url}`, 0));
    }, timeout);

    xhr.open("GET", url);
    for (const [name, value] of Object.entries(headers ?? {})) {
      xhr.setRequestHeader(name, value);
    }
    xhr.onload = () => {
      clearTimeout(timer);
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new HttpError(`HTTP ${xhr.status}: ${url}`, xhr.status));
        return;
      }
      try {
        resolve(JSON.parse(xhr.responseText) as T);
      } catch (error) {
        reject(error);
      }
    };
    xhr.onerror = () => {
      clearTimeout(timer);
      reject(new HttpError(`Network error: ${url}`, 0));
    };
    xhr.send();
  });
}
