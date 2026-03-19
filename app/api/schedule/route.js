import { NextResponse } from 'next/server';
const { getSchedule, addScheduleItem, updateScheduleItem } = require('../../../lib/store');
const { authMiddleware } = require('../../../lib/auth');

export async function GET(request) {
  const authError = authMiddleware(request);
  if (authError) return authError;

  try {
    return NextResponse.json(getSchedule());
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Failed to load schedule' }, { status: 500 });
  }
}

export async function POST(request) {
  const authError = authMiddleware(request);
  if (authError) return authError;

  try {
    const body = await request.json();

    if (body.action === 'update') {
      return NextResponse.json(updateScheduleItem(body.id, body.updates));
    }

    return NextResponse.json(addScheduleItem(body), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Failed to update schedule' }, { status: 500 });
  }
}
