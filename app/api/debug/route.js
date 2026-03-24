import { NextResponse } from 'next/server';
const { authMiddleware } = require('../../../lib/auth');

export async function GET(request) {
  const authError = authMiddleware(request);
  if (authError) return authError;

  const results = {};

  // 1. Test direct Supabase connection
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabaseUrl = 'https://yulirzjagrebzhfteyqx.supabase.co';
    const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1bGlyemphZ3JlYnpoZnRleXF4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzM0Njg0NSwiZXhwIjoyMDg4OTIyODQ1fQ.ut_Cr1c1JTvINpHWlYAi-Xd3T99z9EQrVpiQDSoTGcE';
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // Test agent_status (known good)
    const { data: agentData, error: agentError } = await supabase.from('agent_status').select('id').limit(1);
    results.directAgentStatus = agentError ? { error: agentError.message } : { ok: true, rows: agentData?.length };

    // Test tasks table
    const { data: taskData, error: taskError } = await supabase.from('tasks').select('id').limit(1);
    results.directTasks = taskError ? { error: taskError.message, code: taskError.code } : { ok: true, rows: taskData?.length };

    // Test costs table
    const { data: costData, error: costError } = await supabase.from('costs').select('id').limit(1);
    results.directCosts = costError ? { error: costError.message, code: costError.code } : { ok: true, rows: costData?.length };
  } catch (error) {
    results.directConnection = { error: error.message };
  }

  // 2. Test database.js wrapper
  try {
    const db = require('../../../lib/database');
    await db.initialize();
    results.databaseWrapper = db.getBackendStatus();
  } catch (error) {
    results.databaseWrapper = { error: error.message };
  }

  // 3. Test supabase.js getTasks
  try {
    const supabaseModule = require('../../../lib/supabase');
    const tasks = await supabaseModule.getTasks();
    results.supabaseGetTasks = { ok: true, count: tasks?.length, firstId: tasks?.[0]?.id };
  } catch (error) {
    results.supabaseGetTasks = { error: error.message };
  }

  // 4. Test database.js getTasks (the actual path used by the route)
  try {
    const db = require('../../../lib/database');
    const tasks = await db.getTasks();
    results.dbGetTasks = { ok: true, count: tasks?.length, firstId: tasks?.[0]?.id };
  } catch (error) {
    results.dbGetTasks = { error: error.message };
  }

  return NextResponse.json(results, { status: 200 });
}
