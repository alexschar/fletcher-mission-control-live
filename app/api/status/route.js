import { NextResponse } from 'next/server';
const db = require('../../../lib/database');

const DEFAULT_AGENT = 'celeste';

export async function GET() {
  try {
    const statuses = await db.getAgentStatus();
    // If there are no statuses, return a default
    if (!statuses || statuses.length === 0) {
      return NextResponse.json({
        status: 'idle',
        currentTask: null,
        agent: DEFAULT_AGENT
      });
    }
    // Return the first status or the default agent's status
    const defaultStatus = statuses.find(s => s.agent === DEFAULT_AGENT) || statuses[0];
    return NextResponse.json(defaultStatus);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    
    const updated = await db.updateAgentStatus(DEFAULT_AGENT, {
      status: body.status,
      current_task: body.currentTask
    });
    
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
