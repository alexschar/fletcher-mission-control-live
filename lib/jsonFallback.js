// JSON Fallback Module
// Provides the same interface as supabase.js but stores data in JSON files
// Used when Supabase tables don't exist yet

const fs = require('fs');
const path = require('path');

// Use process.cwd() for correct path resolution in both dev and build
const DATA_DIR = path.join(process.cwd(), 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// File paths
const FILES = {
  tasks: path.join(DATA_DIR, 'tasks.json'),
  conversations: path.join(DATA_DIR, 'conversations.json'),
  costs: path.join(DATA_DIR, 'costs.json'),
  agent_status: path.join(DATA_DIR, 'agent_statuses.json'),
  override_log: path.join(DATA_DIR, 'override_log.json')
};

// Helper: Read JSON file (create empty array/object if doesn't exist)
function readJSON(filePath, defaultValue = []) {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
      return defaultValue;
    }
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return defaultValue;
  }
}

// Helper: Write JSON file
function writeJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error.message);
    return false;
  }
}

// Helper: Generate ID
function generateId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

// ==================== TASKS ====================

async function createTask(task) {
  const tasks = readJSON(FILES.tasks, []);
  const newTask = {
    id: generateId(),
    title: task.title,
    description: task.description,
    status: task.status || 'backlog',
    assigned_to: task.assigned_to,
    created_by: task.created_by,
    priority: task.priority || 'medium',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  tasks.unshift(newTask);
  writeJSON(FILES.tasks, tasks);
  return newTask;
}

async function updateTask(id, updates) {
  const tasks = readJSON(FILES.tasks, []);
  const index = tasks.findIndex(t => t.id === id);
  if (index === -1) throw new Error('Task not found');
  
  tasks[index] = { ...tasks[index], ...updates, updated_at: new Date().toISOString() };
  writeJSON(FILES.tasks, tasks);
  return tasks[index];
}

async function deleteTask(id) {
  const tasks = readJSON(FILES.tasks, []);
  const filtered = tasks.filter(t => t.id !== id);
  writeJSON(FILES.tasks, filtered);
}

async function getTasks(filters = {}) {
  let tasks = readJSON(FILES.tasks, []);
  
  if (filters.status) {
    tasks = tasks.filter(t => t.status === filters.status);
  }
  if (filters.assigned_to) {
    tasks = tasks.filter(t => t.assigned_to === filters.assigned_to);
  }
  if (filters.created_by) {
    tasks = tasks.filter(t => t.created_by === filters.created_by);
  }
  if (filters.priority) {
    tasks = tasks.filter(t => t.priority === filters.priority);
  }
  
  // Sort by created_at descending
  tasks.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  return tasks;
}

// ==================== CONVERSATIONS ====================

async function addConversationSummary(summary) {
  const conversations = readJSON(FILES.conversations, []);
  const newConversation = {
    id: generateId(),
    agent: summary.agent,
    summary: summary.summary,
    topics: summary.topics || [],
    source: summary.source,
    created_at: new Date().toISOString()
  };
  conversations.unshift(newConversation);
  writeJSON(FILES.conversations, conversations);
  return newConversation;
}

async function getRecentConversations(hours = 24) {
  const conversations = readJSON(FILES.conversations, []);
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  return conversations
    .filter(c => new Date(c.created_at) >= cutoff)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

// ==================== COSTS ====================

async function addCostEntry(entry) {
  const costs = readJSON(FILES.costs, []);
  const newEntry = {
    id: generateId(),
    agent: entry.agent,
    model: entry.model,
    provider: entry.provider,
    tokens_in: entry.tokens_in || entry.input_tokens || 0,
    tokens_out: entry.tokens_out || entry.output_tokens || 0,
    cost_est: entry.cost_est || entry.calculated_cost || 0,
    notes: entry.notes,
    timestamp: entry.timestamp || new Date().toISOString()
  };
  costs.unshift(newEntry);
  writeJSON(FILES.costs, costs);
  return newEntry;
}

async function getCosts(period = null) {
  let costs = readJSON(FILES.costs, []);
  
  if (period) {
    const cutoff = getCutoffDate(period);
    if (cutoff) {
      costs = costs.filter(c => new Date(c.created_at) >= cutoff);
    }
  }
  
  return costs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function getCutoffDate(period) {
  const now = new Date();
  switch (period) {
    case 'day':
      return new Date(now - 24 * 60 * 60 * 1000);
    case 'week':
      return new Date(now - 7 * 24 * 60 * 60 * 1000);
    case 'month':
      return new Date(now - 30 * 24 * 60 * 60 * 1000);
    default:
      return null;
  }
}

// ==================== AGENT STATUS ====================

async function updateAgentStatus(agent, status) {
  const statuses = readJSON(FILES.agent_status, {});
  
  statuses[agent] = {
    agent,
    ...status,
    updated_at: new Date().toISOString()
  };
  
  writeJSON(FILES.agent_status, statuses);
  return statuses[agent];
}

async function getAgentStatus() {
  const statuses = readJSON(FILES.agent_status, {});
  
  // Add agent property from the key if not present
  const values = Object.entries(statuses).map(([key, value]) => ({
    ...value,
    agent: value.agent || key
  }));
  
  return values.sort((a, b) => a.agent.localeCompare(b.agent));
}

// ==================== OVERRIDE LOG ====================

async function addOverrideLog(entry) {
  const logs = readJSON(FILES.override_log, []);
  const newLog = {
    id: generateId(),
    tier: entry.tier,
    task_description: entry.task_description,
    risk_level: entry.risk_level,
    outcome: entry.outcome,
    details: entry.details,
    created_at: new Date().toISOString()
  };
  logs.unshift(newLog);
  writeJSON(FILES.override_log, logs);
  return newLog;
}

async function getOverrides(limit = 50) {
  const logs = readJSON(FILES.override_log, []);
  return logs.slice(0, limit);
}

// ==================== MODULE EXPORTS ====================

module.exports = {
  // Tasks
  createTask,
  updateTask,
  deleteTask,
  getTasks,
  // Conversations
  addConversationSummary,
  getRecentConversations,
  // Costs
  addCostEntry,
  getCosts,
  // Agent Status
  updateAgentStatus,
  getAgentStatus,
  // Override Log
  addOverrideLog,
  getOverrides,
  // For health check
  isJsonFallback: true
};
