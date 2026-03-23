"use client";

import { Component, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
};

type State = {
  hasError: boolean;
  message: string | null;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: null };

  static getDerivedStateFromError(error: unknown): State {
    const message =
      error instanceof Error ? error.message : "Something went wrong.";
    return { hasError: true, message };
  }

  componentDidCatch(error: unknown, info: { componentStack: string }) {
    console.error("[ErrorBoundary] Uncaught error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-screen grid place-items-center p-8 text-center">
          <div className="max-w-md">
            <div className="text-5xl mb-4">🐾</div>
            <h2 className="text-xl font-bold mb-2" style={{ color: "var(--dark-gray)" }}>
              Something went wrong
            </h2>
            <p className="text-sm mb-6" style={{ color: "var(--mid-gray)" }}>
              {this.state.message ?? "An unexpected error occurred. Please try refreshing the page."}
            </p>
            <button
              type="button"
              className="btn btn-primary px-5 py-2 rounded-full font-semibold"
              onClick={() => window.location.reload()}
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
