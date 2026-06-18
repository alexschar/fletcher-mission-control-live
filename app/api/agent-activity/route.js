import { NextResponse } from 'next/server';
const { authMiddleware } = require('../../../lib/auth');

const ALLOWED_ACTION_TYPES = ['create', 'update', 'delete', 'execute', 'analyze', 'verify', 'deploy', 'other'];
const ALLOWED_ACTION_STATUSES = ['pending', 'completed', 'failed'];
const ALLOWED_LEARNING_CATEGORIES = ['technical', 'process', 'preference', 'error', 'pattern'];

// Dynamic imports to avoid issues during static generation
async function getDb() {
  const {
    createAgentAction,
    getAgentActions,
    getAgentActionStats,
    createAgentLearning,
    getAgentLearnings,
    updateAgentLearning,
    incrementLearningAppliedCount,
    getAgentLearningStats
  } = await import('../../../lib/supabase.js');
  
  return {
    createAgentAction,
    getAgentActions,
    getAgentActionStats,
    createAgentLearning,
    getAgentLearnings,
    updateAgentLearning,
    incrementLearningAppliedCount,
    getAgentLearningStats
  };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    // Determine which resource to fetch
    const resource = searchParams.get('resource') || 'actions';

    // Stats endpoint
    if (searchParams.get('stats') === 'true') {
      const db = await getDb();
      if (resource === 'learnings') {
        const stats = await db.getAgentLearningStats();
        return NextResponse.json(stats);
      }
      const period = searchParams.get('period') || 'week';
      const stats = await db.getAgentActionStats(period);
      return NextResponse.json(stats);
    }

    const db = await getDb();

    if (resource === 'learnings') {
      const filters = {};
      if (searchParams.get('agent')) filters.agent = searchParams.get('agent');
      if (searchParams.get('category')) filters.category = searchParams.get('category');
      if (searchParams.get('verified')) filters.verified = searchParams.get('verified');
      if (searchParams.get('search')) filters.search = searchParams.get('search');
      if (searchParams.get('limit')) filters.limit = searchParams.get('limit');

      const learnings = await db.getAgentLearnings(filters);
      return NextResponse.json(learnings);
    }

    // Default: actions
    const filters = {};
    if (searchParams.get('agent')) filters.agent = searchParams.get('agent');
    if (searchParams.get('action_type')) filters.action_type = searchParams.get('action_type');
    if (searchParams.get('status')) filters.status = searchParams.get('status');
    if (searchParams.get('target')) filters.target = searchParams.get('target');
    if (searchParams.get('since')) filters.since = searchParams.get('since');
    if (searchParams.get('limit')) filters.limit = searchParams.get('limit');

    const actions = await db.getAgentActions(filters);
    return NextResponse.json(actions);
  } catch (error) {
    console.error('[agent-activity GET]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const authError = authMiddleware(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const resource = body.resource || 'action';
    const db = await getDb();

    if (resource === 'learning') {
      // Validate required fields (title maps to content in DB schema)
      if (!body.agent || !body.category || !body.content) {
        return NextResponse.json(
          { error: 'Missing required fields: agent, category, content' },
          { status: 400 }
        );
      }

      if (!ALLOWED_LEARNING_CATEGORIES.includes(body.category)) {
        return NextResponse.json(
          { error: `Invalid category. Allowed: ${ALLOWED_LEARNING_CATEGORIES.join(', ')}` },
          { status: 400 }
        );
      }

      const learning = await db.createAgentLearning(body);
      return NextResponse.json(learning, { status: 201 });
    }

    // Default: action
    if (!body.agent || !body.action_type) {
      return NextResponse.json(
        { error: 'Missing required fields: agent, action_type' },
        { status: 400 }
      );
    }

    if (!ALLOWED_ACTION_TYPES.includes(body.action_type)) {
      return NextResponse.json(
        { error: `Invalid action_type. Allowed: ${ALLOWED_ACTION_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    if (body.status && !ALLOWED_ACTION_STATUSES.includes(body.status)) {
      return NextResponse.json(
        { error: `Invalid status. Allowed: ${ALLOWED_ACTION_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    const action = await db.createAgentAction(body);
    return NextResponse.json(action, { status: 201 });
  } catch (error) {
    console.error('[agent-activity POST]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  const authError = authMiddleware(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { id, resource, ...updates } = body;
    const db = await getDb();

    if (!id) {
      return NextResponse.json({ error: 'Missing required field: id' }, { status: 400 });
    }

    if (resource === 'learning') {
      const learning = await db.updateAgentLearning(id, updates);
      return NextResponse.json(learning);
    }

    if (updates.increment_applied) {
      const learning = await db.incrementLearningAppliedCount(id);
      return NextResponse.json(learning);
    }

    return NextResponse.json({ error: 'Invalid resource type' }, { status: 400 });
  } catch (error) {
    console.error('[agent-activity PATCH]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
