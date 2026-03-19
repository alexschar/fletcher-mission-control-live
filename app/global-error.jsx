"use client";

import "./globals.css";

export default function GlobalError({ error, reset }) {
  return (
    <html lang="en">
      <body>
        <div className="layout" style={{ display: "block", padding: 24 }}>
          <div className="card error-boundary" role="alert">
            <div className="error-boundary-badge">Global error</div>
            <h1>Mission Control failed to render.</h1>
            <p>The app hit an unexpected error, but this boundary kept the crash recoverable.</p>
            {error?.message && <pre className="error-boundary-details">{error.message}</pre>}
            <div className="error-boundary-actions">
              <button type="button" className="btn btn-primary" onClick={() => reset()}>
                Retry
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => window.location.reload()}>
                Reload app
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
