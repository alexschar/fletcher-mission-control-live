"use client";
import { useEffect, useState, useCallback } from "react";
import { getAuthHeaders } from "../../lib/api-client";

const FEEDBACK_LABELS = {
  useful: { emoji: "\uD83D\uDC4D", color: "var(--green)" },
  not_useful: { emoji: "\uD83D\uDC4E", color: "var(--yellow)" },
  wrong: { emoji: "\u274C", color: "var(--red)" },
  spam: { emoji: "\uD83D\uDEAB", color: "var(--text-muted)" },
  important: { emoji: "\u2B50", color: "var(--orange)" },
};

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function PreferencesPage() {
  const [stats, setStats] = useState(null);
  const [recentFeedback, setRecentFeedback] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, feedbackRes] = await Promise.all([
        fetch("/api/life-signals?stats=true", { headers: getAuthHeaders() }),
        fetch("/api/life-signals?has_feedback=true&limit=30", { headers: getAuthHeaders() }),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (feedbackRes.ok) {
        const data = await feedbackRes.json();
        setRecentFeedback(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to load preferences data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const weeklyBreakdown = stats?.feedback_this_week || {};
  const totalThisWeek = Object.values(weeklyBreakdown).reduce((a, b) => a + b, 0);

  return (
    <div>
      <div className="page-header">
        <h1>Preferences</h1>
        <p>Your feedback trains the agents. Review accuracy stats and recent feedback here.</p>
      </div>

      {/* Preference Rules */}
      <section className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">Active Preference Rules</div>
        <div className="preferences-content">
{`# Alex's Preferences (read FIRST on every heartbeat)

## SPONSORSHIP HARD RULES
- Affiliate/commission model = ALWAYS REJECT
- Free product + content = REJECT (waste of time)
- Minimum cash compensation: $500 flat rate
- Performance-based only = REJECT
- Interested: tech, dev tools, gaming, creative software, game engines
- Ignore: supplements, dropship courses, crypto, AI wrappers, VPNs
- Red flags: "exclusive opportunity", "limited spots", "act fast"

## EMAIL RULES
- VIP senders: [fill in names/domains]
- Auto-dismiss: "you've been selected", "verify your account"
- Amazon orders: always track, summarize weekly
- Subscription renewals: always flag, note price changes
- Don't draft replies to newsletters or marketing

## SOCIAL RULES
- LinkedIn: flag engagement 2x+ my average
- Instagram: flag reel views spikes
- TikTok: flag view/share spikes
- Pinterest: track boards for project patterns
- YouTube: flag subscriber milestones + top videos

## GENERAL
- Brief summaries, not long explanations
- Match my casual but professional tone in drafts
- When unsure about importance: flag it, don't dismiss`}
        </div>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 10 }}>
          These rules are loaded by agents on every heartbeat via preferences.md.
          Fletcher proposes new rules weekly based on your feedback.
        </p>
      </section>

      {/* Accuracy Stats */}
      <section className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">This Week&apos;s Accuracy</div>
        {loading ? (
          <p className="loading">Loading stats...</p>
        ) : totalThisWeek === 0 ? (
          <div className="empty">
            <p>No feedback this week yet.</p>
            <p className="empty-hint">Rate signals on the Life Feed to train your agents.</p>
          </div>
        ) : (
          <>
            <div className="accuracy-grid">
              {Object.entries(FEEDBACK_LABELS).map(([key, { emoji, color }]) => {
                const count = weeklyBreakdown[key] || 0;
                const pct = totalThisWeek > 0 ? Math.round((count / totalThisWeek) * 100) : 0;
                return (
                  <div key={key} className="card" style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 24 }}>{emoji}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color }}>{count}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "capitalize" }}>
                      {key.replace(/_/g, " ")} ({pct}%)
                    </div>
                  </div>
                );
              })}
            </div>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 12 }}>
              {totalThisWeek} signal{totalThisWeek !== 1 ? "s" : ""} rated this week out of {stats?.total || 0} total.
              {stats?.unread > 0 && ` ${stats.unread} still unread.`}
            </p>
          </>
        )}
      </section>

      {/* Recent Feedback History */}
      <section className="card">
        <div className="card-header">Recent Feedback</div>
        {loading ? (
          <p className="loading">Loading...</p>
        ) : recentFeedback.length === 0 ? (
          <div className="empty">
            <p>No feedback given yet.</p>
          </div>
        ) : (
          <div className="feedback-history-list">
            {recentFeedback.map((signal) => {
              const fb = FEEDBACK_LABELS[signal.feedback] || { emoji: "?", color: "var(--text-muted)" };
              return (
                <div key={signal.id} className="feedback-item">
                  <span style={{ fontSize: 16 }}>{fb.emoji}</span>
                  <span className="feedback-item-signal">{signal.title}</span>
                  <span className="feedback-item-value" style={{ color: fb.color }}>
                    {signal.feedback.replace(/_/g, " ")}
                  </span>
                  {signal.feedback_note && (
                    <span style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>
                      {signal.feedback_note}
                    </span>
                  )}
                  <span className="feedback-item-time">{formatTime(signal.created_at)}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
