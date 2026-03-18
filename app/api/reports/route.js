import { NextResponse } from 'next/server';
const { authMiddleware } = require('../../../lib/auth');
const { requireActor } = require('../../../lib/access');
const { getReports, createReport } = require('../../../lib/supabase');

export async function GET(request) {
  const authError = authMiddleware(request);
  if (authError) return authError;

  try {
    requireActor(request, ['alex', 'fletcher', 'sawyer']);
    const reports = await getReports();
    return NextResponse.json(reports);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
}

export async function POST(request) {
  const authError = authMiddleware(request);
  if (authError) return authError;

  try {
    const actor = requireActor(request, ['alex', 'fletcher', 'sawyer']);
    const body = await request.json();

    if (!body.title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const report = await createReport({
      title: body.title.trim(),
      goal: body.goal || '',
      summary: body.summary || '',
      existing_state: body.existing_state || '',
      implemented_changes: body.implemented_changes || '',
      agent_assignments: body.agent_assignments || '',
      escalations: body.escalations || '',
      timeline: body.timeline || '',
      memories_added: body.memories_added || '',
      created_by: actor,
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
}
