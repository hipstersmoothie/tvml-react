import type { ReactNode } from "react";
import { launch, type StartOptions } from "tvml-react";
import { TVMLQueryProvider } from "tvml-react/query";

import { App } from "./App";
import { PlayerProvider } from "./PlayerProvider";
import { queryClient } from "./queries";

// The query cache and the player live in the wrapper so they're shared by (and
// outlive) every pushed screen and modal.
function Providers({ children }: { children?: ReactNode }) {
  return (
    <TVMLQueryProvider client={queryClient}>
      <PlayerProvider>{children}</PlayerProvider>
    </TVMLQueryProvider>
  );
}

export function start(_options: StartOptions) {
  launch(<App />, { wrapper: Providers, errorTitle: "Podcasts crashed" });
}
