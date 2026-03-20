"use client";
import { useMemo, useState, useEffect } from "react";
import { getAuthHeaders, isAuthenticated, logout } from "../../lib/api-client";
import { useRouter } from "next/navigation";
import { useToast } from "../components/ToastProvider";
import { useConfirm } from "../components/ConfirmProvider";
import { TasksBoardSkeleton } from "../components/Skeleton";

const COLUMNS = [
  { id: "backlog", label: "Backlog", color: "var(--text-muted)" },
  { id: "in_progress", label: "In Progress", color: "var(--accent)" },
  { id: "review", label: "Review", color: "var(--yellow)" },
  { id: "done", label: "Done", color: "var(--green)" },
];

const ASSIGNEE_FILTERS = [
  { value: "all", label: "All" },
  { value: "Fletcher", label: "Fletcher" },
  { value: "Sawyer", label: "Sawyer" },
  { value: "Celeste", label: "Celeste" },
  { value: "unassigned", label: "Unassigned" },
];

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "backlog", label: "Backlog" },
  { value: "in_progress", label: "In Progress" },
  { value: "review", label: "Review" },
  { value: "done", label: "Done" },
];

function normalizeTaskStatus(status) {
  const value = String(status || "backlog").trim().toLowerCase();
  if (value === "in-progress" || value === "in progress") return "in_progress";
  if (value === "todo") return "backlog";
  if (value === "completed") return "done";
  return value;
}

function normalizeTask(task) {
  if (!task || typeof task !== "object") return null;
  return {
    ...task,
    id: task.id || task._id || task.taskId,
    title: typeof task.title === "string" ? task.title : String(task.title || "Untitled Task"),
    description: typeof task.description === "string" ? task.description : (task.description || ""),
    status: normalizeTaskStatus(task.status),
    assigned_to: typeof task.assigned_to === "string" ? task.assigned_to : "",
  };
}

function normalizeTasksResponse(data, previous = []) {
  let tasks = data;

  if (typeof tasks === "string") {
    try {
      tasks = JSON.parse(tasks);
    } catch {
      return previous;
    }
  }

  if (tasks && typeof tasks === "object" && !Array.isArray(tasks)) {
    if (Array.isArray(tasks.tasks)) tasks = tasks.tasks;
    else if (Array.isArray(tasks.data)) tasks = tasks.data;
    else if (tasks.ok) return previous;
  }

  if (!Array.isArray(tasks)) return previous;

  return tasks
    .map(normalizeTask)
    .filter(Boolean)
    .filter(task => task.id && COLUMNS.some(col => col.id === task.status));
}

async function fetchTasks() {
  const response = await fetch("/api/tasks", {
    headers: getAuthHeaders(),
    cache: "no-store",
  });

  if (response.status === 401) {
    logout();
    throw new Error("unauthorized");
  }

  const text = await response.text();
  if (!text) return [];

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function StatusCard() {
  const [agents, setAgents] = useState({});
  const [elapsed, setElapsed] = useState("00:00:00");

  useEffect(() => {
    function fetchStatus() {
      fetch("/api/agents", { headers: getAuthHeaders() })
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
            {agentStatus === "working" && activeAgent?.currentTask && <div className="status-task">{activeAgent.currentTask}</div>}
            {agentStatus === "idle" && activeAgent?.currentTask && <div className="status-task" style={{ color: "var(--text-muted)" }}>{activeAgent.currentTask}</div>}
            {(agentStatus === "offline" || !activeAgent) && <div className="status-task" style={{ color: "var(--text-muted)" }}>No active agent</div>}
          </div>
        </div>
        <div className="status-timer">{elapsed}</div>
      </div>
    </div>
  );
}

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [titleError, setTitleError] = useState("");
  const [adding, setAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const router = useRouter();
  const toast = useToast();
  const { confirm } = useConfirm();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    setLoading(true);
    fetchTasks()
      .then(data => setTasks(normalizeTasksResponse(data)))
      .catch(error => {
        if (error?.message === "unauthorized") router.push('/login');
      })
      .finally(() => setLoading(false));
  }, [router]);

  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return tasks.filter(task => {
      const assignee = String(task.assigned_to || "").trim();
      if (assigneeFilter === "unassigned" && assignee) return false;
      if (assigneeFilter !== "all" && assigneeFilter !== "unassigned" && assignee !== assigneeFilter) return false;
      if (statusFilter !== "all" && task.status !== statusFilter) return false;
      if (!query) return true;
      return [task.title, task.description]
        .filter(Boolean)
        .some(value => value.toLowerCase().includes(query));
    });
  }, [tasks, assigneeFilter, searchQuery, statusFilter]);

  async function addTask(e) {
    e.preventDefault();
    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle) {
      setTitleError("Title is required");
      return;
    }

    setTitleError("");
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ title: trimmedTitle, description: newDesc, status: "backlog" })
    });
    if (res.status === 401) {
      logout();
      router.push('/login');
      return;
    }
    const updated = await res.json();
    if (!res.ok) {
      toast.error(`Failed to create task: ${updated.error || 'Unknown error'}`);
      return;
    }
    setTasks(current => normalizeTasksResponse(updated, current));
    setNewTitle("");
    setNewDesc("");
    setTitleError("");
    setAdding(false);
    toast.success("Task created");
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
    if (!res.ok) {
      toast.error(`Failed to move task: ${updated.error || 'Unknown error'}`);
      return;
    }
    setTasks(current => normalizeTasksResponse(updated, current));
    const statusLabel = String(newStatus || '').replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());
    toast.success(`Task moved to ${statusLabel}`);
  }

  async function removeTask(task) {
    const approved = await confirm({
      title: `Remove task: ${task.title}?`,
      message: 'This will permanently remove the task from the board.',
      confirmLabel: 'Remove task',
      cancelLabel: 'Cancel',
      tone: 'danger',
    });

    if (!approved) return;

    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ action: "delete", id: task.id })
    });
    if (res.status === 401) {
      logout();
      router.push('/login');
      return;
    }
    const updated = await res.json();
    if (!res.ok) {
      toast.error(`Failed to remove task: ${updated.error || 'Unknown error'}`);
      return;
    }
    setTasks(current => normalizeTasksResponse(updated, current.filter(currentTask => currentTask.id !== task.id)));
    toast.success(`Removed task: ${task.title}`);
  }

  return (
    <div>
      <div className="page-header page-header-row">
        <div>
          <h1>Task Board</h1>
          <p>Kanban-style task management with quick search and filtering.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => {
            setAdding(!adding);
            setTitleError("");
          }}>
            {adding ? "Cancel" : "+ New Task"}
          </button>
        </div>
      </div>

      <StatusCard />

      <div className="card content-filters-card" style={{ marginBottom: 16 }}>
        <div className="filters-row">
          <div className="filter-group" style={{ minWidth: 260 }}>
            <label>Search</label>
            <input className="input" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search title or description" />
          </div>
          <div className="filter-group">
            <label>Assignee</label>
            <select className="select" value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}>
              {ASSIGNEE_FILTERS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label>Status</label>
            <select className="select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              {STATUS_FILTERS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {adding && (
        <div className="card" style={{ marginBottom: 20 }}>
          <form onSubmit={addTask} className="form-inline">
            <div className="form-field-grow-2">
              <label className="field-label">Title</label>
              <input
                className="input"
                style={titleError ? { borderColor: "var(--red)" } : undefined}
                value={newTitle}
                onChange={e => {
                  setNewTitle(e.target.value);
                  if (titleError && e.target.value.trim()) setTitleError("");
                }}
                placeholder="Task title"
                autoFocus
                aria-invalid={!!titleError}
                aria-describedby={titleError ? "new-task-title-error" : undefined}
              />
              {titleError && <div id="new-task-title-error" style={{ color: "var(--red)", fontSize: 12, marginTop: 6 }}>{titleError}</div>}
            </div>
            <div className="form-field-grow-3">
              <label className="field-label">Description</label>
              <input className="input" value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Optional description" />
            </div>
            <button type="submit" className="btn btn-primary">Add</button>
          </form>
        </div>
      )}

      <div className="results-count">
        Showing {filteredTasks.length} of {tasks.length} task{tasks.length === 1 ? '' : 's'}
      </div>

      <div className="kanban">
        {COLUMNS.map(col => {
          const colTasks = filteredTasks.filter(t => t.status === col.id);
          const nextCol = COLUMNS[COLUMNS.indexOf(col) + 1];
          const prevCol = COLUMNS[COLUMNS.indexOf(col) - 1];
          return (
            <div key={col.id} className="kanban-col">
              <div className="kanban-col-header">
                <span style={{ color: col.color }}>●</span>
                {col.label}
                <span className="count">{colTasks.length}</span>
              </div>
              {colTasks.length === 0 && <div className="empty" style={{ padding: 20, fontSize: 12 }}>No tasks match these filters</div>}
              {colTasks.map(task => (
                <div key={task.id} className="kanban-card">
                  <h4>{task.title}</h4>
                  {task.description && <p>{task.description}</p>}
                  {task.assigned_to && <div className="tag">{task.assigned_to}</div>}
                  <div className="kanban-card-actions">
                    {prevCol && <button className="btn btn-sm" onClick={() => moveTask(task.id, prevCol.id)}>← {prevCol.label}</button>}
                    {nextCol && <button className="btn btn-sm" onClick={() => moveTask(task.id, nextCol.id)}>{nextCol.label} →</button>}
                    {col.id === "done" && <button className="btn btn-sm" style={{ color: "var(--red)" }} onClick={() => removeTask(task)}>Remove</button>}
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
