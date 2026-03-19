"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null);

  const confirm = useCallback((options) => new Promise((resolve) => {
    setDialog({
      title: options?.title || "Confirm action",
      message: options?.message || "Are you sure you want to continue?",
      confirmLabel: options?.confirmLabel || "Confirm",
      cancelLabel: options?.cancelLabel || "Cancel",
      tone: options?.tone || "danger",
      resolve,
    });
  }), []);

  const close = useCallback((result) => {
    setDialog((current) => {
      if (current?.resolve) current.resolve(result);
      return null;
    });
  }, []);

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {dialog ? (
        <div className="confirm-overlay" onClick={() => close(false)}>
          <div className="confirm-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="confirm-title">
            <h2 id="confirm-title">{dialog.title}</h2>
            <p>{dialog.message}</p>
            <div className="confirm-actions">
              <button className="btn" onClick={() => close(false)}>{dialog.cancelLabel}</button>
              <button className={`btn ${dialog.tone === "danger" ? "btn-danger" : "btn-primary"}`} onClick={() => close(true)}>{dialog.confirmLabel}</button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return context;
}
