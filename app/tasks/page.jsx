"use client";
import { useState, useEffect } from "react";
import { getAuthHeaders, isAuthenticated, logout } from "../../lib/api-client";
import { useRouter } from "next/navigation";

const COLUMNS = [
  { id: "backlog", label: "Backlog", color: "var(--text-muted)" },
  { id: "in_progress", label: "In Progress", color: "var(--accent)" },
  { id: "review", label: "Review", color: "var(--yellow)" },
  { id: "done", label: "Done", color: "var(--green)" },
];

function StatusCard() {
  const [status, setStatus] = useState(null);
  const [elapsed, setElapsed] = useState("00:00:00");

  useEffect(() => {
    function fetchStatus() {
      fetch("/api/status", { headers: getAuthHeaders() })
        .then(r => r.ok ? r.json() : (r.status === 401 ? (logout(), window.location.reload()) : {}))
        .then(setStatus)
        .catch(() => {});
    }
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!status?.startedAt) return;
    function updateTimer() {
      const start = new Date(status.startedAt).getTime();
      const now = Date.now();
      const diff = Math.max(0, Math.floor((now - start) / 1000));
      const h = String(Math.floor(diff / 3600)).padStart(2, "0");
      const m = String(Math.floor((diff % 3600) / 60)).padStart(2, "0");
      const s = String(diff % 60).padStart(2, "0");
      setElapsed(h + ":" + m + ":" + s);
    }
    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [status?.startedAt]);

  const agentStatus = status?.status || "idle";
  const dotColor = agentStatus === "working" ? "var(--green)" : agentStatus === "planning" ? "var(--yellow)" : "var(--text-muted)";
  const dotClass = agentStatus === "working" ? "status-dot-pulse" : "";
  const label = agentStatus.charAt(0).toUpperCase() + agentStatus.slice(1);

  return (
    <div className="card status-card">
      <div className="status-card-row">
        <div className="status-card-left">
          <span className={"status-dot " + dotClass} style={{ background: dotColor }}></span>
          <div>
            <div className="status-label">{label}</div>
            {agentStatus === "working" && status?.currentTask && (
              <div className="status-task">{status.currentTask}</div>
            )}
            {agentStatus === "planning" && status?.planDescription && (
              <div className="status-plan">{status.planDescription}</div>
            )}
            {agentStatus === "idle" && (
              <div className="status-task" style={{ color: "var(--text-muted)" }}>No active task</div>
            )}
          </div>
        </div>
        <div className="status-timer">{elapsed}</div>
      </div>
    </div>
  );
}

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [adding, setAdding] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    fetch("/api/tasks", { headers: getAuthHeaders() })
      .then(r => r.ok ? r.json() : (r.status === 401 ? (logout(), router.push('/login')) : []))
      .then(setTasks)
      .catch(() => {});
  }, [router]);

  async function addTask(e) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ title: newTitle, description: newDesc, status: "backlog" })
    });
    if (res.status === 401) {
      logout();
      router.push('/login');
      return;
    }
    const updated = await res.json();
    setTasks(updated);
    setNewTitle("");
    setNewDesc("");
    setAdding(false);
  }

  async function moveTask(id, newStatus) {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ action: "update", id, updates: { status: newStatus } })
    });
    if (res.status === 401) {
      logout();
      router.push('/login');
      return;
    }
    const updated = await res.json();
    setTasks(updated);
  }

  async function removeTask(id) {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ action: "delete", id })
    });
    if (res.status === 401) {
      logout();
      router.push('/login');
      return;
    }
    const updated = await res.json();
    setTasks(updated);
  }

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1>Task Board</h1>
          <p>Kanban-style task management</p>
        </div>
        <button className="btn btn-primary" onClick={() => setAdding(!adding)}>
          {adding ? "Cancel" : "+ New Task"}
        </button>
      </div>

      <StatusCard />

      {adding && (
        <div className="card" style={{ marginBottom: 20 }}>
          <form onSubmit={addTask} style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
            <div style={{ flex: 2 }}>
              <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Title</label>
              <input className="input" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Task title" autoFocus />
            </div>
            <div style={{ flex: 3 }}>
              <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Description</label>
              <input className="input" value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Optional description" />
            </div>
            <button type="submit" className="btn btn-primary">Add</button>
          </form>
        </div>
      )}

      <div className="kanban">
        {COLUMNS.map(col => {
          const colTasks = tasks.filter(t => t.status === col.id);
          const nextCol = COLUMNS[COLUMNS.indexOf(col) + 1];
          const prevCol = COLUMNS[COLUMNS.indexOf(col) - 1];
          return (
            <div key={col.id} className="kanban-col">
              <div className="kanban-col-header">
                <span style={{ color: col.color }}>●</span>
                {col.label}
                <span className="count">{colTasks.length}</span>
              </div>
              {colTasks.length === 0 && (
                <div className="empty" style={{ padding: 20, fontSize: 12 }}>No tasks</div>
              )}
              {colTasks.map(task => (
                <div key={task.id} className="kanban-card">
                  <h4>{task.title}</h4>
                  {task.description && <p>{task.description}</p>}
                  <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                    {prevCol && (
                      <button className="btn btn-sm" onClick={() => moveTask(task.id, prevCol.id)}>← {prevCol.label}</button>
                    )}
                    {nextCol && (
                      <button className="btn btn-sm" onClick={() => moveTask(task.id, nextCol.id)}>{nextCol.label} →</button>
                    )}
                    {col.id === "done" && (
                      <button className="btn btn-sm" style={{ color: "var(--red)" }} onClick={() => removeTask(task.id)}>Remove</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
