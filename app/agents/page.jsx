"use client";
import { useState, useEffect } from "react";
import { getAuthHeaders, isAuthenticated, logout } from "../../lib/api-client";
import { useRouter } from "next/navigation";

export default function AgentsPage() {
  const [agents, setAgents] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const router = useRouter();

  const fetchAgentData = async () => {
    try {
      const response = await fetch("/api/agents", { headers: getAuthHeaders() });
      if (response.status === 401) {
        logout();
        router.push('/login');
        return;
      }
      const data = await response.json();
      setAgents(data);
      setLastUpdate(new Date().toISOString());
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch agent data:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    fetchAgentData();
    
    // Poll every 30 seconds for cost-effective real-time updates
    const interval = setInterval(fetchAgentData, 30000);
    
    return () => clearInterval(interval);
  }, []);

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
            {' • '}Auto-refresh every 30s
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
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
            </div>
          ))}
        </div>
      )}
      
      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header">System Overview</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
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