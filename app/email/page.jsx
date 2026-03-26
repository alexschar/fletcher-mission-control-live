"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { getAuthHeaders } from "../../lib/api-client";
import { useLivePolling } from "../../lib/use-live-polling";
import LiveHeader from "../components/LiveHeader";

const EMAIL_CATEGORIES = [
  { key: "all", label: "All Emails", icon: "\u2709\uFE0F" },
  { key: "email", label: "Personal", icon: "\uD83D\uDCE8" },
  { key: "sponsorship", label: "Sponsorship", icon: "\uD83D\uDCB0" },
];

const TRIAGE_BADGES = {
  legit: { color: "var(--green)", bg: "rgba(74,222,128,0.12)" },
  review: { color: "var(--yellow)", bg: "rgba(251,191,36,0.12)" },
  important: { color: "var(--orange)", bg: "rgba(251,146,60,0.12)" },
  routine: { color: "var(--text-muted)", bg: "rgba(85,85,106,0.12)" },
  dismiss: { color: "var(--text-muted)", bg: "rgba(85,85,106,0.12)" },
  dismissed: { color: "var(--text-muted)", bg: "rgba(85,85,106,0.12)" },
  spam: { color: "var(--red)", bg: "rgba(248,113,113,0.12)" },
  scam: { color: "var(--red)", bg: "rgba(248,113,113,0.12)" },
  act: { color: "var(--accent)", bg: "rgba(108,138,255,0.12)" },
  inform: { color: "var(--blue)", bg: "rgba(88,166,255,0.12)" },
  remind: { color: "var(--purple)", bg: "rgba(175,122,255,0.12)" },
};

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
    default: return "var(--text-muted)";
  }
}

function EmailCard({ signal, onFeedback, onDraftUpdate, onDismiss, expanded, onToggle, isDismissed, isNew }) {
  const [feedbackNote, setFeedbackNote] = useState(signal.feedback_note || "");
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);
  const [draftText, setDraftText] = useState(signal.agent_draft || "");
  const [editingDraft, setEditingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  const triage = signal.agent_notes?.triage;
  const triageStyle = TRIAGE_BADGES[triage] || TRIAGE_BADGES.routine;
  const hasDraft = !!signal.agent_draft;
  const senderKnown = signal.agent_notes?.sender_known;
  const actionNeeded = signal.agent_notes?.action_needed;

  // Sponsorship-specific fields
  const compModel = signal.agent_notes?.compensation_model;
  const compAmount = signal.agent_notes?.compensation_amount;
  const companyDomain = signal.agent_notes?.company_domain;
  const companyVerified = signal.agent_notes?.company_verified;
  const specificToAlex = signal.agent_notes?.specific_to_alex;
  const redFlags = signal.agent_notes?.red_flags || [];

  async function handleFeedback(value) {
    setSubmitting(true);
    await onFeedback(signal.id, { feedback: value, feedback_note: feedbackNote || undefined });
    setSubmitting(false);
    setShowFeedbackInput(false);
  }

  async function handleSaveDraft() {
    setSubmitting(true);
    await onDraftUpdate(signal.id, draftText);
    setSubmitting(false);
    setEditingDraft(false);
  }

  async function handleApprove() {
    if (!confirm("Mark this draft as approved? The host-side email sender will pick it up and send.")) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/email-drafts/${signal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ status: "acted_on" }),
      });
      if (!res.ok) throw new Error("Failed to approve");
      const updated = await res.json();
      // Refresh parent
      await onFeedback(signal.id, { feedback: "useful" });
    } catch (err) {
      console.error("Approve error:", err);
    }
    setSubmitting(false);
  }

  async function handleDismiss(e) {
    e.stopPropagation();
    setDismissing(true);
    setTimeout(() => onDismiss(signal.id), 400);
  }

  return (
    <div className={`card email-card card-dismissable ${expanded ? "email-card-expanded" : ""} ${dismissing ? "card-dismissing" : ""} ${isDismissed ? "card-dismissed-muted" : ""} ${isNew ? "card-new" : ""}`} data-priority={signal.priority} data-status={signal.status}>
      {!isDismissed && <button className="dismiss-btn" onClick={handleDismiss} title="Dismiss email">{"\u2715"}</button>}
      {/* Compact row */}
      <div className="email-card-row" onClick={onToggle}>
        <div className="email-card-status-col">
          {signal.status === "unread" && <span className="email-unread-dot" />}
        </div>
        <div className="email-card-main">
          <div className="email-card-top">
            <span className="email-sender">{signal.source}</span>
            {signal.category === "sponsorship" && <span className="email-cat-tag">Sponsorship</span>}
            <span className="email-time">{formatTime(signal.created_at)}</span>
          </div>
          <div className="email-subject">{signal.title}</div>
          {!expanded && signal.body && (
            <div className="email-preview">{signal.body.slice(0, 120)}{signal.body.length > 120 ? "..." : ""}</div>
          )}
        </div>
        <div className="email-card-badges">
          {signal.priority !== "normal" && (
            <span className="signal-priority-badge" style={{ borderColor: priorityColor(signal.priority), color: priorityColor(signal.priority) }}>
              {signal.priority}
            </span>
          )}
          {triage && (
            <span className="email-triage-badge" style={{ color: triageStyle.color, background: triageStyle.bg }}>
              {triage}
            </span>
          )}
          {hasDraft && <span className="badge badge-green">draft</span>}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="email-card-detail">
          {/* Body */}
          {signal.body && <div className="email-body">{signal.body}</div>}

          {/* Agent triage details */}
          {signal.agent_notes && (
            <div className="email-triage-panel">
              <div className="email-triage-header">Agent Triage</div>
              <div className="email-triage-grid">
                {signal.agent_notes.reason && (
                  <div className="email-triage-item full">
                    <span className="email-triage-label">Reason</span>
                    <span className="email-triage-value">{signal.agent_notes.reason}</span>
                  </div>
                )}
                {senderKnown !== undefined && (
                  <div className="email-triage-item">
                    <span className="email-triage-label">Sender known</span>
                    <span className="email-triage-value">{senderKnown ? "Yes" : "No"}</span>
                  </div>
                )}
                {actionNeeded !== undefined && (
                  <div className="email-triage-item">
                    <span className="email-triage-label">Action needed</span>
                    <span className="email-triage-value">{actionNeeded ? "Yes" : "No"}</span>
                  </div>
                )}
                {compModel && (
                  <div className="email-triage-item">
                    <span className="email-triage-label">Compensation</span>
                    <span className="email-triage-value">{compAmount ? `${compAmount} (${compModel})` : compModel}</span>
                  </div>
                )}
                {companyDomain && (
                  <div className="email-triage-item">
                    <span className="email-triage-label">Company</span>
                    <span className="email-triage-value">
                      {companyDomain}
                      {companyVerified === true && " \u2705"}
                      {companyVerified === false && " \u274C"}
                    </span>
                  </div>
                )}
                {specificToAlex !== undefined && (
                  <div className="email-triage-item">
                    <span className="email-triage-label">Specific to Alex</span>
                    <span className="email-triage-value">{specificToAlex ? "Yes" : "Generic"}</span>
                  </div>
                )}
                {redFlags.length > 0 && (
                  <div className="email-triage-item full">
                    <span className="email-triage-label">Red flags</span>
                    <span className="email-triage-value email-red-flags">{redFlags.join(", ")}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Draft section */}
          <div className="email-draft-section">
            <div className="email-draft-header">
              <span>Agent Draft</span>
              {hasDraft && !editingDraft && (
                <button className="btn btn-sm" onClick={() => setEditingDraft(true)}>Edit</button>
              )}
              {!hasDraft && !editingDraft && (
                <button className="btn btn-sm" onClick={() => setEditingDraft(true)}>Write draft</button>
              )}
            </div>
            {editingDraft ? (
              <div className="email-draft-editor">
                <textarea
                  className="textarea"
                  rows={5}
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                  placeholder="Draft a reply..."
                />
                <div className="email-draft-actions">
                  <button className="btn btn-primary btn-sm" onClick={handleSaveDraft} disabled={submitting}>
                    {submitting ? "Saving..." : "Save Draft"}
                  </button>
                  <button className="btn btn-sm" onClick={() => { setEditingDraft(false); setDraftText(signal.agent_draft || ""); }}>Cancel</button>
                </div>
              </div>
            ) : hasDraft ? (
              <>
                <div className="email-draft-preview">{signal.agent_draft}</div>
                {signal.status !== "acted_on" && (
                  <div className="email-draft-actions" style={{ marginTop: 10 }}>
                    <button className="btn btn-primary btn-sm" onClick={handleApprove} disabled={submitting}>
                      {submitting ? "Approving..." : "\u2705 Approve & Send"}
                    </button>
                    <button className="btn btn-sm" onClick={() => setEditingDraft(true)}>Edit first</button>
                  </div>
                )}
                {signal.status === "acted_on" && (
                  <div style={{ marginTop: 8, fontSize: 12, color: "var(--green)" }}>
                    {"\u2705"} Approved {signal.processed_at ? `at ${new Date(signal.processed_at).toLocaleString()}` : ""}
                  </div>
                )}
              </>
            ) : (
              <div className="email-draft-empty">No draft yet. Agent will draft a reply on next triage.</div>
            )}
          </div>

          {/* Feedback */}
          <div className="email-feedback-section">
            {signal.feedback ? (
              <span className="signal-feedback-given">
                {signal.feedback === "useful" ? "\uD83D\uDC4D" : signal.feedback === "not_useful" ? "\uD83D\uDC4E" : signal.feedback === "wrong" ? "\u274C" : signal.feedback === "spam" ? "\uD83D\uDEAB" : "\u2B50"}{" "}
                {signal.feedback.replace(/_/g, " ")}
                {signal.feedback_note && <span className="signal-feedback-note-text"> &mdash; {signal.feedback_note}</span>}
              </span>
            ) : (
              <div className="email-feedback-actions">
                <button className="btn btn-sm" onClick={() => handleFeedback("useful")} disabled={submitting} title="Useful">{"\uD83D\uDC4D"} Useful</button>
                <button className="btn btn-sm" onClick={() => handleFeedback("not_useful")} disabled={submitting} title="Not useful">{"\uD83D\uDC4E"} Not useful</button>
                <button className="btn btn-sm" onClick={() => setShowFeedbackInput(!showFeedbackInput)} title="More options">More...</button>
              </div>
            )}
            {showFeedbackInput && !signal.feedback && (
              <div className="signal-feedback-expand" style={{ marginTop: 8 }}>
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
        </div>
      )}
    </div>
  );
}

export default function EmailPage() {
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [expandedId, setExpandedId] = useState(null);
  const [showDismissed, setShowDismissed] = useState(false);
  const feedTopRef = useRef(null);

  const STATUSES = ["all", "unread", "read", "acted_on", "dismissed"];

  const fetchFn = useCallback(async () => {
    const params = new URLSearchParams();
    if (category === "email") params.set("category", "email");
    else if (category === "sponsorship") params.set("category", "sponsorship");
    if (status !== "all") params.set("status", status);
    else if (!showDismissed) params.set("exclude_dismissed", "true");
    params.set("limit", "100");
    const res = await fetch(`/api/life-signals?${params}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
    let data = await res.json();
    data = Array.isArray(data) ? data : [];
    if (category === "all") data = data.filter((s) => s.category === "email" || s.category === "sponsorship");
    return data;
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

  function scrollToNew() {
    feedTopRef.current?.scrollIntoView({ behavior: "smooth" });
    clearNew();
  }

  async function handleDraftUpdate(id, draftText) {
    try {
      const res = await fetch(`/api/life-signals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ agent_draft: draftText }),
      });
      if (!res.ok) throw new Error("Failed to save draft");
    } catch (err) {
      console.error("Draft save error:", err);
    }
  }

  const unreadCount = signals.filter((s) => s.status === "unread").length;
  const withDrafts = signals.filter((s) => s.agent_draft).length;
  const sponsorshipCount = signals.filter((s) => s.category === "sponsorship").length;

  return (
    <div>
      <div className="page-header page-header-row">
        <div>
          <h1>Email Triage</h1>
          <p>Inbox intelligence. Review agent triage, edit drafts, and rate accuracy.</p>
        </div>
        <div className="life-feed-stats">
          <span className="stat-pill">{unreadCount} unread</span>
          <span className="stat-pill">{withDrafts} drafts</span>
          <span className="stat-pill">{sponsorshipCount} sponsorships</span>
        </div>
      </div>

      <LiveHeader lastRefreshed={lastRefreshed} newCount={newCount} onClickNew={scrollToNew} />

      <div className="life-feed-filters">
        <div className="filter-chips">
          {EMAIL_CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              className={`chip ${category === cat.key ? "chip-active" : ""}`}
              onClick={() => setCategory(cat.key)}
            >
              {cat.icon} {cat.label}
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
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card skeleton-block" style={{ height: 72 }} />
          ))}
        </div>
      ) : error ? (
        <div className="card empty-card">
          <p className="empty">Error loading emails: {error}</p>
        </div>
      ) : signals.length === 0 ? (
        <div className="card empty-card">
          <p className="empty">No email signals yet</p>
          <p className="empty-hint">
            Email signals will appear once email-signals.js is running on the Mac Mini.
            Only email and sponsorship category signals show here.
          </p>
        </div>
      ) : (
        <div className="section-stack">
          {signals.map((signal) => (
            <EmailCard
              key={signal.id}
              signal={signal}
              expanded={expandedId === signal.id}
              onToggle={() => setExpandedId(expandedId === signal.id ? null : signal.id)}
              onFeedback={handleFeedback}
              onDraftUpdate={handleDraftUpdate}
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
