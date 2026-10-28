import type { ReactNode } from "react";
import { launch, type StartOptions } from "tvml-react";
import { TVMLQueryProvider } from "tvml-react/query";

import { App } from "./App";
import { queryClient } from "./queries";

// The wrapper is shared by the home screen and every pushed screen, so they
// all read the same query cache.
const Providers = ({ children }: { children?: ReactNode }) => (
  <TVMLQueryProvider client={queryClient}>{children}</TVMLQueryProvider>
);

export function start(_options: StartOptions) {
  launch(<App />, { wrapper: Providers, errorTitle: "stream.place crashed" });
}
