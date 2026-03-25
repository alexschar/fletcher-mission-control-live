"use client";
import { useEffect, useState, useCallback } from "react";
import { getAuthHeaders } from "../../lib/api-client";

const PLATFORMS = [
  { key: "all", label: "All Platforms", icon: "\uD83D\uDCCA" },
  { key: "youtube", label: "YouTube", icon: "\uD83C\uDFAC" },
  { key: "instagram", label: "Instagram", icon: "\uD83D\uDCF7" },
  { key: "tiktok", label: "TikTok", icon: "\uD83C\uDFB5" },
  { key: "linkedin", label: "LinkedIn", icon: "\uD83D\uDCBC" },
  { key: "pinterest", label: "Pinterest", icon: "\uD83D\uDCCC" },
];

const SIGNAL_TYPES = {
  engagement_spike: { label: "Spike", color: "var(--green)", bg: "rgba(74,222,128,0.12)" },
  follower_change: { label: "Followers", color: "var(--blue)", bg: "rgba(88,166,255,0.12)" },
  content_performance: { label: "Performance", color: "var(--accent)", bg: "rgba(108,138,255,0.12)" },
  content_idea: { label: "Idea", color: "var(--purple)", bg: "rgba(175,122,255,0.12)" },
  social_mention: { label: "Mention", color: "var(--yellow)", bg: "rgba(251,191,36,0.12)" },
  linkedin_engagement: { label: "LinkedIn", color: "var(--blue)", bg: "rgba(88,166,255,0.12)" },
  pinterest_activity: { label: "Pinterest", color: "var(--red)", bg: "rgba(248,113,113,0.12)" },
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

function platformColor(source) {
  switch (source) {
    case "youtube": return "#ff0000";
    case "instagram": return "#e1306c";
    case "tiktok": return "#00f2ea";
    case "linkedin": return "#0077b5";
    case "pinterest": return "#e60023";
    default: return "var(--accent)";
  }
}

function formatNumber(n) {
  if (n == null) return "—";
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

function deltaLabel(current, previous) {
  if (current == null || previous == null || previous === 0) return null;
  const pct = ((current - previous) / previous * 100).toFixed(0);
  const sign = pct > 0 ? "+" : "";
  return { text: `${sign}${pct}%`, positive: pct >= 0 };
}

// Platform overview card — shows aggregated metrics from metadata
function PlatformCard({ source, signals }) {
  const latest = signals[0]; // most recent signal for this platform
  if (!latest) return null;

  const meta = latest.metadata || {};
  const followers = meta.followers || meta.subscriber_count || meta.follower_count;
  const prevFollowers = meta.prev_followers || meta.prev_subscriber_count;
  const engagement = meta.engagement_rate || meta.avg_engagement;
  const prevEngagement = meta.prev_engagement_rate;
  const views = meta.total_views || meta.views || meta.weekly_views;
  const prevViews = meta.prev_views || meta.prev_weekly_views;
  const topContent = meta.top_content || meta.top_post || meta.top_video;

  const fDelta = deltaLabel(followers, prevFollowers);
  const eDelta = deltaLabel(engagement, prevEngagement);
  const vDelta = deltaLabel(views, prevViews);

  const color = platformColor(source);

  return (
    <div className="social-platform-card card">
      <div className="social-platform-header">
        <span className="social-platform-name" style={{ color }}>{source.charAt(0).toUpperCase() + source.slice(1)}</span>
        <span className="social-platform-time">{formatTime(latest.created_at)}</span>
      </div>
      <div className="social-platform-metrics">
        {followers != null && (
          <div className="social-metric">
            <span className="social-metric-value">{formatNumber(followers)}</span>
            <span className="social-metric-label">Followers</span>
            {fDelta && <span className={`social-metric-delta ${fDelta.positive ? "positive" : "negative"}`}>{fDelta.text}</span>}
          </div>
        )}
        {views != null && (
          <div className="social-metric">
            <span className="social-metric-value">{formatNumber(views)}</span>
            <span className="social-metric-label">Views</span>
            {vDelta && <span className={`social-metric-delta ${vDelta.positive ? "positive" : "negative"}`}>{vDelta.text}</span>}
          </div>
        )}
        {engagement != null && (
          <div className="social-metric">
            <span className="social-metric-value">{typeof engagement === "number" ? `${engagement.toFixed(1)}%` : engagement}</span>
            <span className="social-metric-label">Engagement</span>
            {eDelta && <span className={`social-metric-delta ${eDelta.positive ? "positive" : "negative"}`}>{eDelta.text}</span>}
          </div>
        )}
        {topContent && (
          <div className="social-metric full">
            <span className="social-metric-label">Top content</span>
            <span className="social-metric-value text">{topContent}</span>
          </div>
        )}
      </div>
      {latest.agent_notes?.reason && (
        <div className="social-platform-insight">{latest.agent_notes.reason}</div>
      )}
    </div>
  );
}

// Signal card for the social feed
function SocialSignalCard({ signal, onFeedback, expanded, onToggle }) {
  const [feedbackNote, setFeedbackNote] = useState(signal.feedback_note || "");
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const typeInfo = SIGNAL_TYPES[signal.signal_type] || { label: signal.signal_type?.replace(/_/g, " "), color: "var(--text-muted)", bg: "rgba(85,85,106,0.12)" };
  const meta = signal.metadata || {};
  const isIdea = signal.signal_type === "content_idea";
  const color = platformColor(signal.source);

  async function handleFeedback(value) {
    setSubmitting(true);
    await onFeedback(signal.id, { feedback: value, feedback_note: feedbackNote || undefined });
    setSubmitting(false);
    setShowFeedbackInput(false);
  }

  return (
    <div className={`card social-signal-card ${expanded ? "social-signal-expanded" : ""} ${isIdea ? "social-idea-card" : ""}`} data-priority={signal.priority}>
      <div className="social-signal-row" onClick={onToggle}>
        <div className="social-signal-source" style={{ color }}>{signal.source}</div>
        <div className="social-signal-main">
          <div className="social-signal-title">{signal.title}</div>
          {!expanded && signal.body && (
            <div className="social-signal-preview">{signal.body.slice(0, 140)}{signal.body.length > 140 ? "..." : ""}</div>
          )}
        </div>
        <div className="social-signal-badges">
          <span className="social-type-badge" style={{ color: typeInfo.color, background: typeInfo.bg }}>{typeInfo.label}</span>
          {signal.priority !== "normal" && (
            <span className="signal-priority-badge" style={{ borderColor: priorityColor(signal.priority), color: priorityColor(signal.priority) }}>
              {signal.priority}
            </span>
          )}
          <span className="social-signal-time">{formatTime(signal.created_at)}</span>
        </div>
      </div>

      {expanded && (
        <div className="social-signal-detail">
          {signal.body && <div className="social-signal-body">{signal.body}</div>}

          {/* Engagement metrics from metadata */}
          {(meta.likes != null || meta.comments != null || meta.shares != null || meta.views != null) && (
            <div className="social-engagement-bar">
              {meta.views != null && <span className="social-eng-item">{formatNumber(meta.views)} views</span>}
              {meta.likes != null && <span className="social-eng-item">{formatNumber(meta.likes)} likes</span>}
              {meta.comments != null && <span className="social-eng-item">{formatNumber(meta.comments)} comments</span>}
              {meta.shares != null && <span className="social-eng-item">{formatNumber(meta.shares)} shares</span>}
              {meta.saves != null && <span className="social-eng-item">{formatNumber(meta.saves)} saves</span>}
            </div>
          )}

          {/* Agent insight */}
          {signal.agent_notes?.reason && (
            <div className="social-agent-insight">
              <span className="social-insight-label">Agent Insight</span>
              <span className="social-insight-text">{signal.agent_notes.reason}</span>
            </div>
          )}

          {/* Content idea from agent */}
          {signal.agent_draft && (
            <div className="social-draft-section">
              <span className="social-draft-label">Content Idea</span>
              <div className="social-draft-text">{signal.agent_draft}</div>
            </div>
          )}

          {/* Cross-platform correlation */}
          {signal.agent_notes?.correlation && (
            <div className="social-correlation">
              {signal.agent_notes.correlation}
            </div>
          )}

          {/* Feedback */}
          <div className="social-feedback-section">
            {signal.feedback ? (
              <span className="signal-feedback-given">
                {signal.feedback === "useful" ? "\uD83D\uDC4D" : signal.feedback === "not_useful" ? "\uD83D\uDC4E" : signal.feedback === "wrong" ? "\u274C" : signal.feedback === "spam" ? "\uD83D\uDEAB" : "\u2B50"}{" "}
                {signal.feedback.replace(/_/g, " ")}
                {signal.feedback_note && <span className="signal-feedback-note-text"> &mdash; {signal.feedback_note}</span>}
              </span>
            ) : (
              <div className="social-feedback-actions">
                <button className="btn btn-sm" onClick={() => handleFeedback("useful")} disabled={submitting}>{"\uD83D\uDC4D"} Useful</button>
                <button className="btn btn-sm" onClick={() => handleFeedback("not_useful")} disabled={submitting}>{"\uD83D\uDC4E"} Not useful</button>
                <button className="btn btn-sm" onClick={() => setShowFeedbackInput(!showFeedbackInput)}>More...</button>
              </div>
            )}
            {showFeedbackInput && !signal.feedback && (
              <div className="signal-feedback-expand" style={{ marginTop: 8 }}>
                <input className="input" placeholder="Why? (optional note)" value={feedbackNote} onChange={(e) => setFeedbackNote(e.target.value)} />
                <div className="signal-feedback-expand-actions">
                  {FEEDBACK_OPTIONS.map((opt) => (
                    <button key={opt} className="btn btn-sm" onClick={() => handleFeedback(opt)} disabled={submitting}>{opt.replace(/_/g, " ")}</button>
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

export default function SocialPage() {
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [platform, setPlatform] = useState("all");
  const [expandedId, setExpandedId] = useState(null);

  const fetchSignals = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set("category", "social");
      params.set("limit", "100");
      const res = await fetch(`/api/life-signals?${params}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
      let data = await res.json();
      data = Array.isArray(data) ? data : [];
      setSignals(data);
      setError(null);
    } catch (err) {
      console.error("Failed to load social signals:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSignals();
    const interval = setInterval(fetchSignals, 30000);
    return () => clearInterval(interval);
  }, [fetchSignals]);

  async function handleFeedback(id, update) {
    try {
      const res = await fetch(`/api/life-signals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(update),
      });
      if (!res.ok) throw new Error("Failed to update");
      const updated = await res.json();
      setSignals((prev) => prev.map((s) => (s.id === id ? updated : s)));
    } catch (err) {
      console.error("Feedback error:", err);
    }
  }

  // Filter by platform
  const filtered = platform === "all" ? signals : signals.filter((s) => s.source === platform);

  // Group signals by platform for overview cards
  const platformGroups = {};
  for (const s of signals) {
    if (!platformGroups[s.source]) platformGroups[s.source] = [];
    platformGroups[s.source].push(s);
  }
  const activePlatforms = Object.keys(platformGroups);

  // Separate content ideas from regular signals
  const ideas = filtered.filter((s) => s.signal_type === "content_idea" || s.agent_draft);
  const feed = filtered.filter((s) => s.signal_type !== "content_idea");

  // Stats
  const spikeCount = signals.filter((s) => s.signal_type === "engagement_spike").length;
  const ideaCount = signals.filter((s) => s.signal_type === "content_idea" || s.agent_draft).length;

  return (
    <div>
      <div className="page-header page-header-row">
        <div>
          <h1>Social Intelligence</h1>
          <p>Cross-platform engagement, content performance, and agent-generated ideas.</p>
        </div>
        <div className="life-feed-stats">
          <span className="stat-pill">{activePlatforms.length} platforms</span>
          <span className="stat-pill">{spikeCount} spikes</span>
          <span className="stat-pill">{ideaCount} ideas</span>
        </div>
      </div>

      {/* Platform filter chips */}
      <div className="life-feed-filters">
        <div className="filter-chips">
          {PLATFORMS.map((p) => (
            <button
              key={p.key}
              className={`chip ${platform === p.key ? "chip-active" : ""}`}
              onClick={() => setPlatform(p.key)}
            >
              {p.icon} {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="section-stack">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card skeleton-block" style={{ height: 100 }} />
          ))}
        </div>
      ) : error ? (
        <div className="card empty-card">
          <p className="empty">Error loading social signals: {error}</p>
        </div>
      ) : signals.length === 0 ? (
        <div className="card empty-card">
          <p className="empty">No social signals yet</p>
          <p className="empty-hint">
            Social signals will appear once social-signals.js is running on the Mac Mini.
            Data from YouTube, Instagram, TikTok, LinkedIn, and Pinterest will show here.
          </p>
        </div>
      ) : (
        <>
          {/* Platform overview cards */}
          {platform === "all" && activePlatforms.length > 0 && (
            <div className="social-platform-grid">
              {activePlatforms.map((src) => (
                <PlatformCard key={src} source={src} signals={platformGroups[src]} />
              ))}
            </div>
          )}

          {/* Content ideas section */}
          {ideas.length > 0 && (
            <div className="social-section">
              <h2 className="social-section-title">Content Ideas</h2>
              <div className="section-stack">
                {ideas.map((signal) => (
                  <SocialSignalCard
                    key={signal.id}
                    signal={signal}
                    expanded={expandedId === signal.id}
                    onToggle={() => setExpandedId(expandedId === signal.id ? null : signal.id)}
                    onFeedback={handleFeedback}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Feed */}
          <div className="social-section">
            {ideas.length > 0 && <h2 className="social-section-title">Activity Feed</h2>}
            <div className="section-stack">
              {feed.length > 0 ? feed.map((signal) => (
                <SocialSignalCard
                  key={signal.id}
                  signal={signal}
                  expanded={expandedId === signal.id}
                  onToggle={() => setExpandedId(expandedId === signal.id ? null : signal.id)}
                  onFeedback={handleFeedback}
                />
              )) : (
                <div className="card empty-card">
                  <p className="empty">No activity signals for this filter</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
