import { NextResponse } from 'next/server';
const { getAgentStatus, updateAgentStatus, getAllAgentStatuses } = require('../../../lib/store');
const { authMiddleware } = require('../../../lib/auth');

const VALID_AGENTS = ['sawyer', 'main', 'celeste'];
const VALID_STATUSES = ['working', 'idle', 'error', 'waiting', 'offline'];
const RATE_LIMIT_MS = 60000; // 1 minute between updates

const lastUpdate = {};

function isRateLimited(agent) {
  const now = Date.now();
  if (!lastUpdate[agent]) {
    lastUpdate[agent] = now;
    return false;
  }
  if (now - lastUpdate[agent] < RATE_LIMIT_MS) {
    return true;
  }
  lastUpdate[agent] = now;
  return false;
}

export async function GET(request) {
  const authError = authMiddleware(request);
  if (authError) return authError;
  
  return NextResponse.json(getAllAgentStatuses());
}

export async function POST(request) {
  const authError = authMiddleware(request);
  if (authError) return authError;
  
  const body = await request.json();
  const { agent, status, currentTask, heartbeat } = body;
  
  // Validate agent
  if (!agent) {
    return NextResponse.json({ error: 'Agent name required' }, { status: 400 });
  }
  if (!VALID_AGENTS.includes(agent)) {
    return NextResponse.json({ error: 'Invalid agent. Must be: sawyer, main, or celeste' }, { status: 400 });
  }
  
  // Rate limit non-heartbeat updates
  if (!heartbeat && isRateLimited(agent)) {
    return NextResponse.json({ error: 'Rate limited. Max 1 update per minute.' }, { status: 429 });
  }
  
  // Build updates
  const updates = { lastSeen: new Date().toISOString() };
  
  if (status) {
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: `Invalid status. Must be: ${VALID_STATUSES.join(', ')}` }, { status: 400 });
    }
    updates.status = status;
  }
  
  if (currentTask !== undefined) {
    updates.currentTask = currentTask;
  }
  
  // Heartbeat only updates lastSeen, not status
  if (heartbeat && !status) {
    // Just refresh the timestamp
  }
  
  const updated = updateAgentStatus(agent, updates);
  return NextResponse.json(updated);
}