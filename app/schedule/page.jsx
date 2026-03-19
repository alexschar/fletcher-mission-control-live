"use client";
import { useState, useEffect } from "react";
import { getAuthHeaders, isAuthenticated, logout } from "../../lib/api-client";
import ClientTimestamp from "../components/ClientTimestamp";
import { useRouter } from "next/navigation";
import { useToast } from "../components/ToastProvider";

function normalizeScheduleResponse(data, previous = []) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    if (Array.isArray(data.items)) return data.items;
    if (data.ok) return previous;
  }
  return previous;
}

export default function SchedulePage() {
  const [items, setItems] = useState([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", schedule: "", description: "" });
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    fetch("/api/schedule", { headers: getAuthHeaders() })
      .then(r => r.ok ? r.json() : (r.status === 401 ? (logout(), router.push('/login')) : []))
      .then(data => setItems(normalizeScheduleResponse(data)))
      .catch(() => {});
  }, [router]);

  async function addItem(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    const res = await fetch("/api/schedule", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ ...form, status: "active", lastRun: null })
    });
    if (res.status === 401) {
      logout();
      router.push('/login');
      return;
    }
    const updated = await res.json();
    if (!res.ok) {
      toast.error(updated.error || 'Failed to add job');
      return;
    }
    setItems(current => normalizeScheduleResponse(updated, current));
    setForm({ name: "", schedule: "", description: "" });
    setAdding(false);
    toast.success('Scheduled job added');
  }

  async function toggleItem(id, currentStatus) {
    const res = await fetch("/api/schedule", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ action: "update", id, updates: { status: currentStatus === "active" ? "paused" : "active" } })
    });
    if (res.status === 401) {
      logout();
      router.push('/login');
      return;
    }
    const updated = await res.json();
    if (!res.ok) {
      toast.error(updated.error || 'Failed to update job');
      return;
    }
    setItems(current => normalizeScheduleResponse(updated, current));
    toast.success(`Job ${currentStatus === "active" ? "paused" : "resumed"}`);
  }

  // Seed with defaults if empty
  const displayItems = items.length > 0 ? items : [
    { id: "1", name: "Heartbeat Check", schedule: "Every 120m", description: "Check project status, drift detection, energy assessment", status: "active", lastRun: null },
    { id: "2", name: "Morning Brief", schedule: "7:00 AM Central", description: "Daily priorities, project status, weather, news", status: "active", lastRun: null },
    { id: "3", name: "End of Day Log", schedule: "10:00 PM Central", description: "Write daily memory log, cost summary, open loops", status: "active", lastRun: null },
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Scheduled Jobs</h1>
            <p>Recurring tasks and cron jobs</p>
          </div>
          <div className="page-header-actions">
            <button type="button" className="btn btn-primary" onClick={(e) => { e.preventDefault(); setAdding(v => !v); }}>
              {adding ? "Cancel" : "+ New Job"}
            </button>
          </div>
        </div>
      </div>

      {adding && (
        <div className="card" style={{ marginBottom: 20 }}>
          <form onSubmit={addItem} className="form-inline">
            <div className="form-field-grow-2">
              <label className="field-label">Name</label>
              <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Job name" autoFocus />
            </div>
            <div className="form-field-grow">
              <label className="field-label">Schedule</label>
              <input className="input" value={form.schedule} onChange={e => setForm({ ...form, schedule: e.target.value })} placeholder="e.g. Every 2h" />
            </div>
            <div className="form-field-grow-2">
              <label className="field-label">Description</label>
              <input className="input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What does this job do?" />
            </div>
            <button type="submit" className="btn btn-primary">Add</button>
          </form>
        </div>
      )}

      <div className="schedule-list">
        {displayItems.map(item => (
          <div key={item.id} className="schedule-item">
            <div className="schedule-item-main">
              <div className="schedule-name">{item.name}</div>
              {item.description && <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{item.description}</p>}
            </div>
            <div className="schedule-item-meta">
              <div className="schedule-cron">{item.schedule}</div>
            </div>
            <div className="schedule-item-status">
              <span className={`badge ${item.status === "active" ? "badge-green" : "badge-yellow"}`}>
                {item.status === "active" ? "Active" : "Paused"}
              </span>
            </div>
            <div className="schedule-item-last">
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {item.lastRun ? <>Last: <ClientTimestamp value={item.lastRun} /></> : "Never run"}
              </div>
            </div>
            <button type="button" className="btn btn-sm" onClick={(e) => { e.preventDefault(); toggleItem(item.id, item.status); }}>
              {item.status === "active" ? "Pause" : "Resume"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
