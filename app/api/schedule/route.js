import { NextResponse } from 'next/server';
const { getSchedule, addScheduleItem, updateScheduleItem } = require('../../../lib/store');

export async function GET() {
  return NextResponse.json(getSchedule());
}

export async function POST(request) {
  const body = await request.json();
  if (body.action === 'update') {
    return NextResponse.json(updateScheduleItem(body.id, body.updates));
  }
  return NextResponse.json(addScheduleItem(body));
}
