import { NextResponse } from 'next/server';
const { getCostSummary, addCost } = require('../../../lib/store');

export async function GET() {
  return NextResponse.json(getCostSummary());
}

export async function POST(request) {
  const body = await request.json();
  addCost(body);
  return NextResponse.json({ ok: true });
}
