"use client";

import { useEffect } from "react";

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error("Route error boundary", error);
  }, [error]);

  return (
    <div className="card error-boundary" role="alert">
      <div className="error-boundary-badge">Page error</div>
      <h2>This page crashed.</h2>
      <p>You can retry this route without taking down the rest of Mission Control.</p>
      {error?.message && <pre className="error-boundary-details">{error.message}</pre>}
      <div className="error-boundary-actions">
        <button type="button" className="btn btn-primary" onClick={() => reset()}>
          Try again
        </button>
      </div>
    </div>
  );
}
