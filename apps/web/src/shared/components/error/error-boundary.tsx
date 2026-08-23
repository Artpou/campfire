import type { ReactNode } from "react";
import { Component } from "react";

import { ErrorView } from "@/shared/components/view/error-view";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return <ErrorView error={error} />;
  }
}
