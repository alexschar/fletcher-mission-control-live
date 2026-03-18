// Supabase API Wrapper
// Uses @supabase/supabase-js for database operations

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://yulirzjagrebzhfteyqx.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1bGlyemphZ3JlYnpoZnRleXF4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzM0Njg0NSwiZXhwIjoyMDg4OTIyODQ1fQ.ut_Cr1c1JTvINpHWlYAi-Xd3T99z9EQrVpiQDSoTGcE';

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
  const { data, error } = await supabase.from('conversations').insert(summary).select().single();
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
  const { data, error } = await supabase.from('costs').insert(entry).select().single();
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
async function upsertMemoryFile(file) {
  const { data, error } = await supabase
    .from('memory_files')
    .upsert({
      name: file.name,
      path: file.path || 'memory',
      content: file.content,
      agent: file.agent || 'system',
      size: file.content?.length || 0,
      updated_at: new Date().toISOString()
    }, { onConflict: 'name' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function getMemoryFiles(agent = null) {
  let query = supabase.from('memory_files').select('*').order('updated_at', { ascending: false });
  if (agent) query = query.eq('agent', agent);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function getMemoryFile(name) {
  const { data, error } = await supabase.from('memory_files').select('*').eq('name', name).single();
  if (error) throw error;
  return data;
}

async function deleteMemoryFile(name) {
  const { error } = await supabase.from('memory_files').delete().eq('name', name);
  if (error) throw error;
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
  addOverrideLog,
  getOverrides,
  upsertMemoryFile,
  getMemoryFiles,
  getMemoryFile,
  deleteMemoryFile,
  getReports,
  getReportById,
  createReport,
  updateDraftReport,
  submitReport,
  addReportAddendum,
  getAuditByReportId,
  upsertAudit
};
