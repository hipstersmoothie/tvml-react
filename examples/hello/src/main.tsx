import { launch, type StartOptions } from "tvml-react";

import { App } from "./App";

// Called by the bootstrap Application.js once this bundle has loaded.
export function start(_options: StartOptions) {
  launch(<App />, { errorTitle: "Hello TVML crashed" });
}
