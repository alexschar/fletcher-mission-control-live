"use client";
import { useState, useEffect } from "react";

export default function SchedulePage() {
  const [items, setItems] = useState([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", schedule: "", description: "" });

  useEffect(() => {
    fetch("/api/schedule").then(r => r.json()).then(setItems).catch(() => {});
  }, []);

  async function addItem(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    const res = await fetch("/api/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, status: "active", lastRun: null })
    });
    const updated = await res.json();
    setItems(updated);
    setForm({ name: "", schedule: "", description: "" });
    setAdding(false);
  }

  async function toggleItem(id, currentStatus) {
    const res = await fetch("/api/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", id, updates: { status: currentStatus === "active" ? "paused" : "active" } })
    });
    const updated = await res.json();
    setItems(updated);
  }

  // Seed with defaults if empty
  const displayItems = items.length > 0 ? items : [
    { id: "1", name: "Heartbeat Check", schedule: "Every 120m", description: "Check project status, drift detection, energy assessment", status: "active", lastRun: null },
    { id: "2", name: "Morning Brief", schedule: "7:00 AM Central", description: "Daily priorities, project status, weather, news", status: "active", lastRun: null },
    { id: "3", name: "End of Day Log", schedule: "10:00 PM Central", description: "Write daily memory log, cost summary, open loops", status: "active", lastRun: null },
  ];

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1>Scheduled Jobs</h1>
          <p>Recurring tasks and cron jobs</p>
        </div>
        <button className="btn btn-primary" onClick={() => setAdding(!adding)}>
          {adding ? "Cancel" : "+ New Job"}
        </button>
      </div>

      {adding && (
        <div className="card" style={{ marginBottom: 20 }}>
          <form onSubmit={addItem} style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
            <div style={{ flex: 2 }}>
              <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Name</label>
              <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Job name" autoFocus />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Schedule</label>
              <input className="input" value={form.schedule} onChange={e => setForm({ ...form, schedule: e.target.value })} placeholder="e.g. Every 2h" />
            </div>
            <div style={{ flex: 2 }}>
              <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Description</label>
              <input className="input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What does this job do?" />
            </div>
            <button type="submit" className="btn btn-primary">Add</button>
          </form>
        </div>
      )}

      <div>
        {displayItems.map(item => (
          <div key={item.id} className="schedule-item">
            <div style={{ flex: 1 }}>
              <div className="schedule-name">{item.name}</div>
              {item.description && <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{item.description}</p>}
            </div>
            <div style={{ textAlign: "center", minWidth: 120 }}>
              <div className="schedule-cron">{item.schedule}</div>
            </div>
            <div style={{ textAlign: "center", minWidth: 100 }}>
              <span className={`badge ${item.status === "active" ? "badge-green" : "badge-yellow"}`}>
                {item.status === "active" ? "Active" : "Paused"}
              </span>
            </div>
            <div style={{ textAlign: "right", minWidth: 100 }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {item.lastRun ? `Last: ${new Date(item.lastRun).toLocaleString()}` : "Never run"}
              </div>
            </div>
            <button className="btn btn-sm" style={{ marginLeft: 12 }} onClick={() => toggleItem(item.id, item.status)}>
              {item.status === "active" ? "Pause" : "Resume"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
