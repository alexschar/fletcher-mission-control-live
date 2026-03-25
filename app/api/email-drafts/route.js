import { NextResponse } from 'next/server';
const { authMiddleware } = require('../../../lib/auth');
const { getLifeSignals, getLifeSignalById, updateLifeSignal } = require('../../../lib/supabase');

// GET /api/email-drafts — list signals that have drafts
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // unread, read, acted_on
    const limit = searchParams.get('limit') || '50';

    // Get email/sponsorship signals that have drafts
    const filters = { limit };
    if (status) filters.status = status;

    const allSignals = await getLifeSignals(filters);
    const emailDrafts = allSignals.filter(
      (s) => (s.category === 'email' || s.category === 'sponsorship') && s.agent_draft
    );

    return NextResponse.json(emailDrafts);
  } catch (error) {
    console.error('[email-drafts GET]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/email-drafts — create/update a draft on a signal
// Body: { signal_id: uuid, draft: "text" }
export async function POST(request) {
  const authError = authMiddleware(request);
  if (authError) return authError;

  try {
    const body = await request.json();

    if (!body.signal_id || !body.draft) {
      return NextResponse.json(
        { error: 'Missing required fields: signal_id, draft' },
        { status: 400 }
      );
    }

    const signal = await getLifeSignalById(body.signal_id);
    if (!signal) {
      return NextResponse.json({ error: 'Signal not found' }, { status: 404 });
    }

    if (signal.category !== 'email' && signal.category !== 'sponsorship') {
      return NextResponse.json(
        { error: 'Drafts are only supported for email and sponsorship signals' },
        { status: 400 }
      );
    }

    const updated = await updateLifeSignal(body.signal_id, {
      agent_draft: body.draft,
      agent_notes: body.agent_notes || signal.agent_notes,
    });

    return NextResponse.json(updated, { status: 201 });
  } catch (error) {
    console.error('[email-drafts POST]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
