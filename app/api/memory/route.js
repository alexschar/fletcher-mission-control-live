import { NextResponse } from 'next/server';
const { getMemoryFiles } = require('../../../lib/store');

export async function GET() {
  return NextResponse.json(getMemoryFiles());
}
