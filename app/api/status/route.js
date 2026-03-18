import { NextResponse } from 'next/server';
const { getAllAgentStatuses, updateAgentStatus } = require('../../../lib/store');
const { authMiddleware } = require('../../../lib/auth');

export async function GET(request) {
  const authError = authMiddleware(request);
  if (authError) return authError;
  
  try {
    const statuses = await getAllAgentStatuses();
    return NextResponse.json(statuses);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const authError = authMiddleware(request);
  if (authError) return authError;
  
  try {
    const body = await request.json();
    const { agent, ...updates } = body;
    
    if (!agent) {
      return NextResponse.json({ error: 'Agent name required' }, { status: 400 });
    }
    
    const updated = await updateAgentStatus(agent, updates);
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
