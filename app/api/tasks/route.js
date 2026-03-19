import { NextResponse } from 'next/server';
const { getTasks, addTask, updateTask, deleteTask } = require('../../../lib/store');
const { authMiddleware } = require('../../../lib/auth');

export async function GET(request) {
  const authError = authMiddleware(request);
  if (authError) return authError;
  
  try {
    return NextResponse.json(getTasks());
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
      return NextResponse.json(updateTask(body.id, body.updates));
    }
    
    if (body.action === 'delete') {
      deleteTask(body.id);
      return NextResponse.json(getTasks());
    }
    
    return NextResponse.json(addTask({
      title: body.title,
      description: body.description,
      status: body.status || 'backlog',
      assigned_to: body.assigned_to,
      created_by: body.created_by,
      priority: body.priority || 'medium'
    }), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
