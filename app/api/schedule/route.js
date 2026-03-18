import { NextResponse } from 'next/server';
const { getSchedule, addScheduleItem, updateScheduleItem } = require('../../../lib/store');
const { authMiddleware } = require('../../../lib/auth');

export async function GET(request) {
  const authError = authMiddleware(request);
  if (authError) return authError;
  
  return NextResponse.json(getSchedule());
}

export async function POST(request) {
  const authError = authMiddleware(request);
  if (authError) return authError;
  
  const body = await request.json();
  if (body.action === 'update') {
    return NextResponse.json(updateScheduleItem(body.id, body.updates));
  }
  return NextResponse.json(addScheduleItem(body));
}
