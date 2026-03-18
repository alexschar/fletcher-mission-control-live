// Database wrapper that tries Supabase first, falls back to JSON
// This allows the API to work even when Supabase tables don't exist yet

const supabaseModule = require('./supabase');
const jsonFallback = require('./jsonFallback');

// State tracking
let backend = 'supabase';
let tablesExist = false;
let supabaseConnected = false;

// Check Supabase connection and table availability
async function checkSupabase() {
  try {
    // Try a simple query to check if Supabase is accessible
    const { error } = await supabaseModule.supabase
      .from('tasks')
      .select('id')
      .limit(1);
    
    if (error) {
      // Check if it's a table not found error
      if (error.message && (
        error.message.includes('relation') || 
        error.message.includes('does not exist') ||
        error.code === '42P01'
      )) {
        console.log('[DB] Supabase connected but tables do not exist, falling back to JSON');
        tablesExist = false;
        supabaseConnected = true;
        backend = 'json';
        return false;
      }
      
      // Other connection errors
      console.log('[DB] Supabase error:', error.message);
      supabaseConnected = false;
      backend = 'json';
      return false;
    }
    
    // Success - tables exist
    console.log('[DB] Using Supabase backend');
    tablesExist = true;
    supabaseConnected = true;
    backend = 'supabase';
    return true;
  } catch (error) {
    console.log('[DB] Supabase connection failed:', error.message);
    supabaseConnected = false;
    backend = 'json';
    return false;
  }
}

// Initialize: check Supabase availability
let initialized = false;

async function initialize() {
  if (initialized) return;
  
  console.log('[DB] Initializing database wrapper...');
  await checkSupabase();
  initialized = true;
}

// Get current backend status
function getBackendStatus() {
  return {
    supabaseConnected,
    backend,
    tablesExist
  };
}

// Wrap functions to try Supabase first, fallback to JSON
const db = {
  // Initialize
  initialize,
  getBackendStatus,
  
  // Tasks
  createTask: async (...args) => {
    await initialize();
    if (backend === 'supabase') {
      try {
        return await supabaseModule.createTask(...args);
      } catch (error) {
        console.log('[DB] Supabase task create failed, trying JSON:', error.message);
        return await jsonFallback.createTask(...args);
      }
    }
    return await jsonFallback.createTask(...args);
  },
  
  updateTask: async (...args) => {
    await initialize();
    if (backend === 'supabase') {
      try {
        return await supabaseModule.updateTask(...args);
      } catch (error) {
        console.log('[DB] Supabase task update failed, trying JSON:', error.message);
        return await jsonFallback.updateTask(...args);
      }
    }
    return await jsonFallback.updateTask(...args);
  },
  
  deleteTask: async (...args) => {
    await initialize();
    if (backend === 'supabase') {
      try {
        return await supabaseModule.deleteTask(...args);
      } catch (error) {
        console.log('[DB] Supabase task delete failed, trying JSON:', error.message);
        return await jsonFallback.deleteTask(...args);
      }
    }
    return await jsonFallback.deleteTask(...args);
  },
  
  getTasks: async (...args) => {
    await initialize();
    if (backend === 'supabase') {
      try {
        return await supabaseModule.getTasks(...args);
      } catch (error) {
        console.log('[DB] Supabase getTasks failed, trying JSON:', error.message);
        return await jsonFallback.getTasks(...args);
      }
    }
    return await jsonFallback.getTasks(...args);
  },
  
  // Conversations
  addConversationSummary: async (...args) => {
    await initialize();
    if (backend === 'supabase') {
      try {
        return await supabaseModule.addConversationSummary(...args);
      } catch (error) {
        console.log('[DB] Supabase addConversationSummary failed, trying JSON:', error.message);
        return await jsonFallback.addConversationSummary(...args);
      }
    }
    return await jsonFallback.addConversationSummary(...args);
  },
  
  getRecentConversations: async (...args) => {
    await initialize();
    if (backend === 'supabase') {
      try {
        return await supabaseModule.getRecentConversations(...args);
      } catch (error) {
        console.log('[DB] Supabase getRecentConversations failed, trying JSON:', error.message);
        return await jsonFallback.getRecentConversations(...args);
      }
    }
    return await jsonFallback.getRecentConversations(...args);
  },
  
  // Costs
  addCostEntry: async (...args) => {
    await initialize();
    if (backend === 'supabase') {
      try {
        return await supabaseModule.addCostEntry(...args);
      } catch (error) {
        console.log('[DB] Supabase addCostEntry failed, trying JSON:', error.message);
        return await jsonFallback.addCostEntry(...args);
      }
    }
    return await jsonFallback.addCostEntry(...args);
  },
  
  getCosts: async (...args) => {
    await initialize();
    if (backend === 'supabase') {
      try {
        return await supabaseModule.getCosts(...args);
      } catch (error) {
        console.log('[DB] Supabase getCosts failed, trying JSON:', error.message);
        return await jsonFallback.getCosts(...args);
      }
    }
    return await jsonFallback.getCosts(...args);
  },
  
  // Agent Status
  updateAgentStatus: async (...args) => {
    await initialize();
    if (backend === 'supabase') {
      try {
        return await supabaseModule.updateAgentStatus(...args);
      } catch (error) {
        console.log('[DB] Supabase updateAgentStatus failed, trying JSON:', error.message);
        return await jsonFallback.updateAgentStatus(...args);
      }
    }
    return await jsonFallback.updateAgentStatus(...args);
  },
  
  getAgentStatus: async (...args) => {
    await initialize();
    if (backend === 'supabase') {
      try {
        return await supabaseModule.getAgentStatus(...args);
      } catch (error) {
        console.log('[DB] Supabase getAgentStatus failed, trying JSON:', error.message);
        return await jsonFallback.getAgentStatus(...args);
      }
    }
    return await jsonFallback.getAgentStatus(...args);
  },
  
  // Override Log
  addOverrideLog: async (...args) => {
    await initialize();
    if (backend === 'supabase') {
      try {
        return await supabaseModule.addOverrideLog(...args);
      } catch (error) {
        console.log('[DB] Supabase addOverrideLog failed, trying JSON:', error.message);
        return await jsonFallback.addOverrideLog(...args);
      }
    }
    return await jsonFallback.addOverrideLog(...args);
  },
  
  getOverrides: async (...args) => {
    await initialize();
    if (backend === 'supabase') {
      try {
        return await supabaseModule.getOverrides(...args);
      } catch (error) {
        console.log('[DB] Supabase getOverrides failed, trying JSON:', error.message);
        return await jsonFallback.getOverrides(...args);
      }
    }
    return await jsonFallback.getOverrides(...args);
  },
  
  // Memory Files
  upsertMemoryFile: async (...args) => {
    await initialize();
    if (backend === 'supabase') {
      try {
        return await supabaseModule.upsertMemoryFile(...args);
      } catch (error) {
        console.log('[DB] Supabase upsertMemoryFile failed, trying JSON:', error.message);
        return await jsonFallback.upsertMemoryFile(...args);
      }
    }
    return await jsonFallback.upsertMemoryFile(...args);
  },
  
  getMemoryFiles: async (...args) => {
    await initialize();
    if (backend === 'supabase') {
      try {
        return await supabaseModule.getMemoryFiles(...args);
      } catch (error) {
        console.log('[DB] Supabase getMemoryFiles failed, trying JSON:', error.message);
        return await jsonFallback.getMemoryFiles(...args);
      }
    }
    return await jsonFallback.getMemoryFiles(...args);
  },
  
  getMemoryFile: async (...args) => {
    await initialize();
    if (backend === 'supabase') {
      try {
        return await supabaseModule.getMemoryFile(...args);
      } catch (error) {
        console.log('[DB] Supabase getMemoryFile failed, trying JSON:', error.message);
        return await jsonFallback.getMemoryFile(...args);
      }
    }
    return await jsonFallback.getMemoryFile(...args);
  },
  
  deleteMemoryFile: async (...args) => {
    await initialize();
    if (backend === 'supabase') {
      try {
        return await supabaseModule.deleteMemoryFile(...args);
      } catch (error) {
        console.log('[DB] Supabase deleteMemoryFile failed, trying JSON:', error.message);
        return await jsonFallback.deleteMemoryFile(...args);
      }
    }
    return await jsonFallback.deleteMemoryFile(...args);
  }
};

module.exports = db;
