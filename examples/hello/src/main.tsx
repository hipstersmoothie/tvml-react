import { launch, type StartOptions } from "tvml-react";

import { App } from "./App";

// Called by the bootstrap Application.js once this bundle has loaded.
export function start({ baseUrl }: StartOptions) {
  launch(<App baseUrl={baseUrl} />, { errorTitle: "Hello TVML crashed" });
}
