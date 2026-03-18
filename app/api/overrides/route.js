import { NextResponse } from 'next/server';
const db = require('../../../lib/database');

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    
    const overrides = await db.getOverrides(limit);
    return NextResponse.json(overrides || []);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    
    const log = await db.addOverrideLog({
      tier: body.tier,
      task_description: body.task_description,
      risk_level: body.risk_level,
      outcome: body.outcome,
      details: body.details
    });
    
    return NextResponse.json(log);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
