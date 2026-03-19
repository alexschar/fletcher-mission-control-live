const db = require('./database');
const store = require('./store');
const supabase = require('./supabase');

function normalizeTaskTimestamp(task) {
  return task.updated_at || task.created_at || task.created || null;
}

function summarizeAgentStatuses(agents) {
  const values = Object.values(agents || {});
  return {
    total: values.length,
    working: values.filter((agent) => agent.status === 'working').length,
    idle: values.filter((agent) => agent.status === 'idle').length,
    error: values.filter((agent) => agent.status === 'error').length,
    offline: values.filter((agent) => agent.status === 'offline').length,
  };
}

function countPendingReports(reports) {
  return (reports || []).filter((report) => report.status !== 'submitted').length;
}

function extractRecentHealthIssues(healthData) {
  if (!healthData || typeof healthData !== 'object') return [];

  return Object.entries(healthData)
    .flatMap(([agentId, payload]) => {
      const current = payload?.current;
      if (!current || current.status === 'GREEN') return [];
      return [{
        agentId,
        status: current.status,
        message: current.message || current.checksSummary || 'Health issue detected',
        timestamp: current.timestamp || current.created_at,
      }];
    })
    .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
}

async function getDashboardData() {
  const [costs, tasks, agents, contentDrops, reports, healthData] = await Promise.all([
    db.getCosts(),
    Promise.resolve(store.getTasks()),
    store.getAllAgentStatuses(),
    supabase.getContentDrops({ processed: false, limit: 100 }),
    supabase.getReports(),
    supabase.getHealthAudits(50),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const todaysSpend = (costs || []).reduce((sum, entry) => {
    const timestamp = entry.created_at || entry.timestamp;
    if (!timestamp?.startsWith(today)) return sum;
    return sum + Number(entry.calculated_cost || entry.cost_est || 0);
  }, 0);

  const activeTaskCount = (tasks || []).filter((task) => String(task.status || '').toLowerCase() === 'in_progress').length;
  const healthMap = (healthData || []).reduce((acc, audit) => {
    const agentId = audit.agent || audit.agent_id;
    if (!agentId || acc[agentId]) return acc;
    acc[agentId] = { current: audit };
    return acc;
  }, {});

  return {
    todaysSpend,
    activeTaskCount,
    agents,
    agentSummary: summarizeAgentStatuses(agents),
    unprocessedContentDrops: (contentDrops || []).length,
    pendingReportsCount: countPendingReports(reports),
    recentHealthIssues: extractRecentHealthIssues(healthMap).slice(0, 5),
  };
}

async function getAgentActivityData(agentId) {
  const normalizedAgentId = String(agentId || '').toLowerCase();
  const tasks = await Promise.resolve(store.getTasks());
  const [reports, conversations, healthData] = await Promise.all([
    supabase.getReports(),
    db.getRecentConversations(24 * 30),
    supabase.getHealthAudits(200),
  ]);

  const events = [];

  (tasks || []).forEach((task) => {
    const assigned = String(task.assigned_to || '').toLowerCase();
    const createdBy = String(task.created_by || '').toLowerCase();
    const taskTimestamp = normalizeTaskTimestamp(task);
    if (assigned === normalizedAgentId) {
      events.push({
        id: `task-delegated-${task.id}`,
        timestamp: taskTimestamp,
        type: 'delegation',
        title: `Task delegated: ${task.title || 'Untitled task'}`,
        detail: createdBy ? `Assigned by ${createdBy}` : 'Assigned to this agent',
        href: '/tasks',
      });
    }
    if (createdBy === normalizedAgentId || assigned === normalizedAgentId) {
      events.push({
        id: `task-status-${task.id}`,
        timestamp: taskTimestamp,
        type: 'task',
        title: `Task update: ${task.title || 'Untitled task'}`,
        detail: `Current status: ${String(task.status || 'backlog').replaceAll('_', ' ')}`,
        href: '/tasks',
      });
    }
  });

  (reports || []).forEach((report) => {
    if (String(report.created_by || '').toLowerCase() !== normalizedAgentId) return;
    events.push({
      id: `report-${report.id}`,
      timestamp: report.submitted_at || report.created_at,
      type: 'report',
      title: `Report submitted: ${report.title || 'Untitled report'}`,
      detail: report.goal || report.summary || 'Operational report submitted',
      href: `/reports/${report.id}`,
    });
  });

  (conversations || []).forEach((conversation) => {
    if (String(conversation.agent || '').toLowerCase() !== normalizedAgentId) return;
    events.push({
      id: `conversation-${conversation.id}`,
      timestamp: conversation.created_at,
      type: 'conversation',
      title: 'Conversation logged',
      detail: conversation.summary || 'Conversation summary recorded',
      href: '/conversations',
    });
  });

  (healthData || []).forEach((audit) => {
    if (String(audit.agent || audit.agent_id || '').toLowerCase() !== normalizedAgentId) return;
    events.push({
      id: `health-${audit.id || audit.created_at}`,
      timestamp: audit.timestamp || audit.created_at,
      type: 'health',
      title: `Heartbeat result: ${String(audit.status || 'UNKNOWN').toUpperCase()}`,
      detail: audit.message || audit.checksSummary || 'Health audit recorded',
      href: '/health',
    });
  });

  return events
    .filter((event) => event.timestamp)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

module.exports = {
  getDashboardData,
  getAgentActivityData,
};
