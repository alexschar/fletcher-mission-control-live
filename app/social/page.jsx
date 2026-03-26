"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { getAuthHeaders } from "../../lib/api-client";
import { useLivePolling } from "../../lib/use-live-polling";
import LiveHeader from "../components/LiveHeader";

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
  social_metrics: { label: "Metrics", color: "var(--blue)", bg: "rgba(88,166,255,0.12)" },
  linkedin_engagement: { label: "LinkedIn", color: "var(--blue)", bg: "rgba(88,166,255,0.12)" },
  linkedin_message: { label: "Message", color: "var(--blue)", bg: "rgba(88,166,255,0.12)" },
  linkedin_jobs: { label: "Jobs", color: "var(--blue)", bg: "rgba(88,166,255,0.12)" },
  linkedin_notification: { label: "Notification", color: "var(--blue)", bg: "rgba(88,166,255,0.12)" },
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
  if (n == null) return "\u2014";
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

function DeltaBadge({ value, suffix = "" }) {
  if (value == null || value === 0) return null;
  const sign = value > 0 ? "+" : "";
  const positive = value > 0;
  return (
    <span className={`social-metric-delta ${positive ? "positive" : "negative"}`}>
      {sign}{typeof value === "number" && Math.abs(value) < 100 ? value : formatNumber(value)}{suffix}
    </span>
  );
}

// ==================== Per-Platform Summary Cards ====================

function YouTubeCard({ signals }) {
  const latest = signals.find((s) => s.signal_type === "social_metrics") || signals[0];
  if (!latest) return null;
  const meta = latest.metadata || {};
  return (
    <div className="social-platform-card card">
      <div className="social-platform-header">
        <span className="social-platform-name" style={{ color: platformColor("youtube") }}>YouTube</span>
        <span className="social-platform-time">{formatTime(latest.created_at)}</span>
      </div>
      <div className="social-platform-metrics">
        {meta.subscribers != null && (
          <div className="social-metric">
            <span className="social-metric-value">{formatNumber(meta.subscribers)}</span>
            <span className="social-metric-label">Subscribers</span>
            <DeltaBadge value={meta.subscriber_delta} />
          </div>
        )}
        {meta.total_views != null && (
          <div className="social-metric">
            <span className="social-metric-value">{formatNumber(meta.total_views)}</span>
            <span className="social-metric-label">Total Views</span>
          </div>
        )}
        {meta.video_count != null && (
          <div className="social-metric">
            <span className="social-metric-value">{formatNumber(meta.video_count)}</span>
            <span className="social-metric-label">Videos</span>
          </div>
        )}
      </div>
      {latest.agent_notes?.reason && (
        <div className="social-platform-insight">{latest.agent_notes.reason}</div>
      )}
    </div>
  );
}

function InstagramCard({ signals }) {
  // Group by username — show separate card per account
  const metricSignals = signals.filter((s) => s.signal_type === "social_metrics");
  const byUsername = {};
  for (const s of metricSignals) {
    const user = s.metadata?.username || "instagram";
    if (!byUsername[user]) byUsername[user] = s;
  }
  const accounts = Object.entries(byUsername);

  if (accounts.length === 0) {
    // Fall back to latest signal if no social_metrics
    const latest = signals[0];
    if (!latest) return null;
    const meta = latest.metadata || {};
    accounts.push([meta.username || "instagram", latest]);
  }

  return accounts.map(([username, signal]) => {
    const meta = signal.metadata || {};
    return (
      <div key={username} className="social-platform-card card">
        <div className="social-platform-header">
          <span className="social-platform-name" style={{ color: platformColor("instagram") }}>Instagram</span>
          <span className="social-platform-time">{formatTime(signal.created_at)}</span>
        </div>
        <div className="social-platform-account">@{username}</div>
        <div className="social-platform-metrics">
          {meta.followers != null && (
            <div className="social-metric">
              <span className="social-metric-value">{formatNumber(meta.followers)}</span>
              <span className="social-metric-label">Followers</span>
              <DeltaBadge value={meta.follower_delta} />
              {meta.follower_delta_pct != null && <DeltaBadge value={meta.follower_delta_pct} suffix="%" />}
            </div>
          )}
          {meta.media_count != null && (
            <div className="social-metric">
              <span className="social-metric-value">{formatNumber(meta.media_count)}</span>
              <span className="social-metric-label">Posts</span>
            </div>
          )}
        </div>
        {signal.agent_notes?.reason && (
          <div className="social-platform-insight">{signal.agent_notes.reason}</div>
        )}
      </div>
    );
  });
}

function PinterestCard({ signals }) {
  const latest = signals[0];
  if (!latest) return null;
  const meta = latest.metadata || {};
  const recentTitles = meta.recent_titles || [];

  return (
    <div className="social-platform-card card">
      <div className="social-platform-header">
        <span className="social-platform-name" style={{ color: platformColor("pinterest") }}>Pinterest</span>
        <span className="social-platform-time">{formatTime(latest.created_at)}</span>
      </div>
      <div className="social-platform-metrics">
        {meta.pin_count != null && (
          <div className="social-metric">
            <span className="social-metric-value">{formatNumber(meta.pin_count)}</span>
            <span className="social-metric-label">Pins</span>
          </div>
        )}
        {meta.followers != null && (
          <div className="social-metric">
            <span className="social-metric-value">{formatNumber(meta.followers)}</span>
            <span className="social-metric-label">Followers</span>
          </div>
        )}
      </div>
      {recentTitles.length > 0 && (
        <div className="social-platform-recent">
          <span className="social-platform-recent-label">Recent pins</span>
          {recentTitles.slice(0, 3).map((t, i) => (
            <span key={i} className="social-platform-recent-item">{t}</span>
          ))}
        </div>
      )}
      {latest.agent_notes?.reason && (
        <div className="social-platform-insight">{latest.agent_notes.reason}</div>
      )}
    </div>
  );
}

function TikTokCard() {
  return (
    <div className="social-platform-card card social-platform-pending">
      <div className="social-platform-header">
        <span className="social-platform-name" style={{ color: platformColor("tiktok") }}>TikTok</span>
      </div>
      <div className="social-platform-pending-body">
        <span className="social-platform-pending-icon">{"\uD83D\uDD27"}</span>
        <span className="social-platform-pending-text">API setup pending</span>
        <span className="social-platform-pending-hint">Connect via social-signals.js with Apify</span>
      </div>
    </div>
  );
}

function LinkedInCard({ signals }) {
  // LinkedIn signals come from Gmail notifications
  const now = new Date();
  const weekAgo = new Date(now - 7 * 86400000);
  const thisWeek = signals.filter((s) => new Date(s.created_at) >= weekAgo);

  const engagements = thisWeek.filter((s) => s.signal_type === "linkedin_engagement").length;
  const messages = thisWeek.filter((s) => s.signal_type === "linkedin_message").length;
  const jobs = thisWeek.filter((s) => s.signal_type === "linkedin_jobs").length;
  const other = thisWeek.filter((s) =>
    s.signal_type === "linkedin_notification" ||
    (s.signal_type !== "linkedin_engagement" && s.signal_type !== "linkedin_message" && s.signal_type !== "linkedin_jobs")
  ).length;
  const total = thisWeek.length;
  const latest = signals[0];

  return (
    <div className="social-platform-card card">
      <div className="social-platform-header">
        <span className="social-platform-name" style={{ color: platformColor("linkedin") }}>LinkedIn</span>
        {latest && <span className="social-platform-time">{formatTime(latest.created_at)}</span>}
      </div>
      <div className="social-platform-account">Via email notifications</div>
      {total > 0 ? (
        <div className="social-platform-metrics">
          <div className="social-metric">
            <span className="social-metric-value">{total}</span>
            <span className="social-metric-label">This week</span>
          </div>
          {engagements > 0 && (
            <div className="social-metric">
              <span className="social-metric-value">{engagements}</span>
              <span className="social-metric-label">Engagements</span>
            </div>
          )}
          {messages > 0 && (
            <div className="social-metric">
              <span className="social-metric-value">{messages}</span>
              <span className="social-metric-label">Messages</span>
            </div>
          )}
          {jobs > 0 && (
            <div className="social-metric">
              <span className="social-metric-value">{jobs}</span>
              <span className="social-metric-label">Jobs</span>
            </div>
          )}
        </div>
      ) : (
        <div className="social-platform-pending-body">
          <span className="social-platform-pending-text">No notifications this week</span>
          <span className="social-platform-pending-hint">LinkedIn signals come from Gmail notification parsing</span>
        </div>
      )}
      {latest?.agent_notes?.reason && (
        <div className="social-platform-insight">{latest.agent_notes.reason}</div>
      )}
    </div>
  );
}

// ==================== Signal Card (for feed) ====================

function SocialSignalCard({ signal, onFeedback, onDismiss, expanded, onToggle, isDismissed, isNew }) {
  const [feedbackNote, setFeedbackNote] = useState(signal.feedback_note || "");
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dismissing, setDismissing] = useState(false);

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

  async function handleDismiss(e) {
    e.stopPropagation();
    setDismissing(true);
    setTimeout(() => onDismiss(signal.id), 400);
  }

  return (
    <div className={`card social-signal-card card-dismissable ${expanded ? "social-signal-expanded" : ""} ${isIdea ? "social-idea-card" : ""} ${dismissing ? "card-dismissing" : ""} ${isDismissed ? "card-dismissed-muted" : ""} ${isNew ? "card-new" : ""}`} data-priority={signal.priority}>
      {!isDismissed && <button className="dismiss-btn" onClick={handleDismiss} title="Dismiss signal">{"\u2715"}</button>}
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

// ==================== Main Page ====================

export default function SocialPage() {
  const [platform, setPlatform] = useState("all");
  const [expandedId, setExpandedId] = useState(null);
  const [showDismissed, setShowDismissed] = useState(false);
  const feedTopRef = useRef(null);

  const fetchFn = useCallback(async () => {
    const dismissed = showDismissed ? "" : "&exclude_dismissed=true";

    const [sRes, pRes, lRes] = await Promise.all([
      fetch(`/api/life-signals?category=social&limit=100${dismissed}`, { headers: getAuthHeaders() }),
      fetch(`/api/life-signals?category=creative&source=pinterest&limit=50${dismissed}`, { headers: getAuthHeaders() }),
      fetch(`/api/life-signals?category=email&source=gmail&limit=100${dismissed}`, { headers: getAuthHeaders() }),
    ]);

    if (!sRes.ok) throw new Error(`Social fetch failed: ${sRes.status}`);

    const socialRaw = await sRes.json();
    const pinterestRaw = pRes.ok ? await pRes.json() : [];
    const linkedinRaw = lRes.ok ? await lRes.json() : [];

    const social = Array.isArray(socialRaw) ? socialRaw : [];
    const pinterest = Array.isArray(pinterestRaw) ? pinterestRaw : [];
    const linkedin = (Array.isArray(linkedinRaw) ? linkedinRaw : []).filter((s) =>
      s.signal_type?.startsWith("linkedin_")
    );

    // Tag each signal with its source group for later filtering
    social.forEach((s) => { s._group = "social"; });
    pinterest.forEach((s) => { s._group = "pinterest"; });
    linkedin.forEach((s) => { s._group = "linkedin"; });

    return [...social, ...pinterest, ...linkedin].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [showDismissed]);

  const {
    data: allSignals,
    loading,
    error,
    newCount,
    clearNew,
    isNew,
    lastRefreshed,
  } = useLivePolling(fetchFn, { interval: 300000 }); // 5 minutes

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

  // Derive platform-specific arrays from combined data
  const socialSignals = allSignals.filter((s) => s._group === "social");
  const pinterestSignals = allSignals.filter((s) => s._group === "pinterest");
  const linkedinSignals = allSignals.filter((s) => s._group === "linkedin");

  const youtubeSignals = socialSignals.filter((s) => s.source === "youtube");
  const instagramSignals = socialSignals.filter((s) => s.source === "instagram");
  const hasTikTokSignals = socialSignals.some((s) => s.source === "tiktok");

  // Determine which platform label maps to which source for filtering the feed
  function feedSourceMatch(signal) {
    if (platform === "all") return true;
    if (platform === "linkedin") return linkedinSignals.some((l) => l.id === signal.id);
    if (platform === "pinterest") return pinterestSignals.some((p) => p.id === signal.id) || signal.source === "pinterest";
    return signal.source === platform;
  }

  const filtered = allSignals.filter(feedSourceMatch);

  // Separate content ideas from regular signals
  const ideas = filtered.filter((s) => s.signal_type === "content_idea" || s.agent_draft);
  const feed = filtered.filter((s) => s.signal_type !== "content_idea");

  // Stats
  const spikeCount = allSignals.filter((s) => s.signal_type === "engagement_spike").length;
  const ideaCount = allSignals.filter((s) => s.signal_type === "content_idea" || s.agent_draft).length;

  // Count active platforms
  const activePlatformSet = new Set();
  if (youtubeSignals.length > 0) activePlatformSet.add("youtube");
  if (instagramSignals.length > 0) activePlatformSet.add("instagram");
  if (pinterestSignals.length > 0) activePlatformSet.add("pinterest");
  if (linkedinSignals.length > 0) activePlatformSet.add("linkedin");
  if (hasTikTokSignals) activePlatformSet.add("tiktok");

  return (
    <div>
      <div className="page-header page-header-row">
        <div>
          <h1>Social Intelligence</h1>
          <p>Cross-platform engagement, content performance, and agent-generated ideas.</p>
        </div>
        <div className="life-feed-stats">
          <span className="stat-pill">{activePlatformSet.size} platforms</span>
          <span className="stat-pill">{spikeCount} spikes</span>
          <span className="stat-pill">{ideaCount} ideas</span>
        </div>
      </div>

      <LiveHeader lastRefreshed={lastRefreshed} newCount={newCount} onClickNew={scrollToNew} />

      {/* Platform filter chips — filter the feed list only, not summary cards */}
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
        <button className="dismiss-toggle" onClick={() => setShowDismissed(!showDismissed)}>
          <span className={`dismiss-toggle-dot ${showDismissed ? "active" : ""}`} />
          {showDismissed ? "Showing dismissed" : "Show dismissed"}
        </button>
      </div>

      <div ref={feedTopRef} />

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
      ) : allSignals.length === 0 && !hasTikTokSignals ? (
        <div className="card empty-card">
          <p className="empty">No social signals yet</p>
          <p className="empty-hint">
            Social signals will appear once social-signals.js is running on the Mac Mini.
            Data from YouTube, Instagram, TikTok, LinkedIn, and Pinterest will show here.
          </p>
        </div>
      ) : (
        <>
          {/* Platform summary cards — always visible regardless of filter */}
          <div className="social-platform-grid">
            {youtubeSignals.length > 0 && <YouTubeCard signals={youtubeSignals} />}
            {instagramSignals.length > 0 && <InstagramCard signals={instagramSignals} />}
            {!hasTikTokSignals && <TikTokCard />}
            {linkedinSignals.length > 0 && <LinkedInCard signals={linkedinSignals} />}
            {pinterestSignals.length > 0 && <PinterestCard signals={pinterestSignals} />}
          </div>

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
                    onDismiss={handleDismiss}
                    isDismissed={signal.status === "dismissed"}
                    isNew={isNew(signal.id)}
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
                  onDismiss={handleDismiss}
                  isDismissed={signal.status === "dismissed"}
                  isNew={isNew(signal.id)}
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
