import { NextResponse } from 'next/server';
const { getMemoryFiles } = require('../../../lib/store');
const { authMiddleware } = require('../../../lib/auth');

export async function GET(request) {
  const authError = authMiddleware(request);
  if (authError) return authError;
  
  return NextResponse.json(getMemoryFiles());
}
