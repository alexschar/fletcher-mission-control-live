import { NextResponse } from 'next/server';
const { authMiddleware } = require('../../../../lib/auth');
const supabaseProjects = require('../../../../lib/supabase');
const jsonProjects = require('../../../../lib/jsonFallback');

function isMissingTableError(error) {
  return error?.code === '42P01'
    || error?.code === 'PGRST205'
    || error?.message?.includes('does not exist')
    || error?.message?.includes('schema cache')
    || error?.message?.includes("Could not find the table 'public.project_status'");
}

export async function PATCH(request, context) {
  const authError = authMiddleware(request);
  if (authError) return authError;

  try {
    const params = await context.params;
    const body = await request.json();
    const last_update = typeof body.last_update === 'string' ? body.last_update.trim() : '';
    const updated_by = typeof body.updated_by === 'string' ? body.updated_by.trim() : '';

    if (!params?.id) {
      return NextResponse.json({ error: 'Project id is required' }, { status: 400 });
    }

    if (!last_update) {
      return NextResponse.json({ error: 'last_update is required' }, { status: 400 });
    }

    if (!updated_by) {
      return NextResponse.json({ error: 'updated_by is required' }, { status: 400 });
    }

    try {
      const project = await supabaseProjects.updateProjectStatusById(params.id, { last_update, updated_by });
      return NextResponse.json(project);
    } catch (error) {
      if (!isMissingTableError(error)) throw error;
      await jsonProjects.ensureProjectStatusSeeded();
      const project = await jsonProjects.updateProjectStatusById(params.id, { last_update, updated_by });
      return NextResponse.json(project);
    }
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json({ error: error.message || 'Failed to update project' }, { status });
  }
}
