import { NextResponse } from 'next/server';
const { authMiddleware } = require('../../../lib/auth');
const supabaseProjects = require('../../../lib/supabase');
const jsonProjects = require('../../../lib/jsonFallback');

function isMissingTableError(error) {
  return error?.code === '42P01'
    || error?.code === 'PGRST205'
    || error?.message?.includes('does not exist')
    || error?.message?.includes('schema cache')
    || error?.message?.includes("Could not find the table 'public.project_status'");
}

export async function GET(request) {
  const authError = authMiddleware(request);
  if (authError) return authError;

  try {
    try {
      await supabaseProjects.ensureProjectStatusSeeded();
      const projects = await supabaseProjects.getProjectStatuses();
      return NextResponse.json(projects);
    } catch (error) {
      if (!isMissingTableError(error)) throw error;
      await jsonProjects.ensureProjectStatusSeeded();
      const projects = await jsonProjects.getProjectStatuses();
      return NextResponse.json(projects);
    }
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Failed to load projects' }, { status: 500 });
  }
}
