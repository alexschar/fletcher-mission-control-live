import { NextResponse } from 'next/server';
const { authMiddleware } = require('../../../../../lib/auth');
const { requireActor } = require('../../../../../lib/access');
const { addReportAddendum, getReportById } = require('../../../../../lib/supabase');

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

    return NextResponse.json(Array.isArray(report.addendums) ? report.addendums : []);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
}

export async function POST(request, { params }) {
  const authError = authMiddleware(request);
  if (authError) return authError;

  try {
    const actor = requireActor(request, ['alex', 'fletcher', 'sawyer']);
    const { id } = await params;
    const body = await request.json();

    if (!body.content?.trim()) {
      return NextResponse.json({ error: 'Addendum content is required' }, { status: 400 });
    }

    const addendum = await addReportAddendum({
      report_id: id,
      content: body.content.trim(),
      created_by: actor,
    });

    return NextResponse.json(addendum, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
}
