import type { ReactNode } from "react";
import { launch, type StartOptions } from "tvml-react";
import { TVMLQueryProvider } from "tvml-react/query";

import { queryClient } from "./api";
import { App } from "./App";

// The wrapper surrounds every screen (tabs, pushed screens, modals), so they
// all share one query cache.
function Providers({ children }: { children?: ReactNode }) {
  return <TVMLQueryProvider client={queryClient}>{children}</TVMLQueryProvider>;
}

// Called by the bootstrap Application.js once this bundle has loaded.
export function start(_options: StartOptions) {
  launch(<App />, { errorTitle: "TV Shows crashed", wrapper: Providers });
}
