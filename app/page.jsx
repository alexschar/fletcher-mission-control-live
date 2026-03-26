"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { getAuthHeaders } from "../lib/api-client";
import { useLivePolling } from "../lib/use-live-polling";
import LiveHeader from "./components/LiveHeader";

const CATEGORIES = ["all", "email", "sponsorship", "social", "shopping", "calendar"];
const STATUSES = ["all", "unread", "read", "acted_on", "dismissed"];
const FEEDBACK_OPTIONS = ["useful", "not_useful", "wrong", "spam", "important"];

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function priorityColor(p) {
  switch (p) {
    case "urgent": return "var(--red)";
    case "high": return "var(--orange)";
    case "normal": return "var(--text-muted)";
    case "low": return "var(--text-muted)";
    default: return "var(--text-muted)";
  }
}

function categoryIcon(cat) {
  switch (cat) {
    case "email": return "\u2709\uFE0F";
    case "sponsorship": return "\uD83D\uDCB0";
    case "social": return "\uD83D\uDCCA";
    case "shopping": return "\uD83D\uDCE6";
    case "calendar": return "\uD83D\uDCC5";
    default: return "\uD83D\uDD14";
  }
}

function SignalCard({ signal, onFeedback, onDismiss, isDismissed, isNew }) {
  const [showFeedbackNote, setShowFeedbackNote] = useState(false);
  const [feedbackNote, setFeedbackNote] = useState(signal.feedback_note || "");
  const [submitting, setSubmitting] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  async function handleFeedback(value) {
    setSubmitting(true);
    await onFeedback(signal.id, { feedback: value, feedback_note: feedbackNote || undefined });
    setSubmitting(false);
    setShowFeedbackNote(false);
  }

  async function handleDismiss(e) {
    e.stopPropagation();
    setDismissing(true);
    setTimeout(() => onDismiss(signal.id), 400);
  }

  const triageLabel = signal.agent_notes?.triage;
  const hasDraft = !!signal.agent_draft;

  return (
    <div className={`card life-signal-card card-dismissable ${dismissing ? "card-dismissing" : ""} ${isDismissed ? "card-dismissed-muted" : ""} ${isNew ? "card-new" : ""}`} data-priority={signal.priority} data-status={signal.status}>
      {!isDismissed && <button className="dismiss-btn" onClick={handleDismiss} title="Dismiss signal">{"\u2715"}</button>}
      <div className="signal-header">
        <span className="signal-icon">{categoryIcon(signal.category)}</span>
        <div className="signal-meta">
          <span className="signal-source">{signal.source}</span>
          <span className="signal-type">{signal.signal_type.replace(/_/g, " ")}</span>
          <span className="signal-time">{formatTime(signal.created_at)}</span>
        </div>
        <div className="signal-badges">
          {signal.priority !== "normal" && (
            <span className="signal-priority-badge" style={{ borderColor: priorityColor(signal.priority), color: priorityColor(signal.priority) }}>
              {signal.priority}
            </span>
          )}
          {triageLabel && <span className="badge badge-blue">{triageLabel}</span>}
          {hasDraft && <span className="badge badge-green">draft ready</span>}
        </div>
      </div>
      <h3 className="signal-title">{signal.title}</h3>
      {signal.body && <p className="signal-body">{signal.body.slice(0, 300)}{signal.body.length > 300 ? "..." : ""}</p>}
      {signal.agent_notes?.reason && (
        <p className="signal-agent-reason">Agent: {signal.agent_notes.reason}</p>
      )}
      <div className="signal-footer">
        <div className="signal-feedback-row">
          {signal.feedback ? (
            <span className="signal-feedback-given">
              {signal.feedback === "useful" ? "\uD83D\uDC4D" : signal.feedback === "not_useful" ? "\uD83D\uDC4E" : signal.feedback === "wrong" ? "\u274C" : signal.feedback === "spam" ? "\uD83D\uDEAB" : "\u2B50"}{" "}
              {signal.feedback.replace(/_/g, " ")}
              {signal.feedback_note && <span className="signal-feedback-note-text"> &mdash; {signal.feedback_note}</span>}
            </span>
          ) : (
            <>
              <button className="btn btn-sm" onClick={() => handleFeedback("useful")} disabled={submitting} title="Useful">{"\uD83D\uDC4D"}</button>
              <button className="btn btn-sm" onClick={() => handleFeedback("not_useful")} disabled={submitting} title="Not useful">{"\uD83D\uDC4E"}</button>
              <button className="btn btn-sm" onClick={() => setShowFeedbackNote(!showFeedbackNote)} disabled={submitting} title="Add note">{"\uD83D\uDCDD"}</button>
            </>
          )}
        </div>
        <span className="signal-status-label">{signal.status.replace(/_/g, " ")}</span>
      </div>
      {showFeedbackNote && !signal.feedback && (
        <div className="signal-feedback-expand">
          <input
            className="input"
            placeholder="Why? (e.g. 'I don't care about this type')"
            value={feedbackNote}
            onChange={(e) => setFeedbackNote(e.target.value)}
          />
          <div className="signal-feedback-expand-actions">
            {FEEDBACK_OPTIONS.map((opt) => (
              <button key={opt} className="btn btn-sm" onClick={() => handleFeedback(opt)} disabled={submitting}>
                {opt.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function LifeFeedPage() {
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [showDismissed, setShowDismissed] = useState(false);
  const [stats, setStats] = useState(null);
  const feedTopRef = useRef(null);

  const fetchFn = useCallback(async () => {
    const params = new URLSearchParams();
    if (category !== "all") params.set("category", category);
    if (status !== "all") params.set("status", status);
    else if (!showDismissed) params.set("exclude_dismissed", "true");
    params.set("limit", "50");
    const res = await fetch(`/api/life-signals?${params}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error(`Failed to fetch signals: ${res.status}`);
    return res.json();
  }, [category, status, showDismissed]);

  const {
    data: signals,
    loading,
    error,
    newCount,
    clearNew,
    isNew,
    lastRefreshed,
  } = useLivePolling(fetchFn, { interval: 30000 });

  // Stats polling (separate, lighter)
  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/life-signals?stats=true", { headers: getAuthHeaders() });
        if (res.ok) setStats(await res.json());
      } catch { /* non-critical */ }
    }
    fetchStats();
    const timer = setInterval(fetchStats, 30000);
    return () => clearInterval(timer);
  }, []);

  async function handleFeedback(id, update) {
    try {
      await fetch(`/api/life-signals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(update),
      });
    } catch (err) {
      console.error("Feedback error:", err);
    }
  }

  async function handleDismiss(id) {
    try {
      await fetch(`/api/life-signals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ status: "dismissed" }),
      });
    } catch (err) {
      console.error("Dismiss error:", err);
    }
  }

  function scrollToNewSignals() {
    feedTopRef.current?.scrollIntoView({ behavior: "smooth" });
    clearNew();
  }

  return (
    <div>
      <div className="page-header page-header-row">
        <div>
          <h1>Life Feed</h1>
          <p>Everything important, one stream. Rate signals to train your agents.</p>
        </div>
        {stats && (
          <div className="life-feed-stats">
            <span className="stat-pill">{stats.unread} unread</span>
            <span className="stat-pill">{stats.total} total</span>
            <span className="stat-pill">{stats.with_feedback} rated</span>
          </div>
        )}
      </div>

      <LiveHeader lastRefreshed={lastRefreshed} newCount={newCount} onClickNew={scrollToNewSignals} />

      <div className="life-feed-filters">
        <div className="filter-chips">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`chip ${category === cat ? "chip-active" : ""}`}
              onClick={() => setCategory(cat)}
            >
              {cat === "all" ? "All" : `${categoryIcon(cat)} ${cat.charAt(0).toUpperCase() + cat.slice(1)}`}
            </button>
          ))}
        </div>
        <select className="select" style={{ width: "auto", minWidth: 120 }} value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s === "all" ? "All statuses" : s.replace(/_/g, " ")}</option>
          ))}
        </select>
        <button className="dismiss-toggle" onClick={() => setShowDismissed(!showDismissed)}>
          <span className={`dismiss-toggle-dot ${showDismissed ? "active" : ""}`} />
          {showDismissed ? "Showing dismissed" : "Show dismissed"}
        </button>
      </div>

      <div ref={feedTopRef} />

      {loading ? (
        <div className="section-stack">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card skeleton-block" style={{ height: 120 }} />
          ))}
        </div>
      ) : error ? (
        <div className="card empty-card">
          <p className="empty">Error loading signals: {error}</p>
          <p className="empty-hint">Make sure the life_signals table exists in Supabase and try again.</p>
        </div>
      ) : signals.length === 0 ? (
        <div className="card empty-card">
          <p className="empty">No signals yet</p>
          <p className="empty-hint">
            Signals will appear here once email, social, and calendar fetchers are running on the host.
            Use POST /api/life-signals to create test signals.
          </p>
        </div>
      ) : (
        <div className="section-stack">
          {signals.map((signal) => (
            <SignalCard
              key={signal.id}
              signal={signal}
              onFeedback={handleFeedback}
              onDismiss={handleDismiss}
              isDismissed={signal.status === "dismissed"}
              isNew={isNew(signal.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
