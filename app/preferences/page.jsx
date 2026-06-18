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

const ACTION_TYPE_ICONS = {
  create: "\u2795",
  update: "\u270F\uFE0F",
  delete: "\uD83D\uDDD1\uFE0F",
  execute: "\u25B6\uFE0F",
  analyze: "\uD83D\uDD0D",
  verify: "\u2705",
  deploy: "\uD83D\uDE80",
  other: "\uD83D\uDCCC",
};

const LEARNING_CATEGORIES = {
  technical: { icon: "\uD83D\uDCDA", color: "var(--blue)" },
  process: { icon: "\uD83D\uDCC1", color: "var(--green)" },
  preference: { icon: "\u2B50", color: "var(--orange)" },
  error: { icon: "\u26A0\uFE0F", color: "var(--red)" },
  pattern: { icon: "\uD83D\uDCA1", color: "var(--purple)" },
  other: { icon: "\uD83D\uDCCC", color: "var(--text-muted)" },
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

function formatDateTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PreferencesPage() {
  const [stats, setStats] = useState(null);
  const [recentFeedback, setRecentFeedback] = useState([]);
  const [loading, setLoading] = useState(true);

  // Agent Actions state
  const [actions, setActions] = useState([]);
  const [actionStats, setActionStats] = useState(null);
  const [actionsLoading, setActionsLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState({ agent: "", type: "" });

  // Learnings state
  const [learnings, setLearnings] = useState([]);
  const [learningStats, setLearningStats] = useState(null);
  const [learningsLoading, setLearningsLoading] = useState(true);
  const [learningFilter, setLearningFilter] = useState({ agent: "", category: "", search: "" });
  const [expandedLearning, setExpandedLearning] = useState(null);

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

  const fetchActions = useCallback(async () => {
    setActionsLoading(true);
    try {
      const params = new URLSearchParams();
      if (actionFilter.agent) params.append("agent", actionFilter.agent);
      if (actionFilter.type) params.append("action_type", actionFilter.type);
      params.append("limit", "50");

      const [actionsRes, statsRes] = await Promise.all([
        fetch(`/api/agent-activity?resource=actions&${params}`, { headers: getAuthHeaders() }),
        fetch("/api/agent-activity?stats=true", { headers: getAuthHeaders() }),
      ]);

      if (actionsRes.ok) setActions(await actionsRes.json());
      if (statsRes.ok) setActionStats(await statsRes.json());
    } catch (err) {
      console.error("Failed to load actions:", err);
    } finally {
      setActionsLoading(false);
    }
  }, [actionFilter]);

  const fetchLearnings = useCallback(async () => {
    setLearningsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("resource", "learnings");
      if (learningFilter.agent) params.append("agent", learningFilter.agent);
      if (learningFilter.category) params.append("category", learningFilter.category);
      if (learningFilter.search) params.append("search", learningFilter.search);
      params.append("limit", "50");

      const [learningsRes, statsRes] = await Promise.all([
        fetch(`/api/agent-activity?${params}`, { headers: getAuthHeaders() }),
        fetch("/api/agent-activity?resource=learnings&stats=true", { headers: getAuthHeaders() }),
      ]);

      if (learningsRes.ok) setLearnings(await learningsRes.json());
      if (statsRes.ok) setLearningStats(await statsRes.json());
    } catch (err) {
      console.error("Failed to load learnings:", err);
    } finally {
      setLearningsLoading(false);
    }
  }, [learningFilter]);

  useEffect(() => {
    fetchData();
    fetchActions();
    fetchLearnings();
  }, [fetchData, fetchActions, fetchLearnings]);

  const weeklyBreakdown = stats?.feedback_this_week || {};
  const totalThisWeek = Object.values(weeklyBreakdown).reduce((a, b) => a + b, 0);

  // Get unique agents and types for filters
  const uniqueAgents = [...new Set([...actions.map(a => a.agent), ...learnings.map(l => l.agent)])];
  const uniqueActionTypes = [...new Set(actions.map(a => a.action_type))];
  const uniqueCategories = [...new Set(learnings.map(l => l.category))];

  return (
    <div>
      <div className="page-header">
        <h1>Preferences</h1>
        <p>Your feedback trains the agents. Review accuracy stats, agent actions, and the learnings repository.</p>
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

      {/* Agent Actions Log */}
      <section className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          Agent Actions Log
          {actionStats && (
            <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 12, fontWeight: 400 }}>
              {actionStats.total} actions this {actionStats.period}
            </span>
          )}
        </div>

        {/* Action Filters */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <select
            value={actionFilter.agent}
            onChange={(e) => setActionFilter(f => ({ ...f, agent: e.target.value }))}
            style={{
              padding: "6px 10px",
              borderRadius: 6,
              border: "1px solid var(--border-color)",
              background: "var(--bg-secondary)",
              color: "var(--text-primary)",
              fontSize: 13,
            }}
          >
            <option value="">All Agents</option>
            {uniqueAgents.map(agent => (
              <option key={agent} value={agent}>{agent}</option>
            ))}
          </select>
          <select
            value={actionFilter.type}
            onChange={(e) => setActionFilter(f => ({ ...f, type: e.target.value }))}
            style={{
              padding: "6px 10px",
              borderRadius: 6,
              border: "1px solid var(--border-color)",
              background: "var(--bg-secondary)",
              color: "var(--text-primary)",
              fontSize: 13,
            }}
          >
            <option value="">All Types</option>
            {uniqueActionTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {actionsLoading ? (
          <p className="loading">Loading actions...</p>
        ) : actions.length === 0 ? (
          <div className="empty">
            <p>No agent actions recorded yet.</p>
          </div>
        ) : (
          <div className="actions-list" style={{ maxHeight: 400, overflow: "auto" }}>
            {actions.map((action) => {
              const icon = ACTION_TYPE_ICONS[action.action_type] || ACTION_TYPE_ICONS.other;
              const statusColor = {
                completed: "var(--green)",
                failed: "var(--red)",
                in_progress: "var(--orange)",
                pending: "var(--yellow)",
              }[action.status] || "var(--text-muted)";

              return (
                <div
                  key={action.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 0",
                    borderBottom: "1px solid var(--border-color)",
                  }}
                >
                  <span style={{ fontSize: 16 }}>{icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontWeight: 500, fontSize: 14 }}>{action.action_type}</span>
                      <span
                        style={{
                          fontSize: 11,
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: statusColor,
                          color: "#fff",
                          textTransform: "uppercase",
                        }}
                      >
                        {action.status}
                      </span>
                    </div>
                    {action.description && (
                      <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "4px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {action.description}
                      </p>
                    )}
                    {action.target && (
                      <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "2px 0 0" }}>
                        Target: {action.target}
                      </p>
                    )}
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-primary)" }}>
                      {action.agent}
                    </span>
                    <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>
                      {formatTime(action.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Learnings Repository */}
      <section className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          Learnings Repository
          {learningStats && (
            <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 12, fontWeight: 400 }}>
              {learningStats.verified} verified · {learningStats.unverified} pending
            </span>
          )}
        </div>

        {/* Learning Filters */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <select
            value={learningFilter.agent}
            onChange={(e) => setLearningFilter(f => ({ ...f, agent: e.target.value }))}
            style={{
              padding: "6px 10px",
              borderRadius: 6,
              border: "1px solid var(--border-color)",
              background: "var(--bg-secondary)",
              color: "var(--text-primary)",
              fontSize: 13,
            }}
          >
            <option value="">All Agents</option>
            {uniqueAgents.map(agent => (
              <option key={agent} value={agent}>{agent}</option>
            ))}
          </select>
          <select
            value={learningFilter.category}
            onChange={(e) => setLearningFilter(f => ({ ...f, category: e.target.value }))}
            style={{
              padding: "6px 10px",
              borderRadius: 6,
              border: "1px solid var(--border-color)",
              background: "var(--bg-secondary)",
              color: "var(--text-primary)",
              fontSize: 13,
            }}
          >
            <option value="">All Categories</option>
            {uniqueCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Search learnings..."
            value={learningFilter.search}
            onChange={(e) => setLearningFilter(f => ({ ...f, search: e.target.value }))}
            style={{
              padding: "6px 10px",
              borderRadius: 6,
              border: "1px solid var(--border-color)",
              background: "var(--bg-secondary)",
              color: "var(--text-primary)",
              fontSize: 13,
              flex: 1,
              minWidth: 150,
            }}
          />
        </div>

        {learningsLoading ? (
          <p className="loading">Loading learnings...</p>
        ) : learnings.length === 0 ? (
          <div className="empty">
            <p>No learnings recorded yet.</p>
            <p className="empty-hint">Agents will add learnings as they discover patterns and solutions.</p>
          </div>
        ) : (
          <div className="learnings-list" style={{ maxHeight: 500, overflow: "auto" }}>
            {learnings.map((learning) => {
              const category = LEARNING_CATEGORIES[learning.category] || LEARNING_CATEGORIES.other;
              const isExpanded = expandedLearning === learning.id;

              return (
                <div
                  key={learning.id}
                  style={{
                    padding: "12px 0",
                    borderBottom: "1px solid var(--border-color)",
                    cursor: "pointer",
                  }}
                  onClick={() => setExpandedLearning(isExpanded ? null : learning.id)}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <span style={{ fontSize: 18 }}>{category.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 500, fontSize: 14 }}>{learning.title}</span>
                        <span
                          style={{
                            fontSize: 10,
                            padding: "2px 6px",
                            borderRadius: 4,
                            background: learning.verified ? "var(--green)" : "var(--yellow)",
                            color: "#fff",
                            textTransform: "uppercase",
                          }}
                        >
                          {learning.verified ? "verified" : "pending"}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          {learning.agent} · {learning.category}
                        </span>
                        {learning.applied_count > 0 && (
                          <span style={{ fontSize: 11, color: "var(--blue)" }}>
                            Applied {learning.applied_count} time{learning.applied_count !== 1 ? "s" : ""}
                          </span>
                        )}
                        <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: "auto" }}>
                          {formatTime(learning.created_at)}
                        </span>
                      </div>

                      {isExpanded && (
                        <div style={{ marginTop: 12, padding: 12, background: "var(--bg-secondary)", borderRadius: 6 }}>
                          <p style={{ fontSize: 13, color: "var(--text-primary)", margin: 0, whiteSpace: "pre-wrap" }}>
                            {learning.content}
                          </p>
                          {learning.source && (
                            <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "8px 0 0" }}>
                              Source: {learning.source}
                            </p>
                          )}
                          <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "8px 0 0" }}>
                            Created: {formatDateTime(learning.created_at)}
                            {learning.updated_at && learning.updated_at !== learning.created_at && (
                              <> · Updated: {formatDateTime(learning.updated_at)}</>
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: 12, color: "var(--text-muted)", transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                      ▼
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
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
