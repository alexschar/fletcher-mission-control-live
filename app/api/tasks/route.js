import { NextResponse } from 'next/server';
const { getTasks, addTask, updateTask, deleteTask } = require('../../../lib/store');

export async function GET() {
  return NextResponse.json(getTasks());
}

export async function POST(request) {
  const body = await request.json();
  if (body.action === 'update') {
    return NextResponse.json(updateTask(body.id, body.updates));
  }
  if (body.action === 'delete') {
    return NextResponse.json(deleteTask(body.id));
  }
  return NextResponse.json(addTask(body));
}
