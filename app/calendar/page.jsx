"use client";
import { useEffect, useState, useCallback } from "react";
import { getAuthHeaders } from "../../lib/api-client";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function formatTime12(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

function formatDuration(start, end) {
  if (!start || !end) return "";
  const ms = new Date(end) - new Date(start);
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function isToday(iso) {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function isTomorrow(iso) {
  if (!iso) return false;
  const d = new Date(iso);
  const tmr = new Date();
  tmr.setDate(tmr.getDate() + 1);
  return d.toDateString() === tmr.toDateString();
}

function isThisWeek(iso) {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + (7 - weekEnd.getDay()));
  return d >= now && d <= weekEnd;
}

function detectConflicts(events) {
  const sorted = [...events].sort((a, b) => new Date(a.metadata?.start_time || a.created_at) - new Date(b.metadata?.start_time || b.created_at));
  const conflicts = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const aEnd = sorted[i].metadata?.end_time;
    const bStart = sorted[i + 1].metadata?.start_time;
    if (aEnd && bStart && new Date(aEnd) > new Date(bStart)) {
      conflicts.push([sorted[i].id, sorted[i + 1].id]);
    }
  }
  return conflicts;
}

function freeBlocks(events, dayStart, dayEnd) {
  const sorted = [...events]
    .filter((e) => e.metadata?.start_time && e.metadata?.end_time)
    .sort((a, b) => new Date(a.metadata.start_time) - new Date(b.metadata.start_time));

  const blocks = [];
  let cursor = new Date(dayStart);
  const end = new Date(dayEnd);

  for (const ev of sorted) {
    const evStart = new Date(ev.metadata.start_time);
    if (evStart > cursor) {
      const gap = (evStart - cursor) / 60000;
      if (gap >= 30) {
        blocks.push({ start: new Date(cursor), end: evStart, minutes: gap });
      }
    }
    const evEnd = new Date(ev.metadata.end_time);
    if (evEnd > cursor) cursor = evEnd;
  }
  if (end > cursor) {
    const gap = (end - cursor) / 60000;
    if (gap >= 30) {
      blocks.push({ start: new Date(cursor), end, minutes: gap });
    }
  }
  return blocks;
}

function EventCard({ signal, isConflict, onFeedback }) {
  const meta = signal.metadata || {};
  const startTime = meta.start_time;
  const endTime = meta.end_time;
  const location = meta.location;
  const calendar = meta.calendar_name || signal.source;
  const attendees = meta.attendees || [];
  const isAllDay = meta.all_day;
  const meetLink = meta.meet_link || meta.zoom_link || meta.video_link;

  return (
    <div className={`card calendar-event-card ${isConflict ? "calendar-conflict" : ""} ${signal.priority === "urgent" ? "calendar-urgent" : ""}`}>
      <div className="calendar-event-row">
        <div className="calendar-event-time-col">
          {isAllDay ? (
            <span className="calendar-all-day">All day</span>
          ) : (
            <>
              <span className="calendar-event-start">{formatTime12(startTime)}</span>
              <span className="calendar-event-duration">{formatDuration(startTime, endTime)}</span>
            </>
          )}
        </div>
        <div className="calendar-event-main">
          <div className="calendar-event-title">{signal.title}</div>
          <div className="calendar-event-meta">
            {calendar && <span className="calendar-event-cal">{calendar}</span>}
            {location && <span className="calendar-event-loc">{location}</span>}
            {meetLink && <a href={meetLink} target="_blank" rel="noopener noreferrer" className="calendar-event-link">Join</a>}
          </div>
          {attendees.length > 0 && (
            <div className="calendar-event-attendees">
              {attendees.slice(0, 3).join(", ")}{attendees.length > 3 ? ` +${attendees.length - 3}` : ""}
            </div>
          )}
          {signal.agent_notes?.reason && (
            <div className="calendar-event-insight">{signal.agent_notes.reason}</div>
          )}
        </div>
        <div className="calendar-event-badges">
          {isConflict && <span className="badge badge-red">Conflict</span>}
          {signal.priority !== "normal" && signal.priority !== "low" && (
            <span className="signal-priority-badge" style={{ borderColor: signal.priority === "urgent" ? "var(--red)" : "var(--orange)", color: signal.priority === "urgent" ? "var(--red)" : "var(--orange)" }}>
              {signal.priority}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSignals = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set("category", "calendar");
      params.set("limit", "50");
      const res = await fetch(`/api/life-signals?${params}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
      let data = await res.json();
      data = Array.isArray(data) ? data : [];
      setSignals(data);
      setError(null);
    } catch (err) {
      console.error("Failed to load calendar signals:", err);
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

  // Sort by start_time
  const sorted = [...signals].sort((a, b) => {
    const aTime = a.metadata?.start_time || a.created_at;
    const bTime = b.metadata?.start_time || b.created_at;
    return new Date(aTime) - new Date(bTime);
  });

  // Group into today / tomorrow / this week / later
  const today = sorted.filter((s) => isToday(s.metadata?.start_time || s.created_at));
  const tomorrow = sorted.filter((s) => isTomorrow(s.metadata?.start_time || s.created_at));
  const thisWeek = sorted.filter((s) => {
    const t = s.metadata?.start_time || s.created_at;
    return isThisWeek(t) && !isToday(t) && !isTomorrow(t);
  });

  // Detect conflicts in today's events
  const conflictPairs = detectConflicts(today);
  const conflictIds = new Set(conflictPairs.flat());

  // Calculate free blocks for today
  const now = new Date();
  const dayStart = new Date(now); dayStart.setHours(8, 0, 0, 0);
  const dayEnd = new Date(now); dayEnd.setHours(20, 0, 0, 0);
  const todayFreeBlocks = freeBlocks(today, dayStart, dayEnd);
  const totalFreeMinutes = todayFreeBlocks.reduce((sum, b) => sum + b.minutes, 0);

  // Agent insights from any signal
  const agentInsights = sorted.filter((s) => s.agent_notes?.reason || s.agent_draft).slice(0, 3);

  const nowDate = new Date();
  const dateStr = `${DAYS[nowDate.getDay()]}, ${MONTHS[nowDate.getMonth()]} ${nowDate.getDate()}`;

  return (
    <div>
      <div className="page-header page-header-row">
        <div>
          <h1>Calendar</h1>
          <p>{dateStr}</p>
        </div>
        <div className="life-feed-stats">
          <span className="stat-pill">{today.length} today</span>
          <span className="stat-pill">{tomorrow.length} tomorrow</span>
          {conflictPairs.length > 0 && <span className="stat-pill stat-pill-red">{conflictPairs.length} conflicts</span>}
        </div>
      </div>

      {loading ? (
        <div className="section-stack">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card skeleton-block" style={{ height: 80 }} />
          ))}
        </div>
      ) : error ? (
        <div className="card empty-card">
          <p className="empty">Error loading calendar: {error}</p>
        </div>
      ) : signals.length === 0 ? (
        <div className="card empty-card">
          <p className="empty">No calendar signals yet</p>
          <p className="empty-hint">
            Calendar signals will appear once calendar-signals.js is running on the Mac Mini.
            Events from Google Calendar (personal + work) will show here.
          </p>
        </div>
      ) : (
        <>
          {/* Free time summary */}
          {today.length > 0 && (
            <div className="calendar-free-summary card">
              <div className="calendar-free-header">Today&apos;s availability</div>
              <div className="calendar-free-blocks">
                {todayFreeBlocks.length > 0 ? todayFreeBlocks.map((b, i) => (
                  <span key={i} className="calendar-free-block">
                    {formatTime12(b.start.toISOString())} – {formatTime12(b.end.toISOString())} ({formatDuration(b.start.toISOString(), b.end.toISOString())})
                  </span>
                )) : (
                  <span className="calendar-no-free">No free blocks (8 AM – 8 PM)</span>
                )}
              </div>
              <div className="calendar-free-total">{Math.floor(totalFreeMinutes / 60)}h {totalFreeMinutes % 60}m free today</div>
            </div>
          )}

          {/* Conflict alerts */}
          {conflictPairs.length > 0 && (
            <div className="calendar-conflicts-banner card">
              <span className="calendar-conflicts-icon">!</span>
              <span>{conflictPairs.length} scheduling conflict{conflictPairs.length > 1 ? "s" : ""} detected today</span>
            </div>
          )}

          {/* Today */}
          {today.length > 0 && (
            <div className="calendar-section">
              <h2 className="calendar-section-title">Today</h2>
              <div className="section-stack">
                {today.map((s) => (
                  <EventCard key={s.id} signal={s} isConflict={conflictIds.has(s.id)} />
                ))}
              </div>
            </div>
          )}

          {/* Tomorrow */}
          {tomorrow.length > 0 && (
            <div className="calendar-section">
              <h2 className="calendar-section-title">Tomorrow</h2>
              <div className="section-stack">
                {tomorrow.map((s) => (
                  <EventCard key={s.id} signal={s} isConflict={false} />
                ))}
              </div>
            </div>
          )}

          {/* This week */}
          {thisWeek.length > 0 && (
            <div className="calendar-section">
              <h2 className="calendar-section-title">This Week</h2>
              <div className="section-stack">
                {thisWeek.map((s) => (
                  <EventCard key={s.id} signal={s} isConflict={false} />
                ))}
              </div>
            </div>
          )}

          {/* Agent insights */}
          {agentInsights.length > 0 && (
            <div className="calendar-section">
              <h2 className="calendar-section-title">Agent Insights</h2>
              <div className="section-stack">
                {agentInsights.map((s) => (
                  <div key={s.id} className="card calendar-insight-card">
                    <div className="calendar-insight-title">{s.title}</div>
                    {s.agent_notes?.reason && <div className="calendar-insight-text">{s.agent_notes.reason}</div>}
                    {s.agent_draft && <div className="calendar-insight-draft">{s.agent_draft}</div>}
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
