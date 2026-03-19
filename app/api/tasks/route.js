import { NextResponse } from 'next/server';
const db = require('../../../lib/database');
const { authMiddleware } = require('../../../lib/auth');

export async function GET(request) {
  const authError = authMiddleware(request);
  if (authError) return authError;
  
  try {
    const tasks = await db.getTasks();
    return NextResponse.json(tasks);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const authError = authMiddleware(request);
  if (authError) return authError;
  
  try {
    const body = await request.json();
    
    if (body.action === 'update') {
      await db.updateTask(body.id, body.updates);
      return NextResponse.json(await db.getTasks());
    }
    
    if (body.action === 'delete') {
      await db.deleteTask(body.id);
      return NextResponse.json(await db.getTasks());
    }
    
    // Default: create a new task
    await db.createTask({
      title: body.title,
      description: body.description,
      status: body.status || 'backlog',
      assigned_to: body.assigned_to,
      created_by: body.created_by,
      priority: body.priority || 'medium'
    });
    
    return NextResponse.json(await db.getTasks(), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
