import { QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { launch, type StartOptions } from "tvml-react";
import { TVMLQueryProvider } from "tvml-react/query";

import { App } from "./App";
import { createPersistingQueryCache } from "./lib/persist";
import { ThemeProvider } from "./theme";

// Each query sets its own staleTime and refetchInterval. tvml-react/query
// pauses polling while the app is in the background, refetches stale data on
// resume ("window focus"), and pauses fetching while the Apple TV is offline,
// catching up when it reconnects.
const queryClient = new QueryClient({ queryCache: createPersistingQueryCache() });

// The providers go in `wrapper`, not inside <App>: every backdrop change
// presents a new document via navigation.replace(), and those screens are
// portals rendered beside <App>, not inside it. One QueryClient for all of
// them means a new backdrop screen reuses the data instead of refetching.
function Providers({ children }: { children?: ReactNode }) {
  return (
    <TVMLQueryProvider client={queryClient}>
      <ThemeProvider>{children}</ThemeProvider>
    </TVMLQueryProvider>
  );
}

export function start(_options: StartOptions) {
  launch(<App />, { wrapper: Providers, errorTitle: "Dashboard crashed" });
}
