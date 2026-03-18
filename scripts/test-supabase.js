// Test script for Supabase API wrapper
const supabase = require('../lib/supabase');

async function runTests() {
  console.log('Testing Supabase API Wrapper...\n');
  let passed = 0;
  let failed = 0;

  const test = async (name, fn) => {
    try {
      await fn();
      console.log(`✓ ${name}`);
      passed++;
    } catch (error) {
      console.log(`✗ ${name}: ${error.message}`);
      failed++;
    }
  };

  // Test createTask
  await test('createTask', async () => {
    const task = await supabase.createTask({
      title: 'Test Task',
      description: 'Testing the API',
      status: 'backlog',
      priority: 'high',
      created_by: 'test'
    });
    if (!task.id) throw new Error('No ID returned');
    return task;
  });

  // Test getTasks
  await test('getTasks', async () => {
    const tasks = await supabase.getTasks();
    if (!Array.isArray(tasks)) throw new Error('Not an array');
    return tasks;
  });

  // Test updateTask
  await test('updateTask', async () => {
    const tasks = await supabase.getTasks({ status: 'backlog' });
    if (tasks.length === 0) throw new Error('No tasks to update');
    const updated = await supabase.updateTask(tasks[0].id, { status: 'in_progress' });
    if (updated.status !== 'in_progress') throw new Error('Status not updated');
    return updated;
  });

  // Test addConversationSummary
  await test('addConversationSummary', async () => {
    const conv = await supabase.addConversationSummary({
      agent: 'test-agent',
      summary: 'Test conversation',
      topics: ['testing'],
      source: 'test'
    });
    if (!conv.id) throw new Error('No ID returned');
    return conv;
  });

  // Test getRecentConversations
  await test('getRecentConversations', async () => {
    const convs = await supabase.getRecentConversations(24);
    if (!Array.isArray(convs)) throw new Error('Not an array');
    return convs;
  });

  // Test addCostEntry
  await test('addCostEntry', async () => {
    const cost = await supabase.addCostEntry({
      agent: 'celeste',
      model: 'claude-3',
      input_tokens: 1000,
      output_tokens: 500,
      calculated_cost: 0.05
    });
    if (!cost.id) throw new Error('No ID returned');
    return cost;
  });

  // Test getCosts
  await test('getCosts', async () => {
    const costs = await supabase.getCosts('day');
    if (!Array.isArray(costs)) throw new Error('Not an array');
    return costs;
  });

  // Test updateAgentStatus
  await test('updateAgentStatus', async () => {
    const status = await supabase.updateAgentStatus('test-agent', {
      status: 'idle',
      current_task: null
    });
    if (!status.agent) throw new Error('No agent returned');
    return status;
  });

  // Test getAgentStatus
  await test('getAgentStatus', async () => {
    const statuses = await supabase.getAgentStatus();
    if (!Array.isArray(statuses)) throw new Error('Not an array');
    return statuses;
  });

  // Test addOverrideLog
  await test('addOverrideLog', async () => {
    const log = await supabase.addOverrideLog({
      tier: '1',
      task_description: 'Test override',
      risk_level: 'low',
      outcome: 'approved',
      details: 'Test details'
    });
    if (!log.id) throw new Error('No ID returned');
    return log;
  });

  // Test deleteTask
  await test('deleteTask', async () => {
    const tasks = await supabase.getTasks();
    if (tasks.length === 0) throw new Error('No tasks to delete');
    await supabase.deleteTask(tasks[0].id);
    return true;
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
