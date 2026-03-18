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

/**
 * Create a new task
 * @param {Object} task - Task object with title, description, status, etc.
 * @returns {Promise<Object>} Created task
 */
async function createTask(task) {
  const { data, error } = await supabase
    .from('tasks')
    .insert(task)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Update an existing task
 * @param {string} id - Task ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated task
 */
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

/**
 * Delete a task
 * @param {string} id - Task ID
 * @returns {Promise<void>}
 */
async function deleteTask(id) {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

/**
 * Get tasks with optional filters
 * @param {Object} filters - Optional filters (status, assigned_to, created_by, etc.)
 * @returns {Promise<Array>} Array of tasks
 */
async function getTasks(filters = {}) {
  let query = supabase.from('tasks').select('*');
  
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.assigned_to) query = query.eq('assigned_to', filters.assigned_to);
  if (filters.created_by) query = query.eq('created_by', filters.created_by);
  if (filters.priority) query = query.eq('priority', filters.priority);
  
  // Order by created_at descending
  query = query.order('created_at', { ascending: false });
  
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// ==================== CONVERSATIONS ====================

/**
 * Add a conversation summary
 * @param {Object} summary - Summary object with agent, summary, topics, source
 * @returns {Promise<Object>} Created conversation
 */
async function addConversationSummary(summary) {
  const { data, error } = await supabase
    .from('conversations')
    .insert(summary)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Get recent conversations
 * @param {number} hours - Number of hours to look back (default 24)
 * @returns {Promise<Array>} Array of conversations
 */
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

/**
 * Add a cost entry
 * @param {Object} entry - Cost entry with agent, model, tokens, calculated_cost
 * @returns {Promise<Object>} Created cost entry
 */
async function addCostEntry(entry) {
  const { data, error } = await supabase
    .from('costs')
    .insert(entry)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Get costs with optional period aggregation
 * @param {string} period - Period to aggregate ('day', 'week', 'month', or null for all)
 * @returns {Promise<Array>} Array of costs or aggregated data
 */
async function getCosts(period = null) {
  let query = supabase
    .from('costs')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (period) {
    // For now, return raw data - aggregation can be done in the application
    const cutoff = getCutoffDate(period);
    if (cutoff) {
      query = query.gte('created_at', cutoff);
    }
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

function getCutoffDate(period) {
  const now = new Date();
  switch (period) {
    case 'day':
      return new Date(now - 24 * 60 * 60 * 1000).toISOString();
    case 'week':
      return new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
    case 'month':
      return new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
    default:
      return null;
  }
}

// ==================== AGENT STATUS ====================

/**
 * Update agent status
 * @param {string} agent - Agent identifier
 * @param {Object} status - Status object with status, current_task
 * @returns {Promise<Object>} Updated agent status
 */
async function updateAgentStatus(agent, status) {
  const { data, error } = await supabase
    .from('agent_status')
    .upsert({
      agent,
      ...status,
      updated_at: new Date().toISOString()
    }, { onConflict: 'agent' })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Get all agent statuses
 * @returns {Promise<Array>} Array of agent statuses
 */
async function getAgentStatus() {
  const { data, error } = await supabase
    .from('agent_status')
    .select('*')
    .order('agent');
  
  if (error) throw error;
  return data;
}

// ==================== OVERRIDE LOG ====================

/**
 * Add an override log entry
 * @param {Object} entry - Log entry with tier, task_description, risk_level, outcome, details
 * @returns {Promise<Object>} Created log entry
 */
async function addOverrideLog(entry) {
  const { data, error } = await supabase
    .from('override_log')
    .insert(entry)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Get override log entries
 * @param {number} limit - Number of entries to return (default 50)
 * @returns {Promise<Array>} Array of override log entries
 */
async function getOverrides(limit = 50) {
  const { data, error } = await supabase
    .from('override_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return data;
}

module.exports = {
  supabase,
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
  getOverrides
};
