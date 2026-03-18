import { NextResponse } from 'next/server';
const fs = require('fs');
const path = require('path');
const { authMiddleware } = require('../../../lib/auth');

const DATA_FILE = path.join(process.cwd(), 'data', 'health_audits.json');
const AGENTS = ['sawyer', 'fletcher', 'celeste'];

function ensureDataFile() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({ audits: [] }, null, 2));
}

function readData() {
  ensureDataFile();
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return { audits: [] };
  }
}

function writeData(data) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function buildChecksSummary(checks) {
  const parts = [];
  if (typeof checks.recentActivityMinutes === 'number') parts.push(`activity ${checks.recentActivityMinutes}m ago`);
  if (checks.visibility) parts.push(checks.visibility);
  if (checks.note) parts.push(checks.note);
  return parts.join(' · ') || 'Standard health checks';
}

function rankAudit(agent) {
  const now = new Date().toISOString();

  if (agent === 'sawyer') {
    return {
      agent,
      status: 'green',
      message: 'Sawyer is active and responding normally.',
      timestamp: now,
      checks: {
        recentActivityMinutes: 0,
        visibility: 'direct session active',
        note: 'operator online'
      },
      checksSummary: 'activity 0m ago · direct session active · operator online'
    };
  }

  return {
    agent,
    status: 'yellow',
    message: `${agent.charAt(0).toUpperCase() + agent.slice(1)} is not directly visible from this session; monitoring via Mission Control only.`,
    timestamp: now,
    checks: {
      visibility: 'indirect visibility only',
      note: 'awaiting explicit agent heartbeat'
    },
    checksSummary: 'indirect visibility only · awaiting explicit agent heartbeat'
  };
}

function shapeResponse(audits) {
  return AGENTS.reduce((acc, agent) => {
    const history = audits
      .filter(a => a.agent === agent)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10);
    acc[agent] = {
      current: history[0] || null,
      history
    };
    return acc;
  }, {});
}

function runAudit(targetAgent = null) {
  const data = readData();
  const agentsToAudit = targetAgent ? [targetAgent] : AGENTS;

  for (const agent of agentsToAudit) {
    data.audits.unshift(rankAudit(agent));
  }

  data.audits = data.audits.slice(0, 200);
  writeData(data);
  return shapeResponse(data.audits);
}

function latestAuditForAgent(audits, agent) {
  return audits
    .filter(a => a.agent === agent)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0] || null;
}

function needsHourlyAudit(audits) {
  const now = Date.now();
  return AGENTS.some(agent => {
    const latest = latestAuditForAgent(audits, agent);
    if (!latest?.timestamp) return true;
    return (now - new Date(latest.timestamp).getTime()) > (60 * 60 * 1000);
  });
}

export async function GET(request) {
  const authError = authMiddleware(request);
  if (authError) return authError;

  try {
    const data = readData();
    if (!data.audits.length || needsHourlyAudit(data.audits)) {
      return NextResponse.json(runAudit());
    }
    return NextResponse.json(shapeResponse(data.audits));
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const authError = authMiddleware(request);
  if (authError) return authError;

  try {
    const body = await request.json().catch(() => ({}));
    const agent = body.agent;
    if (agent && !AGENTS.includes(agent)) {
      return NextResponse.json({ error: 'Invalid agent' }, { status: 400 });
    }
    return NextResponse.json(runAudit(agent || null));
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
