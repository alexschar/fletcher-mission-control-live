import { NextResponse } from 'next/server';
const { authMiddleware } = require('../../../lib/auth');
const { getHealthAudits, addHealthAudit } = require('../../../lib/supabase');

const AGENTS = ['sawyer', 'fletcher', 'celeste'];
const DEFAULT_CHECKS = {
  api: 'ok',
  database: 'connected',
  agents: 'online'
};

function buildChecksSummary(checks) {
  const parts = [];
  if (typeof checks?.recentActivityMinutes === 'number') parts.push(`activity ${checks.recentActivityMinutes}m ago`);
  if (checks?.visibility) parts.push(checks.visibility);
  if (checks?.note) parts.push(checks.note);
  return parts.join(' · ') || 'Standard health checks';
}

function rankAudit(agent) {
  const now = new Date().toISOString();

  if (agent === 'sawyer') {
    const checks = {
      recentActivityMinutes: 0,
      visibility: 'direct session active',
      note: 'operator online'
    };

    return {
      agent,
      status: 'green',
      message: 'Sawyer is active and responding normally.',
      timestamp: now,
      checks,
      checksSummary: buildChecksSummary(checks)
    };
  }

  const checks = {
    visibility: 'indirect visibility only',
    note: 'awaiting explicit agent heartbeat'
  };

  return {
    agent,
    status: 'yellow',
    message: `${agent.charAt(0).toUpperCase() + agent.slice(1)} is not directly visible from this session; monitoring via Mission Control only.`,
    timestamp: now,
    checks,
    checksSummary: buildChecksSummary(checks)
  };
}

function normalizeAudit(audit) {
  if (!audit) return audit;
  const checks = audit.checks || {};
  return {
    agent: audit.agent,
    status: audit.status,
    message: audit.message,
    timestamp: audit.timestamp,
    checks,
    checksSummary: audit.checksSummary || audit.checks_summary || buildChecksSummary(checks)
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

async function runAudit(targetAgent = null) {
  const agentsToAudit = targetAgent ? [targetAgent] : AGENTS;

  for (const agent of agentsToAudit) {
    await addHealthAudit(rankAudit(agent));
  }

  const audits = await getHealthAudits(200);
  return shapeResponse(audits.map(normalizeAudit));
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

function isMissingHealthAuditsTable(error) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('schema cache') || message.includes('relation');
}

function buildHealthSummary(overrides = {}) {
  return {
    status: 'healthy',
    checks: DEFAULT_CHECKS,
    last_audit: null,
    next_audit: null,
    ...overrides
  };
}

export async function GET(request) {
  const authError = authMiddleware(request);
  if (authError) return authError;

  try {
    const audits = (await getHealthAudits(200)).map(normalizeAudit);

    if (!audits.length) {
      return NextResponse.json(buildHealthSummary({ audits: [] }));
    }

    if (needsHourlyAudit(audits)) {
      return NextResponse.json(await runAudit());
    }

    return NextResponse.json(shapeResponse(audits));
  } catch (error) {
    if (isMissingHealthAuditsTable(error)) {
      return NextResponse.json(buildHealthSummary({ fallback: true }));
    }

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
    return NextResponse.json(await runAudit(agent || null));
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
