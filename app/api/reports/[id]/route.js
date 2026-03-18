import { NextResponse } from 'next/server';
const { authMiddleware } = require('../../../../lib/auth');
const { requireActor } = require('../../../../lib/access');
const { getReportById, updateDraftReport, submitReport } = require('../../../../lib/supabase');

export async function GET(request, { params }) {
  const authError = authMiddleware(request);
  if (authError) return authError;

  try {
    requireActor(request, ['alex', 'fletcher', 'sawyer']);
    const { id } = await params;
    const report = await getReportById(id);

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
}

export async function PUT(request, { params }) {
  const authError = authMiddleware(request);
  if (authError) return authError;

  try {
    const actor = requireActor(request, ['alex', 'fletcher', 'sawyer']);
    const { id } = await params;
    const body = await request.json();

    const current = await getReportById(id);
    if (!current) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const report = body.action === 'submit'
      ? await submitReport(id, actor)
      : await updateDraftReport(id, body, actor);

    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
}
