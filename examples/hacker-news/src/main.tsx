import { QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { launch, type StartOptions } from "tvml-react";
import { TVMLQueryProvider } from "tvml-react/query";

import { App } from "./App";
import { HttpError } from "./lib/http";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retry a failed request once, unless the server said no (4xx).
      retry: (failureCount, error) =>
        failureCount < 1 && !(error instanceof HttpError && error.status >= 400 && error.status < 500),
    },
  },
});

// Wraps the tabs and every pushed screen, so they all share one cache.
function Providers({ children }: { children?: ReactNode }) {
  return <TVMLQueryProvider client={queryClient}>{children}</TVMLQueryProvider>;
}

export function start(_options: StartOptions) {
  launch(<App />, { errorTitle: "Hacker News crashed", wrapper: Providers });
}
