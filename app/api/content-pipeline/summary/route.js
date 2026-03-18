import { NextResponse } from 'next/server';
const { authMiddleware } = require('../../../../lib/auth');
const { getContentPipelineSummary } = require('../../../../lib/supabase');

export async function GET(request) {
  const authError = authMiddleware(request);
  if (authError) return authError;

  try {
    const summary = await getContentPipelineSummary();
    return NextResponse.json(summary);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
}
