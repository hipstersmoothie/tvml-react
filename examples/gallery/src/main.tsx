import { launch, type StartOptions } from "tvml-react";

import { App } from "./App";

export function start(_options: StartOptions) {
  launch(<App />, { errorTitle: "Gallery crashed" });
}
