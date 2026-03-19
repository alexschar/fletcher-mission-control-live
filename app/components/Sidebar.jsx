"use client";
import { useState, useEffect } from "react";
import { getCurrentActor, setCurrentActor, getAuthHeaders } from "../../lib/api-client";
import { getReportNotifications, subscribeToNotificationChanges } from "../../lib/notifications";

export default function Sidebar() {
  const [agents, setAgents] = useState({});
  const [loading, setLoading] = useState(true);
  const [actor, setActor] = useState('sawyer');
  const [reportNotificationCount, setReportNotificationCount] = useState(0);

  useEffect(() => {
    setActor(getCurrentActor());

    function fetchStatus() {
      fetch("/api/status")
        .then(r => r.json())
        .then(data => {
          setAgents(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }

    async function refreshReportNotifications() {
      try {
        const res = await fetch('/api/reports', { headers: getAuthHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        const notifications = getReportNotifications(Array.isArray(data) ? data : []);
        setReportNotificationCount(notifications.totalCount);
      } catch {
        // ignore sidebar notification errors
      }
    }

    fetchStatus();
    refreshReportNotifications();
    const statusInterval = setInterval(fetchStatus, 15000);
    const reportsInterval = setInterval(refreshReportNotifications, 15000);
    const unsubscribe = subscribeToNotificationChanges(refreshReportNotifications);

    return () => {
      clearInterval(statusInterval);
      clearInterval(reportsInterval);
      unsubscribe();
    };
  }, []);

  const activeAgent = Object.values(agents).find(a => a.status === 'working') 
    || Object.values(agents).find(a => a.status !== 'offline')
    || Object.values(agents)[0];

  const model = activeAgent?.model || (loading ? "..." : "—");
  const agentName = activeAgent?.name || "System";
  const agentStatus = activeAgent?.status || "idle";
  const dotColor = agentStatus === "working" ? "#fd7e14" : agentStatus === "idle" ? "#238636" : "#8b949e";

  const workingCount = Object.values(agents).filter(a => a.status === 'working').length;
  const totalCount = Object.keys(agents).length;

  function handleActorChange(nextActor) {
    setActor(nextActor);
    setCurrentActor(nextActor);
    window.location.reload();
  }

  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        Fletcher
        <span>Mission Control</span>
        <span className="sidebar-model">{model}</span>
      </div>
      <div className="sidebar-nav">
        <a href="/agents" className="sidebar-link">Agents</a>
        <a href="/costs" className="sidebar-link">Costs</a>
        <a href="/tasks" className="sidebar-link">Tasks</a>
        <a href="/content" className="sidebar-link">Content</a>
        <a href="/reports" className="sidebar-link">
          Reports
          {reportNotificationCount > 0 && <span className="sidebar-notification-badge">{reportNotificationCount}</span>}
        </a>
        <a href="/schedule" className="sidebar-link">Schedule</a>
        <a href="/memory" className="sidebar-link">Memory</a>
        <a href="/health" className="sidebar-link">Health</a>
        <a href="/conversations" className="sidebar-link">Conversations</a>
        <a href="/overrides" className="sidebar-link">Overrides</a>
      </div>
      <div style={{ padding: '0 20px 16px' }}>
        <label className="field-label">Viewer</label>
        <select className="select" value={actor} onChange={(e) => handleActorChange(e.target.value)}>
          <option value="sawyer">Sawyer</option>
          <option value="alex">Alex</option>
          <option value="fletcher">Fletcher</option>
        </select>
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
