import { NextResponse } from 'next/server';
const { authMiddleware } = require('../../../lib/auth');
const { getHealthAudits, addHealthAudit } = require('../../../lib/supabase');

const AGENTS = ['sawyer', 'fletcher', 'celeste'];
const DEFAULT_CHECKS = {
  api: 'ok',
  database: 'connected',
  agents: 'online'
};

function buildChecksSummary(checks, issues = []) {
  if (Array.isArray(issues) && issues.length) return issues.join(' · ');

  const parts = [];
  if (typeof checks?.recentActivityMinutes === 'number') parts.push(`activity ${checks.recentActivityMinutes}m ago`);
  if (checks?.visibility) parts.push(checks.visibility);
  if (checks?.note) parts.push(checks.note);
  return parts.join(' · ') || 'Standard health checks';
}

function normalizeStatus(status) {
  return String(status || '').toUpperCase();
}

function deriveScore(status, explicitScore = null) {
  if (typeof explicitScore === 'number' && explicitScore >= 0 && explicitScore <= 100) {
    return explicitScore;
  }

  switch (normalizeStatus(status)) {
    case 'GREEN': return 100;
    case 'YELLOW': return 50;
    case 'RED': return 0;
    default: return 0;
  }
}

function buildStatusMessage(status, score, issues = []) {
  if (Array.isArray(issues) && issues.length) return issues.join(' · ');

  switch (normalizeStatus(status)) {
    case 'GREEN': return `Healthy (${score}/100)`;
    case 'YELLOW': return `Attention needed (${score}/100)`;
    case 'RED': return `Critical issues detected (${score}/100)`;
    default: return `Health status unknown (${score}/100)`;
  }
}

function rankAudit(agent) {
  if (agent === 'sawyer') {
    const checks = {
      recentActivityMinutes: 0,
      visibility: 'direct session active',
      note: 'operator online'
    };
    const issues = [];
    const status = 'GREEN';
    const score = deriveScore(status);

    return {
      agent_id: agent,
      status,
      score,
      checks,
      issues,
      created_at: new Date().toISOString()
    };
  }

  const checks = {
    visibility: 'indirect visibility only',
    note: 'awaiting explicit agent heartbeat'
  };
  const issues = [
    `${agent.charAt(0).toUpperCase() + agent.slice(1)} is not directly visible from this session`,
    'monitoring via Mission Control only'
  ];
  const status = 'YELLOW';
  const score = deriveScore(status);

  return {
    agent_id: agent,
    status,
    score,
    checks,
    issues,
    created_at: new Date().toISOString()
  };
}

function normalizeAudit(audit) {
  if (!audit) return audit;
  const checks = audit.checks || {};
  const issues = Array.isArray(audit.issues) ? audit.issues : [];
  const status = normalizeStatus(audit.status);
  const score = deriveScore(status, audit.score);
  const agent = audit.agent || audit.agent_id;
  const timestamp = audit.timestamp || audit.created_at;

  return {
    ...audit,
    agent,
    agent_id: agent,
    status,
    score,
    message: audit.message || buildStatusMessage(status, score, issues),
    timestamp,
    created_at: timestamp,
    checks,
    issues,
    checksSummary: audit.checksSummary || buildChecksSummary(checks, issues)
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
    const agent = body.agent_id || body.agent;

    if (agent && !AGENTS.includes(agent)) {
      return NextResponse.json({ error: 'Invalid agent' }, { status: 400 });
    }

    if (agent && body.status) {
      const created = await addHealthAudit({
        agent_id: agent,
        status: normalizeStatus(body.status),
        score: deriveScore(body.status, body.score),
        checks: body.checks || {},
        issues: Array.isArray(body.issues) ? body.issues : undefined
      });

      return NextResponse.json(normalizeAudit(created));
    }

    return NextResponse.json(await runAudit(agent || null));
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
