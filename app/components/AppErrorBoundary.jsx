"use client";

import React from "react";

function ErrorFallback({ error, reset }) {
  return (
    <div className="card error-boundary" role="alert">
      <div className="error-boundary-badge">Something went wrong</div>
      <h2>Mission Control hit a recoverable error.</h2>
      <p>
        This page crashed, but the app is still running. You can retry this page
        without reloading the entire site.
      </p>
      {error?.message && (
        <pre className="error-boundary-details">{error.message}</pre>
      )}
      <div className="error-boundary-actions">
        <button type="button" className="btn btn-primary" onClick={reset}>
          Try again
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => window.location.reload()}
        >
          Reload app
        </button>
      </div>
    </div>
  );
}

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
    this.reset = this.reset.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("AppErrorBoundary caught an error", error, info);
  }

  reset() {
    this.setState({ error: null });
  }

  render() {
    if (this.state.error) {
      return <ErrorFallback error={this.state.error} reset={this.reset} />;
    }

    return this.props.children;
  }
}
