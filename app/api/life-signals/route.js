import { NextResponse } from 'next/server';
const { authMiddleware } = require('../../../lib/auth');
const {
  createLifeSignal,
  getLifeSignals,
  getLifeSignalStats,
} = require('../../../lib/supabase');

const ALLOWED_CATEGORIES = ['email', 'sponsorship', 'social', 'shopping', 'calendar', 'finance', 'system', 'creative'];
const ALLOWED_PRIORITIES = ['urgent', 'high', 'normal', 'low', 'dismissed'];
const ALLOWED_STATUSES = ['unread', 'read', 'acted_on', 'dismissed'];

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    // Stats endpoint: GET /api/life-signals?stats=true
    if (searchParams.get('stats') === 'true') {
      const stats = await getLifeSignalStats();
      return NextResponse.json(stats);
    }

    const filters = {};
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const source = searchParams.get('source');
    const priority = searchParams.get('priority');
    const limit = searchParams.get('limit');
    const since = searchParams.get('since');
    const hasFeedback = searchParams.get('has_feedback');

    if (status) {
      if (!ALLOWED_STATUSES.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Allowed: ${ALLOWED_STATUSES.join(', ')}` },
          { status: 400 }
        );
      }
      filters.status = status;
    }

    if (category) {
      if (!ALLOWED_CATEGORIES.includes(category)) {
        return NextResponse.json(
          { error: `Invalid category. Allowed: ${ALLOWED_CATEGORIES.join(', ')}` },
          { status: 400 }
        );
      }
      filters.category = category;
    }

    if (source) filters.source = source;
    if (priority) filters.priority = priority;
    if (limit) filters.limit = limit;
    if (hasFeedback) filters.has_feedback = hasFeedback;

    if (since) {
      const date = new Date(since);
      if (isNaN(date.getTime())) {
        return NextResponse.json({ error: 'Invalid since date' }, { status: 400 });
      }
      filters.since = date.toISOString();
    }

    const signals = await getLifeSignals(filters);
    return NextResponse.json(signals);
  } catch (error) {
    console.error('[life-signals GET]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const authError = authMiddleware(request);
  if (authError) return authError;

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.source || !body.category || !body.signal_type || !body.title) {
      return NextResponse.json(
        { error: 'Missing required fields: source, category, signal_type, title' },
        { status: 400 }
      );
    }

    if (!ALLOWED_CATEGORIES.includes(body.category)) {
      return NextResponse.json(
        { error: `Invalid category. Allowed: ${ALLOWED_CATEGORIES.join(', ')}` },
        { status: 400 }
      );
    }

    if (body.priority && !ALLOWED_PRIORITIES.includes(body.priority)) {
      return NextResponse.json(
        { error: `Invalid priority. Allowed: ${ALLOWED_PRIORITIES.join(', ')}` },
        { status: 400 }
      );
    }

    const signal = await createLifeSignal(body);
    return NextResponse.json(signal, { status: 201 });
  } catch (error) {
    console.error('[life-signals POST]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
