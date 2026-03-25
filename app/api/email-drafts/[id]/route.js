import { NextResponse } from 'next/server';
const { getLifeSignalById, updateLifeSignal } = require('../../../../lib/supabase');

// GET /api/email-drafts/:id — get a specific signal's draft
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const signal = await getLifeSignalById(id);

    if (!signal) {
      return NextResponse.json({ error: 'Signal not found' }, { status: 404 });
    }

    return NextResponse.json({
      signal_id: signal.id,
      title: signal.title,
      source: signal.source,
      category: signal.category,
      draft: signal.agent_draft,
      status: signal.status,
      agent_notes: signal.agent_notes,
    });
  } catch (error) {
    console.error('[email-drafts GET by id]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/email-drafts/:id — update draft text and optionally mark status
// Body: { draft: "text", status?: "acted_on" }
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updates = {};
    if ('draft' in body) updates.agent_draft = body.draft;
    if (body.status) updates.status = body.status;

    // If marking as "acted_on", the "Approve & Send" flow
    if (body.status === 'acted_on') {
      updates.processed_at = new Date().toISOString();
      // Update agent_notes to reflect draft was approved
      const signal = await getLifeSignalById(id);
      if (signal?.agent_notes) {
        updates.agent_notes = {
          ...signal.agent_notes,
          draft_ready: true,
          draft_approved: true,
          approved_at: new Date().toISOString(),
        };
      }
    }

    const updated = await updateLifeSignal(id, updates);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('[email-drafts PATCH]', error);
    if (error.message?.includes('0 rows')) {
      return NextResponse.json({ error: 'Signal not found' }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
