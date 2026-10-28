import { launch, type StartOptions } from "tvml-react";
import { TVMLQueryProvider } from "tvml-react/query";

import { App } from "./App";

export function start(_options: StartOptions) {
  launch(<App />, { wrapper: TVMLQueryProvider });
}
