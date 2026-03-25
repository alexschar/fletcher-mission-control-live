"use client";
import { useEffect, useState, useCallback } from "react";
import { getAuthHeaders } from "../../lib/api-client";

const PLACEMENTS = [
  { key: "Sun", sign: "Aquarius", emoji: "\u2600\uFE0F", color: "#6c8aff", description: "Core identity and conscious self" },
  { key: "Moon", sign: "Virgo", emoji: "\uD83C\uDF19", color: "#af7aff", description: "Emotions, instincts, inner world" },
  { key: "Rising", sign: "Libra", emoji: "\u2B06\uFE0F", color: "#58a6ff", description: "Outward persona, first impressions" },
];

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function PlacementCard({ placement, signals }) {
  const daily = signals.find((s) => s.signal_type === "daily_horoscope");
  const weekly = signals.find((s) => s.signal_type === "weekly_horoscope");
  const latest = daily || weekly || signals[0];
  const [showWeekly, setShowWeekly] = useState(false);

  if (!latest) {
    return (
      <div className="card horoscope-placement-card" style={{ borderLeftColor: placement.color }}>
        <div className="horoscope-placement-header">
          <span className="horoscope-placement-emoji">{placement.emoji}</span>
          <div>
            <div className="horoscope-placement-title">{placement.key} in {placement.sign}</div>
            <div className="horoscope-placement-desc">{placement.description}</div>
          </div>
        </div>
        <div className="horoscope-empty">No reading yet today. The horoscope fetcher runs each morning.</div>
      </div>
    );
  }

  const activeReading = showWeekly && weekly ? weekly : (daily || latest);

  return (
    <div className="card horoscope-placement-card" style={{ borderLeftColor: placement.color }}>
      <div className="horoscope-placement-header">
        <span className="horoscope-placement-emoji">{placement.emoji}</span>
        <div className="horoscope-placement-info">
          <div className="horoscope-placement-title">{placement.key} in {placement.sign}</div>
          <div className="horoscope-placement-desc">{placement.description}</div>
        </div>
        <span className="horoscope-placement-time">{formatTime(activeReading.created_at)}</span>
      </div>

      {/* Period toggle */}
      {daily && weekly && (
        <div className="horoscope-period-toggle">
          <button className={`horoscope-period-btn ${!showWeekly ? "active" : ""}`} onClick={() => setShowWeekly(false)}>Daily</button>
          <button className={`horoscope-period-btn ${showWeekly ? "active" : ""}`} onClick={() => setShowWeekly(true)}>Weekly</button>
        </div>
      )}

      <div className="horoscope-reading">{activeReading.body}</div>

      {/* Agent interpretation */}
      {activeReading.agent_notes?.interpretation && (
        <div className="horoscope-agent-note">
          <span className="horoscope-agent-label">Agent Note</span>
          <span className="horoscope-agent-text">{activeReading.agent_notes.interpretation}</span>
        </div>
      )}
    </div>
  );
}

export default function HoroscopePage() {
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSignals = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set("source", "horoscope");
      params.set("limit", "30");
      const res = await fetch(`/api/life-signals?${params}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
      let data = await res.json();
      data = Array.isArray(data) ? data : [];
      setSignals(data);
      setError(null);
    } catch (err) {
      console.error("Failed to load horoscope signals:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSignals();
    const interval = setInterval(fetchSignals, 60000);
    return () => clearInterval(interval);
  }, [fetchSignals]);

  // Group signals by placement
  const grouped = {};
  for (const p of PLACEMENTS) {
    grouped[p.key] = signals.filter((s) => {
      const meta = s.metadata || {};
      return meta.placement === p.key || s.title?.includes(p.key);
    });
  }

  // Compute today's date for the header
  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  // History: last 7 days of daily readings (for the Sun sign)
  const sunHistory = signals
    .filter((s) => {
      const meta = s.metadata || {};
      return (meta.placement === "Sun" || s.title?.includes("Sun")) && s.signal_type === "daily_horoscope";
    })
    .slice(0, 7);

  return (
    <div>
      <div className="page-header page-header-row">
        <div>
          <h1>Horoscope</h1>
          <p>{dateStr}</p>
        </div>
        <div className="life-feed-stats">
          <span className="stat-pill">Aquarius Sun</span>
          <span className="stat-pill">Virgo Moon</span>
          <span className="stat-pill">Libra Rising</span>
        </div>
      </div>

      {loading ? (
        <div className="section-stack">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card skeleton-block" style={{ height: 140 }} />
          ))}
        </div>
      ) : error ? (
        <div className="card empty-card">
          <p className="empty">Error loading horoscope: {error}</p>
        </div>
      ) : signals.length === 0 ? (
        <div className="card empty-card">
          <p className="empty">No horoscope readings yet</p>
          <p className="empty-hint">
            Readings appear once horoscope-signals.js is running on the Mac Mini.
            It fetches daily readings for your Sun (Aquarius), Moon (Virgo), and Rising (Libra).
          </p>
        </div>
      ) : (
        <>
          {/* Main placement cards */}
          <div className="horoscope-placements">
            {PLACEMENTS.map((p) => (
              <PlacementCard key={p.key} placement={p} signals={grouped[p.key]} />
            ))}
          </div>

          {/* Recent history */}
          {sunHistory.length > 1 && (
            <div className="horoscope-history-section">
              <h2 className="horoscope-section-title">Recent Readings</h2>
              <div className="section-stack">
                {sunHistory.slice(1).map((s) => (
                  <div key={s.id} className="card horoscope-history-card">
                    <div className="horoscope-history-header">
                      <span className="horoscope-history-date">{formatDate(s.created_at)}</span>
                      <span className="horoscope-history-type">{s.signal_type === "weekly_horoscope" ? "Weekly" : "Daily"}</span>
                    </div>
                    <div className="horoscope-history-text">{s.body?.slice(0, 200)}{s.body?.length > 200 ? "..." : ""}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
