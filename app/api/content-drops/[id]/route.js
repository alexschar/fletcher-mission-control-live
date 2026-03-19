import { NextResponse } from 'next/server';
const { authMiddleware } = require('../../../../lib/auth');
const { getContentDropById, updateContentDrop } = require('../../../../lib/supabase');

export async function GET(request, { params }) {
  const authError = authMiddleware(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const record = await getContentDropById(id);

    if (!record) {
      return NextResponse.json({ error: 'Content drop not found' }, { status: 404 });
    }

    return NextResponse.json(record, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const authError = authMiddleware(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await request.json();

    const updates = {};

    if ('processed' in body) {
      if (typeof body.processed !== 'boolean') {
        return NextResponse.json({ error: 'processed must be a boolean' }, { status: 400 });
      }
      updates.processed = body.processed;
    }

    if ('summary' in body) {
      if (body.summary != null && typeof body.summary !== 'string') {
        return NextResponse.json({ error: 'summary must be a string or null' }, { status: 400 });
      }
      updates.summary = typeof body.summary === 'string' ? body.summary.trim() || null : null;
    }

    if ('topics' in body) {
      if (!Array.isArray(body.topics)) {
        return NextResponse.json({ error: 'topics must be an array' }, { status: 400 });
      }
      updates.topics = body.topics;
    }

    if ('relevant_agents' in body) {
      if (!Array.isArray(body.relevant_agents)) {
        return NextResponse.json({ error: 'relevant_agents must be an array' }, { status: 400 });
      }
      updates.relevant_agents = body.relevant_agents;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields provided for update' }, { status: 400 });
    }

    const existing = await getContentDropById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Content drop not found' }, { status: 404 });
    }

    const record = await updateContentDrop(id, updates);
    return NextResponse.json(record);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
}
