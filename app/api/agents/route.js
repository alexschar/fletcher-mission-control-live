import { NextResponse } from 'next/server';
const { getAgentStatus, updateAgentStatus, getAllAgentStatuses } = require('../../../lib/store');
const { authMiddleware } = require('../../../lib/auth');

export async function GET(request) {
  const authError = authMiddleware(request);
  if (authError) return authError;
  
  return NextResponse.json(getAllAgentStatuses());
}

export async function POST(request) {
  const authError = authMiddleware(request);
  if (authError) return authError;
  
  const body = await request.json();
  const { agent, ...updates } = body;
  
  if (!agent) {
    return NextResponse.json({ error: 'Agent name required' }, { status: 400 });
  }
  
  const updated = updateAgentStatus(agent, updates);
  return NextResponse.json(updated);
}