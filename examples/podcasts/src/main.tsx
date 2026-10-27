import { launch, type StartOptions } from "tvml-react";

import { App } from "./App";
import { PlayerProvider } from "./PlayerProvider";

export function start(_options: StartOptions) {
  // The player lives in the wrapper so it's shared by (and outlives) every
  // pushed screen and modal.
  launch(<App />, { wrapper: PlayerProvider, errorTitle: "Podcasts crashed" });
}
