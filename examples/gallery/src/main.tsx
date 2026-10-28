import { QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { launch, type StartOptions } from "tvml-react";
import { TVMLQueryProvider } from "tvml-react/query";

import { App } from "./App";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // The collection rarely changes. Without this, coming back to the app
      // would refetch every loaded page of every grid.
      staleTime: 60 * 60_000,
    },
  },
});

// `wrapper` also wraps pushed screens, so tabs and screens share the cache.
function Providers({ children }: { children?: ReactNode }) {
  return <TVMLQueryProvider client={queryClient}>{children}</TVMLQueryProvider>;
}

export function start(_options: StartOptions) {
  launch(<App />, { errorTitle: "Gallery crashed", wrapper: Providers });
}
