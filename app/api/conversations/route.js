import { NextResponse } from 'next/server';
const db = require('../../../lib/database');

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get('hours') || '24', 10);
    
    const conversations = await db.getRecentConversations(hours);
    return NextResponse.json(conversations || []);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    
    const conversation = await db.addConversationSummary({
      agent: body.agent,
      summary: body.summary,
      topics: body.topics || [],
      source: body.source
    });
    
    return NextResponse.json(conversation);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
