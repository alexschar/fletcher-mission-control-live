import Link from 'next/link';
const { getAllAgentStatuses } = require('../../lib/store');

export const dynamic = 'force-dynamic';

export default async function AgentsPage() {
  const agents = await getAllAgentStatuses();
  const loading = false;
  const lastUpdate = new Date().toISOString();

  const getStatusColor = (status) => {
    switch (status) {
      case 'working': return '#fd7e14';
      case 'idle': return '#238636';
      case 'error': return '#f85149';
      case 'offline': return '#8b949e';
      default: return '#8b949e';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'working': return '🔥';
      case 'idle': return '💤';
      case 'error': return '⚠️';
      case 'offline': return '🔌';
      default: return '❓';
    }
  };

  const formatLastSeen = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div>
      <div className="page-header">
        <h1>Agent Status</h1>
        <p>Real-time status monitoring for all agents</p>
        {lastUpdate && (
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
            Last updated: {new Date(lastUpdate).toLocaleTimeString()}
          </p>
        )}
      </div>

      {loading ? (
        <div className="empty">Loading agent status...</div>
      ) : (
        <div className="grid-1">
          {Object.values(agents).map((agent) => (
            <div key={agent.id} className="card agent-card">
              <div className="agent-header">
                <div className="agent-info">
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '24px' }}>{getStatusIcon(agent.status)}</span>
                    {agent.name}
                  </h3>
                  <p className="agent-role">{agent.role}</p>
                </div>
                <div className="agent-status">
                  <span
                    className="status-indicator"
                    style={{
                      backgroundColor: getStatusColor(agent.status),
                      display: 'inline-block',
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      marginRight: '8px'
                    }}
                  ></span>
                  <span style={{ textTransform: 'capitalize', fontWeight: '500' }}>
                    {agent.status}
                  </span>
                </div>
              </div>

              <div className="agent-details">
                <div className="detail-row">
                  <span className="detail-label">Current Task:</span>
                  <span className="detail-value">
                    {agent.currentTask || 'No active task'}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Model:</span>
                  <span className="detail-value" style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                    {agent.model || 'Unknown'}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Last Seen:</span>
                  <span className="detail-value">
                    {formatLastSeen(agent.lastSeen)}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Agent ID:</span>
                  <span className="detail-value" style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                    {agent.id}
                  </span>
                </div>
              </div>
              <div style={{ marginTop: '16px' }}>
                <Link className="btn btn-sm" href={`/agents/${agent.id}/activity`}>View activity timeline</Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header">System Overview</div>
        <div className="metric-grid">
          <div className="metric">
            <div className="metric-value">
              {Object.values(agents).filter(a => a.status === 'working').length}
            </div>
            <div className="metric-label">Active</div>
          </div>
          <div className="metric">
            <div className="metric-value">
              {Object.values(agents).filter(a => a.status === 'idle').length}
            </div>
            <div className="metric-label">Idle</div>
          </div>
          <div className="metric">
            <div className="metric-value">
              {Object.values(agents).filter(a => a.status === 'error').length}
            </div>
            <div className="metric-label">Errors</div>
          </div>
          <div className="metric">
            <div className="metric-value">
              {Object.keys(agents).length}
            </div>
            <div className="metric-label">Total Agents</div>
          </div>
        </div>
      </div>
    </div>
  );
}
