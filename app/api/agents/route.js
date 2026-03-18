import { NextResponse } from 'next/server';
const { getAgentStatus, updateAgentStatus, getAllAgentStatuses } = require('../../../lib/store');

export async function GET() {
  return NextResponse.json(getAllAgentStatuses());
}

export async function POST(request) {
  const body = await request.json();
  const { agent, ...updates } = body;
  
  if (!agent) {
    return NextResponse.json({ error: 'Agent name required' }, { status: 400 });
  }
  
  const updated = updateAgentStatus(agent, updates);
  return NextResponse.json(updated);
}