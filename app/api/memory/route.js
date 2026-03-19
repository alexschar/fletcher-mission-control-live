import { NextResponse } from 'next/server';
const db = require('../../../lib/database');
const { getMemoryFiles } = require('../../../lib/supabase');
const { authMiddleware } = require('../../../lib/auth');

export async function GET(request) {
  const authError = authMiddleware(request);
  if (authError) return authError;
  
  try {
    const { searchParams } = new URL(request.url);
    const agent = searchParams.get('agent');

    try {
      const files = await getMemoryFiles(agent);
      return NextResponse.json(files);
    } catch (error) {
      if (error.code !== '42P01' && !error.message?.includes('does not exist')) {
        throw error;
      }
    }

    const files = await db.getMemoryFiles(agent);
    return NextResponse.json(files);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const authError = authMiddleware(request);
  if (authError) return authError;
  
  try {
    const body = await request.json();
    
    if (body.action === 'delete') {
      await db.deleteMemoryFile(body.name);
      return NextResponse.json({ ok: true });
    }
    
    // Default: upsert memory file
    const file = await db.upsertMemoryFile(body);
    return NextResponse.json(file);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
