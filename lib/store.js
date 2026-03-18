const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data');

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJSON(file, fallback = []) {
  ensureDir();
  const p = path.join(DATA_DIR, file);
  if (!fs.existsSync(p)) return fallback;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fallback; }
}

function writeJSON(file, data) {
  ensureDir();
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2));
}

// --- Costs ---
function getCosts() { return readJSON('costs.json'); }
function addCost(entry) {
  const costs = getCosts();
  costs.push({ ...entry, id: Date.now().toString(), timestamp: new Date().toISOString() });
  writeJSON('costs.json', costs);
  return costs;
}
function getCostSummary() {
  const costs = getCosts();
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const dailyCosts = costs.filter(c => c.timestamp?.startsWith(today));
  const monthlyCosts = costs.filter(c => c.timestamp?.startsWith(month));
  const dailyTotal = dailyCosts.reduce((s, c) => s + (c.cost_est || 0), 0);
  const monthlyTotal = monthlyCosts.reduce((s, c) => s + (c.cost_est || 0), 0);
  // group by date
  const byDate = {};
  costs.forEach(c => {
    const d = c.timestamp?.slice(0, 10) || 'unknown';
    if (!byDate[d]) byDate[d] = { date: d, total: 0, count: 0 };
    byDate[d].total += (c.cost_est || 0);
    byDate[d].count++;
  });
  return { dailyTotal, monthlyTotal, daily: Object.values(byDate).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30), entries: costs.slice(-20).reverse() };
}

// --- Tasks ---
function getTasks() { return readJSON('tasks.json'); }
function addTask(task) {
  const tasks = getTasks();
  tasks.push({ ...task, id: Date.now().toString(), created: new Date().toISOString(), status: task.status || 'backlog' });
  writeJSON('tasks.json', tasks);
  return tasks;
}
function updateTask(id, updates) {
  const tasks = getTasks();
  const idx = tasks.findIndex(t => t.id === id);
  if (idx >= 0) { tasks[idx] = { ...tasks[idx], ...updates }; writeJSON('tasks.json', tasks); }
  return tasks;
}
function deleteTask(id) {
  let tasks = getTasks();
  tasks = tasks.filter(t => t.id !== id);
  writeJSON('tasks.json', tasks);
  return tasks;
}

// --- Schedule ---
function getSchedule() { return readJSON('schedule.json'); }
function addScheduleItem(item) {
  const schedule = getSchedule();
  schedule.push({ ...item, id: Date.now().toString(), created: new Date().toISOString() });
  writeJSON('schedule.json', schedule);
  return schedule;
}
function updateScheduleItem(id, updates) {
  const schedule = getSchedule();
  const idx = schedule.findIndex(s => s.id === id);
  if (idx >= 0) { schedule[idx] = { ...schedule[idx], ...updates }; writeJSON('schedule.json', schedule); }
  return schedule;
}

// --- Memory ---
function getMemoryFiles() {
  // In production (Vercel), filesystem is ephemeral - return empty
  // In development, read from local workspace
  const isVercel = process.env.VERCEL === '1';
  if (isVercel) {
    return []; // Memory files not available in serverless environment
  }
  
  const workspaceDir = path.join(process.env.HOME || process.env.USERPROFILE || '/tmp', '.openclaw', 'workspace');
  const memoryDir = path.join(workspaceDir, 'memory');
  const files = [];
  if (fs.existsSync(workspaceDir)) {
    fs.readdirSync(workspaceDir).filter(f => f.endsWith('.md')).forEach(f => {
      try {
        const content = fs.readFileSync(path.join(workspaceDir, f), 'utf8');
        files.push({ name: f, path: 'workspace', content, size: content.length, modified: fs.statSync(path.join(workspaceDir, f)).mtime });
      } catch {}
    });
  }
  if (fs.existsSync(memoryDir)) {
    fs.readdirSync(memoryDir).filter(f => f.endsWith('.md')).forEach(f => {
      try {
        const content = fs.readFileSync(path.join(memoryDir, f), 'utf8');
        files.push({ name: f, path: 'memory', content, size: content.length, modified: fs.statSync(path.join(memoryDir, f)).mtime });
      } catch {}
    });
  }
  return files.sort((a, b) => new Date(b.modified) - new Date(a.modified));
}

// --- Agent Status ---
const DEFAULT_STATUS = { status: 'idle', model: 'claude-sonnet-4', currentTask: null, planDescription: null, startedAt: new Date().toISOString() };

function getStatus() {
  const data = readJSON('status.json', null);
  if (!data) { writeJSON('status.json', DEFAULT_STATUS); return DEFAULT_STATUS; }
  return data;
}

function updateStatus(updates) {
  const current = getStatus();
  const newStatus = { ...current, ...updates, startedAt: new Date().toISOString() };
  writeJSON('status.json', newStatus);
  return newStatus;
}

// --- Multi-Agent Status ---
const DEFAULT_AGENTS = {
  fletcher: { 
    name: 'Fletcher', 
    id: 'main',
    status: 'offline', 
    currentTask: null, 
    model: null,
    lastSeen: null,
    role: 'Policy authority, exception handler, weekly calibrator'
  },
  sawyer: { 
    name: 'Sawyer', 
    id: 'sawyer',
    status: 'offline', 
    currentTask: null, 
    model: null,
    lastSeen: null,
    role: 'Daily operator, context observer, task dispatcher'
  },
  celeste: { 
    name: 'Celeste', 
    id: 'celeste',
    status: 'offline', 
    currentTask: null, 
    model: null,
    lastSeen: null,
    role: 'Builder, coder, implementation specialist'
  }
};

const STALE_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes (per Fletcher's spec)
const OFFLINE_THRESHOLD_MS = 60 * 60 * 1000; // 60 minutes = offline

function isStale(timestamp) {
  if (!timestamp) return true;
  const lastSeen = new Date(timestamp).getTime();
  const now = Date.now();
  return (now - lastSeen) > STALE_THRESHOLD_MS;
}

function isOffline(timestamp) {
  if (!timestamp) return true;
  const lastSeen = new Date(timestamp).getTime();
  const now = Date.now();
  return (now - lastSeen) > OFFLINE_THRESHOLD_MS;
}

function getAllAgentStatuses() {
  const data = readJSON('agent_statuses.json', DEFAULT_AGENTS);

  // Auto-mark stale/offline agents per Fletcher's protocol
  Object.keys(data).forEach(key => {
    const agent = data[key];
    if (isOffline(agent.lastSeen)) {
      data[key] = {
        ...agent,
        status: 'offline',
        currentTask: null,
        model: null
      };
    } else if (isStale(agent.lastSeen) && agent.status !== 'offline') {
      // Stale but not yet offline - keep status but mark as stale
      data[key] = {
        ...agent,
        status: agent.status === 'working' ? 'idle' : agent.status
      };
    }
  });

  return data;
}

function getAgentStatus(agentName) {
  const statuses = getAllAgentStatuses();
  return statuses[agentName.toLowerCase()] || null;
}

function updateAgentStatus(agentName, updates) {
  const statuses = getAllAgentStatuses();
  const key = agentName.toLowerCase();
  
  if (!statuses[key]) {
    statuses[key] = { 
      ...DEFAULT_AGENTS[key] || { name: agentName, id: agentName.toLowerCase(), role: 'Unknown' },
      status: 'idle',
      currentTask: null,
      model: 'claude-sonnet-4'
    };
  }
  
  statuses[key] = { 
    ...statuses[key], 
    ...updates, 
    lastSeen: new Date().toISOString() 
  };
  
  writeJSON('agent_statuses.json', statuses);
  return statuses[key];
}

module.exports = { getCosts, addCost, getCostSummary, getTasks, addTask, updateTask, deleteTask, getSchedule, addScheduleItem, updateScheduleItem, getMemoryFiles, getStatus, updateStatus, getAllAgentStatuses, getAgentStatus, updateAgentStatus };
