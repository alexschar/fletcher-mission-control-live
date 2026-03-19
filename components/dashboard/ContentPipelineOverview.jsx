"use client";

import { useEffect, useMemo, useState } from "react";
import { getAuthHeaders, logout } from "../../lib/api-client";

const DAY_WINDOW = 7;

function formatRelativeTimestamp(value) {
  if (!value) return "No drops yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

function buildLastSevenDays() {
  const days = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  for (let index = DAY_WINDOW - 1; index >= 0; index -= 1) {
    const day = new Date(now);
    day.setDate(now.getDate() - index);
    days.push(day.toISOString().slice(0, 10));
  }
  return days;
}

function humanizePlatform(platform) {
  return String(platform || "other").replaceAll("_", " ");
}

function getPlatformColor(platform) {
  const palette = {
    youtube: "var(--red)",
    tiktok: "var(--accent)",
    instagram: "var(--purple)",
    twitter: "var(--blue)",
    web: "var(--green)",
    other: "var(--yellow)",
  };
  return palette[platform] || "var(--text-secondary)";
}

export default function ContentPipelineOverview() {
  const [state, setState] = useState({ loading: true, error: "", summary: null, recentDrops: [] });

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const since = new Date(Date.now() - DAY_WINDOW * 24 * 60 * 60 * 1000).toISOString();
        const headers = getAuthHeaders();
        const [summaryResponse, dropsResponse] = await Promise.all([
          fetch("/api/content-pipeline/summary", { headers }),
          fetch(`/api/content-drops?limit=100&since=${encodeURIComponent(since)}`, { headers }),
        ]);
        if (summaryResponse.status === 401 || dropsResponse.status === 401) {
          logout();
          throw new Error("Authentication expired");
        }
        const [summaryData, dropsData] = await Promise.all([summaryResponse.json(), dropsResponse.json()]);
        if (!summaryResponse.ok) throw new Error(summaryData.error || "Failed to load content pipeline summary");
        if (!dropsResponse.ok) throw new Error(dropsData.error || "Failed to load content drops");
        if (!ignore) setState({ loading: false, error: "", summary: summaryData, recentDrops: Array.isArray(dropsData) ? dropsData : [] });
      } catch (error) {
        if (!ignore) setState({ loading: false, error: error.message || "Failed to load content pipeline data", summary: null, recentDrops: [] });
      }
    }
    load();
    return () => { ignore = true; };
  }, []);

  const derived = useMemo(() => {
    const days = buildLastSevenDays();
    const grouped = {};
    days.forEach((day) => { grouped[day] = {}; });
    for (const drop of state.recentDrops) {
      const day = String(drop.created_at || "").slice(0, 10);
      if (!grouped[day]) continue;
      const platform = String(drop.platform || "other");
      grouped[day][platform] = (grouped[day][platform] || 0) + 1;
    }
    const platforms = Array.from(new Set(state.recentDrops.map((drop) => String(drop.platform || "other"))));
    const activePlatforms = platforms.length ? platforms.sort() : Object.keys(state.summary?.platform_breakdown || {}).sort();
    const maxDailyDrops = Math.max(1, ...days.map((day) => Object.values(grouped[day] || {}).reduce((sum, value) => sum + value, 0)));
    return { days, grouped, activePlatforms, maxDailyDrops };
  }, [state.recentDrops, state.summary]);

  if (state.loading) return <section className="card dashboard-card dashboard-card-wide"><div className="card-header">Content Pipeline</div><div className="dashboard-empty-state">Loading content pipeline metrics…</div></section>;
  if (state.error) return <section className="card dashboard-card dashboard-card-wide"><div className="card-header">Content Pipeline</div><div className="dashboard-empty-state">{state.error}</div></section>;

  const summary = state.summary || {};
  const lastDrop = summary.recent_drops?.[0] || state.recentDrops?.[0] || null;

  return (
    <section className="card dashboard-card dashboard-card-wide content-pipeline-card">
      <div className="content-pipeline-header-row">
        <div>
          <div className="card-header">Content Pipeline</div>
          <p className="dashboard-card-note">Live from /api/content-drops and /api/content-pipeline/summary</p>
        </div>
        <div className="content-pipeline-last-drop"><span>Last drop</span><strong>{formatRelativeTimestamp(lastDrop?.created_at)}</strong></div>
      </div>
      <div className="content-pipeline-top-stats">
        <div><strong>{summary.unprocessed_count || 0}</strong><span>Unprocessed</span></div>
        <div><strong>{summary.total_drops || 0}</strong><span>Total drops</span></div>
        <div><strong>{derived.activePlatforms.length || 0}</strong><span>Active platforms</span></div>
      </div>
      <div className="content-pipeline-layout">
        <div className="content-pipeline-chart">
          <div className="content-pipeline-subheader">Drops per day by platform</div>
          <div className="content-pipeline-day-grid">
            {derived.days.map((day) => {
              const total = Object.values(derived.grouped[day] || {}).reduce((sum, value) => sum + value, 0);
              return (
                <div key={day} className="content-pipeline-day-card">
                  <div className="content-pipeline-day-bars">
                    {derived.activePlatforms.length ? derived.activePlatforms.map((platform) => {
                      const count = derived.grouped[day]?.[platform] || 0;
                      const height = count ? Math.max(14, Math.round((count / derived.maxDailyDrops) * 100)) : 10;
                      return <div key={`${day}-${platform}`} className="content-pipeline-bar" title={`${humanizePlatform(platform)}: ${count}`} style={{ height: `${height}%`, background: getPlatformColor(platform), opacity: count ? 1 : 0.18 }} />;
                    }) : <div className="dashboard-empty-state">No recent drops</div>}
                  </div>
                  <div className="content-pipeline-day-meta"><strong>{total}</strong><span>{new Date(`${day}T00:00:00`).toLocaleDateString("en-US", { weekday: "short" })}</span></div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="content-pipeline-sidepanel">
          <div>
            <div className="content-pipeline-subheader">Platform totals</div>
            <div className="content-pipeline-platform-list">
              {Object.entries(summary.platform_breakdown || {}).sort((a, b) => b[1] - a[1]).map(([platform, count]) => (
                <div key={platform} className="content-pipeline-platform-row"><span className="content-pipeline-platform-label"><span className="content-pipeline-platform-dot" style={{ background: getPlatformColor(platform) }} />{humanizePlatform(platform)}</span><strong>{count}</strong></div>
              ))}
              {!Object.keys(summary.platform_breakdown || {}).length ? <div className="dashboard-empty-state">No platform data yet.</div> : null}
            </div>
          </div>
          <div>
            <div className="content-pipeline-subheader">Recent intake</div>
            <div className="content-pipeline-recent-list">
              {(summary.recent_drops || []).slice(0, 3).map((drop) => (
                <div key={drop.id} className="content-pipeline-recent-item"><strong>{drop.title?.trim() || humanizePlatform(drop.platform)}</strong><span>{humanizePlatform(drop.platform)} · {formatRelativeTimestamp(drop.created_at)}</span></div>
              ))}
              {!(summary.recent_drops || []).length ? <div className="dashboard-empty-state">No drops yet.</div> : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
