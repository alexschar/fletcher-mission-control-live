// Database wrapper that tries Supabase first, falls back to JSON
// This allows the API to work even when Supabase tables don't exist yet

const supabaseModule = require('./supabase');
const jsonFallback = require('./jsonFallback');

function isEmptyResult(value) {
  return Array.isArray(value) ? value.length === 0 : value == null;
}

// State tracking
let backend = 'supabase';
let tablesExist = false;
let supabaseConnected = false;

// Check Supabase connection and table availability
async function checkSupabase() {
  try {
    // Probe a known-good table. If this fails, Supabase is truly
    // unreachable. Per-table errors are handled in individual functions.
    const { error } = await supabaseModule.supabase
      .from('agent_status')
      .select('agent')
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
    let primaryResult = null;

    if (backend === 'supabase') {
      try {
        primaryResult = await supabaseModule.upsertMemoryFile(...args);
      } catch (error) {
        console.log('[DB] Supabase upsertMemoryFile failed, continuing with JSON mirror:', error.message);
      }
    }

    const jsonResult = await jsonFallback.upsertMemoryFile(...args);
    return primaryResult || jsonResult;
  },
  
  getMemoryFiles: async (...args) => {
    await initialize();
    if (backend === 'supabase') {
      try {
        const files = await supabaseModule.getMemoryFiles(...args);
        if (!isEmptyResult(files)) {
          return files;
        }

        const fallbackFiles = await jsonFallback.getMemoryFiles(...args);
        if (!isEmptyResult(fallbackFiles)) {
          console.log('[DB] Supabase memory_files empty, using JSON fallback data');
          return fallbackFiles;
        }

        return [];
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
        const file = await supabaseModule.getMemoryFile(...args);
        if (!isEmptyResult(file)) {
          return file;
        }

        const fallbackFile = await jsonFallback.getMemoryFile(...args);
        if (!isEmptyResult(fallbackFile)) {
          console.log('[DB] Supabase memory file missing, using JSON fallback data');
          return fallbackFile;
        }

        return file;
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
        await supabaseModule.deleteMemoryFile(...args);
      } catch (error) {
        console.log('[DB] Supabase deleteMemoryFile failed, continuing with JSON delete:', error.message);
      }
    }

    return await jsonFallback.deleteMemoryFile(...args);
  }
};

module.exports = db;
