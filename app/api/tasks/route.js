import { NextResponse } from 'next/server';
const { getTasks, createTask, updateTask, deleteTask } = require('../../../lib/supabase');

export async function GET() {
  try {
    const tasks = await getTasks();
    return NextResponse.json(tasks);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    
    if (body.action === 'update') {
      const updated = await updateTask(body.id, body.updates);
      return NextResponse.json(updated);
    }
    
    if (body.action === 'delete') {
      await deleteTask(body.id);
      return NextResponse.json({ ok: true });
    }
    
    // Default: create a new task
    const task = await createTask({
      title: body.title,
      description: body.description,
      status: body.status || 'backlog',
      assigned_to: body.assigned_to,
      created_by: body.created_by,
      priority: body.priority || 'medium'
    });
    
    return NextResponse.json(task);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
