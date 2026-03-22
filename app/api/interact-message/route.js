import { NextResponse } from 'next/server';
import { withAuth } from '../../../lib/auth';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const TARGETS = {
  fletcher: {
    agentId: 'main',
    fallbackSessionId: 'e41a3a9a-9b2c-4883-911a-f5fd6ca42150',
    label: 'Fletcher',
  },
  sawyer: {
    agentId: 'sawyer',
    fallbackSessionId: '1481bb59-3e45-4650-a2f0-ea51b8dacea2',
    label: 'Sawyer',
  },
};

async function resolveSessionId(agentId, fallbackSessionId) {
  try {
    const { stdout } = await execFileAsync('openclaw', ['sessions', '--all-agents', '--json'], {
      cwd: process.cwd(),
      timeout: 15000,
      maxBuffer: 1024 * 1024,
    });
    const payload = JSON.parse(stdout || '{}');
    const sessions = Array.isArray(payload.sessions) ? payload.sessions : [];
    const match = sessions
      .filter((session) => session.agentId === agentId)
      .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))[0];
    return match?.sessionId || fallbackSessionId;
  } catch {
    return fallbackSessionId;
  }
}

async function handler(request) {
  try {
    const body = await request.json();
    const targetAgent = String(body.targetAgent || '').toLowerCase();
    const config = TARGETS[targetAgent];

    if (!config) {
      return NextResponse.json({ error: 'Invalid target agent' }, { status: 400 });
    }

    const selected = body.selected || {};
    const question = String(body.question || '').trim();
    if (!question) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    const elementType = selected.type || 'element';
    const elementTitle = selected.title || 'Untitled element';
    const details = [selected.details, selected.page].filter(Boolean).join(' | ');
    const message = `Alex selected [${elementType}: ${elementTitle}${details ? ` — ${details}` : ''}] and asks: ${question}`;
    const sessionId = await resolveSessionId(config.agentId, config.fallbackSessionId);

    const result = await execFileAsync('openclaw', [
      'agent',
      '--agent', config.agentId,
      '--session-id', sessionId,
      '--message', message,
      '--thinking', 'low',
      '--json',
    ], {
      cwd: process.cwd(),
      timeout: 45000,
      maxBuffer: 1024 * 1024,
    });

    let parsed = null;
    try {
      parsed = JSON.parse(result.stdout || '{}');
    } catch {
      parsed = { raw: result.stdout || '' };
    }

    return NextResponse.json({
      ok: true,
      targetAgent,
      targetLabel: config.label,
      sessionId,
      message,
      result: parsed,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Failed to send interact message' }, { status: 500 });
  }
}

export const POST = withAuth(handler);
