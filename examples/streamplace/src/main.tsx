import { launch, type StartOptions } from "tvml-react";

import { App } from "./App";
import { capturePlayers } from "./playerOverlay";
import { StoreProvider } from "./store";

export function start(_options: StartOptions) {
  capturePlayers();
  // The wrapper is shared by the home screen and every pushed screen.
  launch(<App />, { wrapper: StoreProvider, errorTitle: "stream.place crashed" });
}
