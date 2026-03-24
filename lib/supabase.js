// Supabase API Wrapper
// Uses @supabase/supabase-js for database operations

const { createClient } = require('@supabase/supabase-js');

function normalizeConversationPayload(summary = {}) {
  return {
    agent: summary.agent || summary.created_by || null,
    summary: summary.summary || '',
    topics: Array.isArray(summary.topics) ? summary.topics : [],
    source: summary.source || null,
    created_at: summary.created_at || null,
  };
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing Supabase credentials in environment variables');
}

// Create client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

// ==================== TASKS ====================
async function createTask(task) {
  const { data, error } = await supabase.from('tasks').insert(task).select().single();
  if (error) throw error;
  return data;
}

async function updateTask(id, updates) {
  const { data, error } = await supabase
    .from('tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function deleteTask(id) {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw error;
}

async function getTasks(filters = {}) {
  let query = supabase.from('tasks').select('*');
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.assigned_to) query = query.eq('assigned_to', filters.assigned_to);
  if (filters.created_by) query = query.eq('created_by', filters.created_by);
  if (filters.priority) query = query.eq('priority', filters.priority);
  query = query.order('created_at', { ascending: false });
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// ==================== CONVERSATIONS ====================
async function addConversationSummary(summary) {
  const payload = normalizeConversationPayload(summary);
  const insertPayload = {
    ...payload,
    created_at: payload.created_at || new Date().toISOString()
  };

  const { data, error } = await supabase.from('conversations').insert(insertPayload).select().single();
  if (error) throw error;
  return data;
}

async function getRecentConversations(hours = 24) {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

// ==================== COSTS ====================
async function addCostEntry(entry) {
  const row = {
    agent: entry.agent,
    model: entry.model,
    provider: entry.provider,
    tokens_in: entry.tokens_in || 0,
    tokens_out: entry.tokens_out || 0,
    calculated_cost: entry.cost_est || entry.calculated_cost || 0,
    notes: entry.notes || null,
    created_at: entry.timestamp || entry.created_at || new Date().toISOString(),
  };
  const { data, error } = await supabase.from('costs').insert(row).select().single();
  if (error) throw error;
  return data;
}

async function getCosts(period = null) {
  let query = supabase.from('costs').select('*').order('created_at', { ascending: false });
  if (period) {
    const cutoff = getCutoffDate(period);
    if (cutoff) query = query.gte('created_at', cutoff);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

function getCutoffDate(period) {
  const now = new Date();
  switch (period) {
    case 'day': return new Date(now - 24 * 60 * 60 * 1000).toISOString();
    case 'week': return new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
    case 'month': return new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
    default: return null;
  }
}

// ==================== AGENT STATUS ====================
async function updateAgentStatus(agent, status) {
  const { data, error } = await supabase
    .from('agent_status')
    .upsert({ agent, ...status, updated_at: new Date().toISOString() }, { onConflict: 'agent' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function getAgentStatus() {
  const { data, error } = await supabase.from('agent_status').select('*').order('agent');
  if (error) throw error;
  return data;
}

// ==================== HEALTH AUDITS ====================
function deriveHealthScore(status, explicitScore = null) {
  if (typeof explicitScore === 'number' && explicitScore >= 0 && explicitScore <= 100) {
    return explicitScore;
  }

  switch (String(status || '').toUpperCase()) {
    case 'GREEN': return 100;
    case 'YELLOW': return 50;
    case 'RED': return 0;
    default: return 0;
  }
}

function deriveHealthIssues(checks = {}, explicitIssues = null) {
  if (Array.isArray(explicitIssues)) return explicitIssues;
  if (!checks || typeof checks !== 'object') return [];

  return Object.entries(checks).flatMap(([key, value]) => {
    if (value === null || value === undefined) return [`${key}: unknown`];
    if (typeof value === 'string') {
      const normalized = value.toLowerCase();
      if (['ok', 'healthy', 'connected', 'online', 'pass', 'passing'].includes(normalized)) return [];
      return [`${key}: ${value}`];
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return value ? [] : [`${key}: ${String(value)}`];
    }
    return [];
  });
}

function buildHealthMessage(status, score, issues = []) {
  const normalizedStatus = String(status || '').toUpperCase();
  if (issues.length) return issues.join(' · ');
  switch (normalizedStatus) {
    case 'GREEN': return `Healthy (${score}/100)`;
    case 'YELLOW': return `Attention needed (${score}/100)`;
    case 'RED': return `Critical issues detected (${score}/100)`;
    default: return `Health status ${normalizedStatus || 'UNKNOWN'} (${score}/100)`;
  }
}

async function getHealthAudits(limit = 200) {
  const { data, error } = await supabase
    .from('health_audits')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).map(audit => ({
    ...audit,
    agent: audit.agent_id,
    timestamp: audit.created_at,
    message: buildHealthMessage(audit.status, audit.score, audit.issues || []),
    checksSummary: Array.isArray(audit.issues) && audit.issues.length
      ? audit.issues.join(' · ')
      : buildHealthMessage(audit.status, audit.score, [])
  }));
}

async function addHealthAudit(audit) {
  const status = String(audit.status || '').toUpperCase();
  const score = deriveHealthScore(status, audit.score);
  const issues = deriveHealthIssues(audit.checks || {}, audit.issues);

  const { data, error } = await supabase
    .from('health_audits')
    .insert({
      agent_id: audit.agent_id || audit.agent,
      status,
      score,
      checks: audit.checks || {},
      issues
    })
    .select()
    .single();
  if (error) throw error;
  return {
    ...data,
    agent: data.agent_id,
    timestamp: data.created_at,
    message: buildHealthMessage(data.status, data.score, data.issues || []),
    checksSummary: Array.isArray(data.issues) && data.issues.length
      ? data.issues.join(' · ')
      : buildHealthMessage(data.status, data.score, [])
  };
}

// ==================== OVERRIDE LOG ====================
async function addOverrideLog(entry) {
  const { data, error } = await supabase.from('override_log').insert(entry).select().single();
  if (error) throw error;
  return data;
}

async function getOverrides(limit = 50) {
  const { data, error } = await supabase
    .from('override_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

// ==================== MEMORY FILES ====================
function isMissingTableError(error) {
  return error?.code === '42P01'
    || error?.code === 'PGRST205'
    || error?.message?.includes('does not exist')
    || error?.message?.includes('schema cache')
    || error?.message?.includes("Could not find the table 'public.memory_files'");
}

function memorySource(file) {
  return `memory://${encodeURIComponent(file.agent || 'system')}/${encodeURIComponent(file.path || 'memory')}/${encodeURIComponent(file.name)}`;
}

function parseMemoryMetadata(summary) {
  try {
    return JSON.parse(summary || '{}');
  } catch {
    return {};
  }
}

function mapContentDropToMemoryFile(row) {
  const meta = parseMemoryMetadata(row.summary);

  return {
    name: row.title,
    path: meta.path || 'memory',
    content: row.raw_content || '',
    agent: meta.agent || 'system',
    size: row.raw_content?.length || 0,
    updated_at: row.created_at
  };
}

async function upsertMemoryFileViaContentDrops(file) {
  const sourceUrl = memorySource(file);
  const payload = {
    platform: 'web',
    content_type: 'article',
    title: file.name,
    raw_content: file.content || '',
    summary: JSON.stringify({
      agent: file.agent || 'system',
      path: file.path || 'memory'
    }),
    source_url: sourceUrl,
    processed: true
  };

  await supabase.from('content_drops').delete().eq('source_url', sourceUrl);
  const { data, error } = await supabase.from('content_drops').insert(payload).select().single();
  if (error) throw error;
  return mapContentDropToMemoryFile(data);
}

async function getMemoryFilesViaContentDrops(agent = null) {
  const { data, error } = await supabase
    .from('content_drops')
    .select('*')
    .like('source_url', 'memory://%')
    .order('created_at', { ascending: false });

  if (error) throw error;

  const files = (data || []).map(mapContentDropToMemoryFile);
  return agent ? files.filter(file => file.agent === agent) : files;
}

async function getMemoryFileViaContentDrops(name) {
  const { data, error } = await supabase
    .from('content_drops')
    .select('*')
    .eq('title', name)
    .like('source_url', 'memory://%')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? mapContentDropToMemoryFile(data) : null;
}

async function deleteMemoryFileViaContentDrops(name) {
  const { error } = await supabase
    .from('content_drops')
    .delete()
    .eq('title', name)
    .like('source_url', 'memory://%');
  if (error) throw error;
}

async function upsertMemoryFile(file) {
  const payload = {
    name: file.name,
    path: file.path || 'memory',
    content: file.content,
    agent: file.agent || 'system',
    size: file.content?.length || 0,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('memory_files')
    .upsert(payload, { onConflict: 'name' })
    .select()
    .single();

  if (error) {
    if (isMissingTableError(error)) {
      return upsertMemoryFileViaContentDrops(file);
    }
    throw error;
  }
  return data;
}

async function getMemoryFiles(agent = null) {
  let query = supabase.from('memory_files').select('*').order('updated_at', { ascending: false });
  if (agent) query = query.eq('agent', agent);
  const { data, error } = await query;
  if (error) {
    if (isMissingTableError(error)) {
      return getMemoryFilesViaContentDrops(agent);
    }
    throw error;
  }
  return data || [];
}

async function getMemoryFile(name) {
  const { data, error } = await supabase.from('memory_files').select('*').eq('name', name).maybeSingle();
  if (error) {
    if (isMissingTableError(error)) {
      return getMemoryFileViaContentDrops(name);
    }
    throw error;
  }
  return data;
}

async function deleteMemoryFile(name) {
  const { error } = await supabase.from('memory_files').delete().eq('name', name);
  if (error) {
    if (isMissingTableError(error)) {
      return deleteMemoryFileViaContentDrops(name);
    }
    throw error;
  }
}

// ==================== CONTENT PIPELINE ====================
async function createContentDrop(drop) {
  const { data, error } = await supabase.from('content_drops').insert({
    ...drop,
    processed: false,
  }).select().single();
  if (error) throw error;
  return data;
}

async function getContentDrops(filters = {}) {
  let query = supabase.from('content_drops').select('*');
  if (filters.platform) query = query.eq('platform', filters.platform);
  if (typeof filters.processed === 'boolean') query = query.eq('processed', filters.processed);
  if (filters.since) query = query.gte('created_at', filters.since);
  if (filters.search) {
    const search = filters.search.trim();
    query = query.or([
      `title.ilike.%${search}%`,
      `raw_content.ilike.%${search}%`,
      `summary.ilike.%${search}%`,
      `source_url.ilike.%${search}%`
    ].join(','));
  }
  query = query.order('created_at', { ascending: false }).limit(filters.limit || 10);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function getContentDropById(id) {
  const { data, error } = await supabase.from('content_drops').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

async function updateContentDrop(id, updates) {
  const { data, error } = await supabase
    .from('content_drops')
    .update(updates)
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function createSocialMetric(metric) {
  const { data, error } = await supabase.from('social_metrics').insert(metric).select().single();
  if (error) throw error;
  return data;
}

async function getSocialMetrics(filters = {}) {
  let query = supabase.from('social_metrics').select('*');
  if (filters.platform) query = query.eq('platform', filters.platform);
  if (filters.metric_type) query = query.eq('metric_type', filters.metric_type);
  if (filters.since) query = query.gte('created_at', filters.since);
  query = query.order('created_at', { ascending: false }).limit(filters.limit || 10);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function getContentPipelineSummary() {
  const [{ count: total_drops, error: totalError }, { count: unprocessed_count, error: unprocessedError }, recentResult, breakdownResult] = await Promise.all([
    supabase.from('content_drops').select('*', { count: 'exact', head: true }),
    supabase.from('content_drops').select('*', { count: 'exact', head: true }).eq('processed', false),
    supabase.from('content_drops').select('*').order('created_at', { ascending: false }).limit(10),
    supabase.from('content_drops').select('platform'),
  ]);

  if (totalError) throw totalError;
  if (unprocessedError) throw unprocessedError;
  if (recentResult.error) throw recentResult.error;
  if (breakdownResult.error) throw breakdownResult.error;

  const platform_breakdown = (breakdownResult.data || []).reduce((acc, row) => {
    acc[row.platform] = (acc[row.platform] || 0) + 1;
    return acc;
  }, {});

  return {
    total_drops: total_drops || 0,
    unprocessed_count: unprocessed_count || 0,
    recent_drops: recentResult.data || [],
    platform_breakdown,
  };
}

// ==================== REPORTS ====================
async function getReports() {
  const { data, error } = await supabase
    .from('reports')
    .select('*, addendums:report_addendums(id, created_at), audit:fletcher_audits(id, created_at, updated_at)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function getReportById(id) {
  const { data, error } = await supabase
    .from('reports')
    .select(`
      *,
      addendums:report_addendums(*),
      audit:fletcher_audits(*)
    `)
    .eq('id', id)
    .order('created_at', { foreignTable: 'report_addendums', ascending: false })
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function createReport(report) {
  const submittedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from('reports')
    .insert({
      ...report,
      status: 'submitted',
      submitted_at: submittedAt,
      submitted_by: report.created_by,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function updateDraftReport(id, updates) {
  const current = await getReportById(id);
  if (!current) throw new Error('Report not found');
  if (current.status === 'submitted') {
    const error = new Error('Submitted reports are locked');
    error.status = 400;
    throw error;
  }

  const allowed = ['title', 'goal', 'summary', 'existing_state', 'implemented_changes', 'agent_assignments', 'escalations', 'timeline', 'memories_added'];
  const payload = {};
  for (const key of allowed) if (key in updates) payload[key] = updates[key];

  const { data, error } = await supabase.from('reports').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return getReportById(data.id);
}

async function submitReport(id, submittedBy) {
  const current = await getReportById(id);
  if (!current) throw new Error('Report not found');
  if (current.status === 'submitted') return current;

  const { data, error } = await supabase
    .from('reports')
    .update({ status: 'submitted', submitted_at: new Date().toISOString(), submitted_by: submittedBy })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return getReportById(data.id);
}

async function addReportAddendum(addendum) {
  const report = await getReportById(addendum.report_id);
  if (!report) throw new Error('Report not found');
  if (report.status !== 'submitted') {
    const error = new Error('Addendums can only be added to submitted reports');
    error.status = 400;
    throw error;
  }

  const { data, error } = await supabase.from('report_addendums').insert(addendum).select().single();
  if (error) throw error;
  return data;
}

async function getAuditByReportId(reportId) {
  const { data, error } = await supabase
    .from('fletcher_audits')
    .select('*')
    .eq('report_id', reportId)
    .order('created_at', { ascending: false })
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function upsertAudit(audit) {
  const existing = await getAuditByReportId(audit.report_id);
  const payload = { ...audit, updated_at: new Date().toISOString() };

  const query = existing
    ? supabase.from('fletcher_audits').update(payload).eq('report_id', audit.report_id)
    : supabase.from('fletcher_audits').insert(payload);

  const { data, error } = await query.select().single();
  if (error) throw error;
  return data;
}

// ==================== PROJECT STATUS ====================
const PROJECT_STATUS_SEED = [
  {
    project_name: 'Neon Pastoral',
    status: 'active',
    last_update: 'Unity optimization phases 2-3 complete, enemy AI gameplay fixes in progress',
    updated_by: 'Alex'
  },
  {
    project_name: 'Mission Control',
    status: 'active',
    last_update: 'agent dashboard, project page being built',
    updated_by: 'Celeste'
  },
  {
    project_name: 'Portfolio',
    status: 'active',
    last_update: 'software portfolio site in progress',
    updated_by: 'Alex'
  },
  {
    project_name: 'Content Pipeline',
    status: 'active',
    last_update: 'Telegram bot running, social metrics polling',
    updated_by: 'Sawyer'
  },
  {
    project_name: 'OpenClaw Agent System',
    status: 'active',
    last_update: '3 agents operational, operating model reset today',
    updated_by: 'Fletcher'
  }
];

async function ensureProjectStatusSeeded() {
  const { count, error: countError } = await supabase
    .from('project_status')
    .select('*', { count: 'exact', head: true });

  if (countError) throw countError;
  if ((count || 0) > 0) return count;

  const now = new Date().toISOString();
  const { error } = await supabase.from('project_status').insert(
    PROJECT_STATUS_SEED.map((project, index) => ({
      ...project,
      updated_at: new Date(Date.now() - index * 60 * 1000).toISOString() || now,
    }))
  );

  if (error) throw error;
  return PROJECT_STATUS_SEED.length;
}

async function getProjectStatuses() {
  const { data, error } = await supabase
    .from('project_status')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

async function updateProjectStatusById(id, updates) {
  const { data, error } = await supabase
    .from('project_status')
    .update({
      last_update: updates.last_update,
      updated_by: updates.updated_by,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    const notFound = new Error('Project not found');
    notFound.status = 404;
    throw notFound;
  }

  return data;
}

// ==================== INTERACT MESSAGE QUEUE ====================
async function createInteractMessage(message) {
  const { data, error } = await supabase
    .from('interact_messages')
    .insert({
      agent_target: message.agent_target,
      element_context: message.element_context,
      user_message: message.user_message,
      status: message.status || 'pending'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function getPendingInteractMessages() {
  const { data, error } = await supabase
    .from('interact_messages')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

async function markInteractMessageProcessed(id) {
  const { data, error } = await supabase
    .from('interact_messages')
    .update({
      status: 'completed',
      processed_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

module.exports = {
  supabase,
  createTask,
  updateTask,
  deleteTask,
  getTasks,
  addConversationSummary,
  getRecentConversations,
  addCostEntry,
  getCosts,
  updateAgentStatus,
  getAgentStatus,
  getHealthAudits,
  addHealthAudit,
  addOverrideLog,
  getOverrides,
  upsertMemoryFile,
  getMemoryFiles,
  getMemoryFile,
  deleteMemoryFile,
  createContentDrop,
  getContentDrops,
  getContentDropById,
  updateContentDrop,
  createSocialMetric,
  getSocialMetrics,
  getContentPipelineSummary,
  getReports,
  getReportById,
  createReport,
  updateDraftReport,
  submitReport,
  addReportAddendum,
  getAuditByReportId,
  upsertAudit,
  ensureProjectStatusSeeded,
  getProjectStatuses,
  updateProjectStatusById,
  createInteractMessage,
  getPendingInteractMessages,
  markInteractMessageProcessed
};
