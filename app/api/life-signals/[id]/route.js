import { NextResponse } from 'next/server';
const {
  getLifeSignalById,
  updateLifeSignal,
} = require('../../../../lib/supabase');

const ALLOWED_STATUSES = ['unread', 'read', 'acted_on', 'dismissed'];
const ALLOWED_PRIORITIES = ['urgent', 'high', 'normal', 'low', 'dismissed'];
const ALLOWED_FEEDBACK = ['useful', 'not_useful', 'wrong', 'spam', 'important'];

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const signal = await getLifeSignalById(id);

    if (!signal) {
      return NextResponse.json({ error: 'Signal not found' }, { status: 404 });
    }

    return NextResponse.json(signal);
  } catch (error) {
    console.error('[life-signals GET by id]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate status if provided
    if (body.status && !ALLOWED_STATUSES.includes(body.status)) {
      return NextResponse.json(
        { error: `Invalid status. Allowed: ${ALLOWED_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate priority if provided
    if (body.priority && !ALLOWED_PRIORITIES.includes(body.priority)) {
      return NextResponse.json(
        { error: `Invalid priority. Allowed: ${ALLOWED_PRIORITIES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate feedback if provided
    if (body.feedback && !ALLOWED_FEEDBACK.includes(body.feedback)) {
      return NextResponse.json(
        { error: `Invalid feedback. Allowed: ${ALLOWED_FEEDBACK.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate agent_notes is object/null if provided
    if ('agent_notes' in body && body.agent_notes !== null && typeof body.agent_notes !== 'object') {
      return NextResponse.json(
        { error: 'agent_notes must be a JSON object or null' },
        { status: 400 }
      );
    }

    const signal = await updateLifeSignal(id, body);
    return NextResponse.json(signal);
  } catch (error) {
    console.error('[life-signals PATCH]', error);
    if (error.message?.includes('0 rows')) {
      return NextResponse.json({ error: 'Signal not found' }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
