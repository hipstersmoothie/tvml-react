import { launch, type StartOptions } from "tvml-react";

import { App } from "./App";

// Called by Application.js (the bootstrap `tvml-react dev` and `build` write)
// once this bundle has loaded.
export function start(_options: StartOptions) {
  launch(<App />, { errorTitle: "__APP__ crashed" });
}
