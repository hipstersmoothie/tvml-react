import { launch, type StartOptions } from "tvml-react";

import { Index } from "./Index";

// Called by the bootstrap Application.js once this bundle has loaded.
export function start(_options: StartOptions) {
  launch(<Index />, { errorTitle: "Kitchen sink crashed" });
}
