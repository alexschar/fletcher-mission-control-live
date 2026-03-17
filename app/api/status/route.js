import { NextResponse } from 'next/server';
const { getStatus, updateStatus } = require('../../../lib/store');

export async function GET() {
  return NextResponse.json(getStatus());
}

export async function POST(request) {
  const body = await request.json();
  const updated = updateStatus(body);
  return NextResponse.json(updated);
}
