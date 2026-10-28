import type { ReactNode } from "react";
import { launch, PlayerProvider, type StartOptions } from "tvml-react";
import { TVMLQueryProvider } from "tvml-react/query";

import { App } from "./App";
import { PodcastPlayer } from "./PlayerProvider";
import { queryClient } from "./queries";

// The query cache and the player live in the wrapper so they're shared by (and
// outlive) every pushed screen and modal. Outermost first.
export function start(_options: StartOptions) {
  launch(<App />, {
    wrapper: [
      ({ children }: { children?: ReactNode }) => (
        <TVMLQueryProvider client={queryClient}>{children}</TVMLQueryProvider>
      ),
      PlayerProvider,
      PodcastPlayer,
    ],
    errorTitle: "Podcasts crashed",
  });
}
