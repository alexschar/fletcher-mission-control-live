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
      const updatedTasks = await db.updateTask(body.id, body.updates);
      return NextResponse.json(updatedTasks);
    }
    
    if (body.action === 'delete') {
      const remainingTasks = await db.deleteTask(body.id);
      return NextResponse.json(remainingTasks);
    }
    
    // Default: create a new task
    const createdTasks = await db.createTask({
      title: body.title,
      description: body.description,
      status: body.status || 'backlog',
      assigned_to: body.assigned_to,
      created_by: body.created_by,
      priority: body.priority || 'medium'
    });
    
    return NextResponse.json(createdTasks, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
