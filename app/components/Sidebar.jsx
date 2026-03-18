"use client";
import { useState, useEffect } from "react";

export default function Sidebar() {
  const [agents, setAgents] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    function fetchStatus() {
      fetch("/api/status")
        .then(r => r.json())
        .then(data => {
          setAgents(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  // Find the currently working agent, or any online agent
  const activeAgent = Object.values(agents).find(a => a.status === 'working') 
    || Object.values(agents).find(a => a.status !== 'offline')
    || Object.values(agents)[0];

  const model = activeAgent?.model || (loading ? "..." : "—");
  const agentName = activeAgent?.name || "System";
  const agentStatus = activeAgent?.status || "idle";
  const dotColor = agentStatus === "working" ? "#fd7e14" : agentStatus === "idle" ? "#238636" : "#8b949e";

  // Count working agents
  const workingCount = Object.values(agents).filter(a => a.status === 'working').length;
  const totalCount = Object.keys(agents).length;

  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        Fletcher
        <span>Mission Control</span>
        <span className="sidebar-model">{model}</span>
      </div>
      <div className="sidebar-nav">
        <a href="/agents" className="sidebar-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          Agents
        </a>
        <a href="/costs" className="sidebar-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
          Costs
        </a>
        <a href="/tasks" className="sidebar-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 12l2 2 4-4"/></svg>
          Tasks
        </a>
        <a href="/schedule" className="sidebar-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          Schedule
        </a>
        <a href="/memory" className="sidebar-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
          Memory
        </a>
        <a href="/health" className="sidebar-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 21s-7-4.35-9-8.5C1.5 9.5 3.5 6 7.5 6c2.04 0 3.28 1.02 4.5 2.5C13.22 7.02 14.46 6 16.5 6 20.5 6 22.5 9.5 21 12.5 19 16.65 12 21 12 21z"/></svg>
          Health
        </a>
        <a href="/conversations" className="sidebar-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          Conversations
        </a>
        <a href="/overrides" className="sidebar-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          Overrides
        </a>
      </div>
      <div className="sidebar-status">
        <span className="sidebar-status-dot" style={{ background: dotColor }}></span>
        <span>{agentName} {agentStatus.charAt(0).toUpperCase() + agentStatus.slice(1)}</span>
        {totalCount > 0 && (
          <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-muted)' }}>
            {workingCount}/{totalCount} active
          </span>
        )}
      </div>
    </nav>
  );
}
