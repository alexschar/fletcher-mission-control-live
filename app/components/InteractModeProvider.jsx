"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getAuthHeaders, logout } from "../../lib/api-client";
import { useRouter } from "next/navigation";
import { useToast } from "./ToastProvider";

const InteractModeContext = createContext(null);

function normalizeMeta(meta = {}) {
  return {
    id: meta.id || null,
    type: meta.type || "element",
    title: meta.title || meta.label || "Untitled element",
    details: meta.details || "",
    href: meta.href || "",
    page: meta.page || "",
  };
}

export function InteractModeProvider({ children }) {
  const [enabled, setEnabled] = useState(false);
  const [selected, setSelected] = useState(null);
  const [draft, setDraft] = useState("");
  const [sendingTo, setSendingTo] = useState(null);
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    const saved = window.localStorage.getItem("mc_interact_mode");
    if (saved === "on") setEnabled(true);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("mc_interact_mode", enabled ? "on" : "off");
    if (!enabled) {
      setSelected(null);
      setDraft("");
    }
  }, [enabled]);

  const toggle = useCallback(() => setEnabled((current) => !current), []);
  const clearSelection = useCallback(() => {
    setSelected(null);
    setDraft("");
  }, []);

  const selectElement = useCallback((meta) => {
    setSelected(normalizeMeta(meta));
  }, []);

  const sendMessage = useCallback(async (targetAgent) => {
    if (!selected) {
      toast.error("Select an element first");
      return;
    }

    const question = draft.trim();
    if (!question) {
      toast.error("Enter a question or request first");
      return;
    }

    setSendingTo(targetAgent);
    try {
      const response = await fetch("/api/interact-message", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ selected, question, targetAgent }),
      });

      if (response.status === 401) {
        logout();
        router.push("/login");
        return;
      }

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to send message");
      }

      toast.success(`Sent to ${payload.targetLabel || targetAgent}`);
      setDraft("");
    } catch (error) {
      toast.error(error.message || "Failed to send message");
    } finally {
      setSendingTo(null);
    }
  }, [draft, router, selected, toast]);

  const value = useMemo(() => ({
    enabled,
    toggle,
    selected,
    selectElement,
    clearSelection,
  }), [enabled, toggle, selected, selectElement, clearSelection]);

  return (
    <InteractModeContext.Provider value={value}>
      {children}
      <button
        type="button"
        className={`interact-toggle ${enabled ? "interact-toggle-on" : ""}`}
        onClick={toggle}
        aria-pressed={enabled}
      >
        Interact Mode: {enabled ? "ON" : "OFF"}
      </button>

      {enabled && selected && (
        <div className="interact-chat-panel">
          <div className="interact-chat-header">
            <div>
              <div className="interact-chat-kicker">Selected {selected.type}</div>
              <strong>{selected.title}</strong>
              {selected.details && <div className="interact-chat-details">{selected.details}</div>}
            </div>
            <button type="button" className="btn btn-sm" onClick={clearSelection}>Clear</button>
          </div>
          <textarea
            className="textarea interact-chat-input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={`Ask about ${selected.title}...`}
            rows={4}
          />
          <div className="interact-chat-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => sendMessage("fletcher")}
              disabled={sendingTo !== null}
            >
              {sendingTo === "fletcher" ? "Sending..." : "Send to Fletcher"}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => sendMessage("sawyer")}
              disabled={sendingTo !== null}
            >
              {sendingTo === "sawyer" ? "Sending..." : "Send to Sawyer"}
            </button>
          </div>
        </div>
      )}
    </InteractModeContext.Provider>
  );
}

export function useInteractMode() {
  const context = useContext(InteractModeContext);
  if (!context) throw new Error("useInteractMode must be used within InteractModeProvider");
  return context;
}

export function Interactable({ children, meta, className = "", as: Tag = "div", ...props }) {
  const { enabled, selected, selectElement } = useInteractMode();
  const normalized = normalizeMeta(meta);
  const isSelected = Boolean(selected && selected.type === normalized.type && selected.title === normalized.title && selected.details === normalized.details);

  return (
    <Tag
      className={`${className} ${enabled ? "interactable-region" : ""} ${isSelected ? "interactable-selected" : ""}`.trim()}
      data-interactable={enabled ? "true" : "false"}
      onClickCapture={enabled ? (event) => {
        event.preventDefault();
        event.stopPropagation();
        selectElement(normalized);
      } : undefined}
      {...props}
    >
      {children}
    </Tag>
  );
}
