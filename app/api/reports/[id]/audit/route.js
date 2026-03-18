import { NextResponse } from 'next/server';
const { authMiddleware } = require('../../../../../lib/auth');
const { requireActor, canViewAudit, canCreateAudit, getActorFromRequest } = require('../../../../../lib/access');
const { getAuditByReportId, upsertAudit } = require('../../../../../lib/supabase');

export async function GET(request, { params }) {
  const authError = authMiddleware(request);
  if (authError) return authError;

  try {
    const actor = requireActor(request, ['alex', 'fletcher', 'sawyer']);
    const { id } = await params;
    const audit = await getAuditByReportId(id);

    if (actor === 'sawyer') {
      return NextResponse.json(audit ? { suggestions_per_agent: audit.suggestions_per_agent } : null);
    }

    if (!canViewAudit(actor)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(audit || null);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
}

export async function POST(request, { params }) {
  const authError = authMiddleware(request);
  if (authError) return authError;

  try {
    const actor = getActorFromRequest(request);
    if (!canCreateAudit(actor)) {
      return NextResponse.json({ error: 'Only Fletcher can create audits' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const audit = await upsertAudit({
      report_id: id,
      audit_content: body.audit_content || '',
      suggestions_for_team: body.suggestions_for_team || '',
      suggestions_per_agent: body.suggestions_per_agent || '',
      rules_compliance: body.rules_compliance || '',
      scope_assessment: body.scope_assessment || '',
      performance_assessment: body.performance_assessment || '',
      created_by: actor,
    });

    return NextResponse.json(audit, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
}
