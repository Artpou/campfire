import type { ReactNode } from "react";
import { Component } from "react";

import { Trans } from "@lingui/react/macro";

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

    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-background text-foreground">
        <div className="max-w-2xl w-full text-center space-y-6">
          <h1 className="text-4xl font-bold text-destructive">
            <Trans>Something went wrong</Trans>
          </h1>
          <div className="bg-destructive/10 border border-destructive rounded-lg p-4 text-left">
            <p className="text-destructive font-mono text-sm break-all whitespace-pre-wrap">{error.message}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              this.setState({ error: null });
              window.location.reload();
            }}
            className="px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-md transition-colors"
          >
            <Trans>Reload Page</Trans>
          </button>
        </div>
      </div>
    );
  }
}
