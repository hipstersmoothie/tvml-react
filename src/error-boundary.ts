// Every screen (the root, pushed screens, modals, tabs, overlays) renders
// inside an error boundary, so an error after the first render shows an alert
// on that screen instead of blanking the whole app.

import {
  Component,
  createContext,
  createElement,
  Fragment,
  useContext,
  type ReactNode,
} from "react";

export type RenderError = (error: unknown, retry: () => void) => ReactNode;

export function defaultRenderError(
  error: unknown,
  retry: () => void,
  title = "Something went wrong",
): ReactNode {
  const message = error instanceof Error ? error.message : String(error);
  return createElement(
    "alertTemplate",
    null,
    createElement("title", null, title),
    createElement("description", null, message),
    createElement(
      "button",
      { onSelect: retry },
      createElement("text", null, "Try Again"),
    ),
  );
}

export const RenderErrorContext = createContext<RenderError>(defaultRenderError);

interface BoundaryProps {
  render: RenderError;
  children?: ReactNode;
}

class Boundary extends Component<BoundaryProps, { error: unknown; failed: boolean }> {
  state = { error: undefined as unknown, failed: false };

  static getDerivedStateFromError(error: unknown) {
    return { error, failed: true };
  }

  retry = () => this.setState({ error: undefined, failed: false });

  render() {
    if (this.state.failed) {
      return this.props.render(this.state.error, this.retry);
    }
    return createElement(Fragment, null, this.props.children);
  }
}

/** Catches render errors in one screen and shows `renderError` there. */
export function ScreenErrorBoundary({ children }: { children?: ReactNode }) {
  const render = useContext(RenderErrorContext);
  return createElement(Boundary, { render }, children);
}
