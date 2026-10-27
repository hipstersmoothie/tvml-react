import { launch, type StartOptions } from "tvml-react";

import { App } from "./App";
import { ThemeProvider } from "./theme";

export function start(_options: StartOptions) {
  // The provider goes in `wrapper`, not inside <App>: every backdrop change
  // presents a new document via navigation.replace(), and those screens are
  // portals rendered beside <App>, not inside it.
  launch(<App />, { wrapper: ThemeProvider, errorTitle: "Dashboard crashed" });
}
