"use client";

import { useEffect, useMemo, useState } from "react";
import { getAuthHeaders, isAuthenticated, logout } from "../../lib/api-client";
import { useRouter } from "next/navigation";

const AGENTS = [
  { key: "sawyer", label: "Sawyer" },
  { key: "fletcher", label: "Fletcher" },
  { key: "celeste", label: "Celeste" },
];

const STATUS_META = {
  green: { label: "GREEN", color: "#238636" },
  yellow: { label: "YELLOW", color: "#fd7e14" },
  red: { label: "RED", color: "#f85149" },
  unknown: { label: "UNKNOWN", color: "#8b949e" },
};

function formatTimestamp(value) {
  if (!value) return "No audit recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid timestamp";
  return date.toLocaleString();
}

function AgentCard({ agent, current, history, onRunAudit, isRunning }) {
  const meta = STATUS_META[current?.status] || STATUS_META.unknown;

  return (
    <div className="card agent-card">
      <div className="agent-header">
        <div className="agent-info">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                display: 'inline-block',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: meta.color
              }}
            />
            {agent.label}
          </h3>
          <p className="agent-role">Hourly health audit</p>
        </div>
        <div className="agent-status">
          <span
            className="status-indicator"
            style={{
              backgroundColor: meta.color,
              display: 'inline-block',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              marginRight: '8px'
            }}
          />
          <span style={{ textTransform: 'uppercase', fontWeight: '600', color: meta.color }}>
            {meta.label}
          </span>
        </div>
      </div>

      <div className="agent-details">
        <div className="detail-row">
          <span className="detail-label">Status:</span>
          <span className="detail-value">{current?.message || 'No audit data available yet'}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Last Audit:</span>
          <span className="detail-value">{formatTimestamp(current?.timestamp)}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Checks:</span>
          <span className="detail-value">{current?.checksSummary || 'Standard health checks'}</span>
        </div>
      </div>

      <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Last {Math.min(history.length, 10)} audits
        </div>
        <button className="btn btn-primary" onClick={() => onRunAudit(agent.key)} disabled={isRunning}>
          {isRunning ? 'Running...' : 'Run Audit'}
        </button>
      </div>

      <div style={{ marginTop: '16px', display: 'grid', gap: '8px' }}>
        {history.length > 0 ? history.slice(0, 10).map((audit, index) => {
          const auditMeta = STATUS_META[audit.status] || STATUS_META.unknown;
          return (
            <div key={`${agent.key}-${index}-${audit.timestamp || index}`} style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 12px', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: auditMeta.color, textTransform: 'uppercase' }}>{auditMeta.label}</div>
                  <div style={{ marginTop: '4px', fontSize: '13px' }}>{audit.message}</div>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right' }}>{formatTimestamp(audit.timestamp)}</div>
              </div>
            </div>
          );
        }) : (
          <div className="empty">No audit history yet</div>
        )}
      </div>
    </div>
  );
}

export default function HealthPage() {
  const [healthData, setHealthData] = useState({});
  const [loading, setLoading] = useState(true);
  const [runningAgent, setRunningAgent] = useState(null);
  const router = useRouter();

  async function loadHealth() {
    try {
      const res = await fetch('/api/health', { headers: getAuthHeaders() });
      if (res.status === 401) {
        logout();
        router.push('/login');
        return;
      }
      const data = await res.json();
      setHealthData(data || {});
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadHealth();
  }, [router]);

  async function handleRunAudit(agent) {
    setRunningAgent(agent);
    try {
      const res = await fetch('/api/health', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ agent })
      });
      if (res.status === 401) {
        logout();
        router.push('/login');
        return;
      }
      const data = await res.json();
      setHealthData(data || {});
    } finally {
      setRunningAgent(null);
    }
  }

  const agentEntries = useMemo(() => AGENTS.map(agent => ({
    agent,
    current: healthData?.[agent.key]?.current || null,
    history: healthData?.[agent.key]?.history || []
  })), [healthData]);

  return (
    <div>
      <div className="page-header">
        <h1>Health</h1>
        <p>Hourly self-audits for Sawyer, Fletcher, and Celeste</p>
      </div>

      {loading ? (
        <div className="empty">Loading health audits...</div>
      ) : (
        <div className="grid-1">
          {agentEntries.map(({ agent, current, history }) => (
            <AgentCard
              key={agent.key}
              agent={agent}
              current={current}
              history={history}
              onRunAudit={handleRunAudit}
              isRunning={runningAgent === agent.key}
            />
          ))}
        </div>
      )}
    </div>
  );
}
