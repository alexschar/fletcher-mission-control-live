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
  const [agents, setAgents] = useState({});
  const [elapsed, setElapsed] = useState("00:00:00");

  useEffect(() => {
    function fetchStatus() {
      fetch("/api/status", { headers: getAuthHeaders() })
        .then(r => r.ok ? r.json() : (r.status === 401 ? (logout(), window.location.reload()) : {}))
        .then(setAgents)
        .catch(() => {});
    }
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const activeAgent = Object.values(agents).find(a => a.status === 'working') 
    || Object.values(agents).find(a => a.status !== 'offline')
    || Object.values(agents)[0];

  useEffect(() => {
    if (!activeAgent?.lastSeen) return;
    function updateTimer() {
      const start = new Date(activeAgent.lastSeen).getTime();
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
  }, [activeAgent?.lastSeen]);

  const agentStatus = activeAgent?.status || "idle";
  const agentName = activeAgent?.name || "System";
  const dotColor = agentStatus === "working" ? "#fd7e14" : agentStatus === "idle" ? "#238636" : "#8b949e";
  const dotClass = agentStatus === "working" ? "status-dot-pulse" : "";
  const label = agentStatus.charAt(0).toUpperCase() + agentStatus.slice(1);

  return (
    <div className="card status-card">
      <div className="status-card-row">
        <div className="status-card-left">
          <span className={"status-dot " + dotClass} style={{ background: dotColor }}></span>
          <div>
            <div className="status-label">{agentName} — {label}</div>
            {agentStatus === "working" && activeAgent?.currentTask && (
              <div className="status-task">{activeAgent.currentTask}</div>
            )}
            {agentStatus === "idle" && activeAgent?.currentTask && (
              <div className="status-task" style={{ color: "var(--text-muted)" }}>{activeAgent.currentTask}</div>
            )}
            {(agentStatus === "offline" || !activeAgent) && (
              <div className="status-task" style={{ color: "var(--text-muted)" }}>No active agent</div>
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
      <div className="page-header page-header-row">
        <div>
          <h1>Task Board</h1>
          <p>Kanban-style task management</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => setAdding(!adding)}>
            {adding ? "Cancel" : "+ New Task"}
          </button>
        </div>
      </div>

      <StatusCard />

      {adding && (
        <div className="card" style={{ marginBottom: 20 }}>
          <form onSubmit={addTask} className="form-inline">
            <div className="form-field-grow-2">
              <label className="field-label">Title</label>
              <input className="input" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Task title" autoFocus />
            </div>
            <div className="form-field-grow-3">
              <label className="field-label">Description</label>
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
                  <div className="kanban-card-actions">
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
