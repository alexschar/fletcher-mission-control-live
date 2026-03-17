"use client";
import { useState, useEffect } from "react";

export default function Sidebar() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    function fetchStatus() {
      fetch("/api/status").then(r => r.json()).then(setStatus).catch(() => {});
    }
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const model = status?.model || "loading...";
  const agentStatus = status?.status || "idle";
  const dotColor = agentStatus === "working" ? "var(--green)" : agentStatus === "planning" ? "var(--yellow)" : "var(--text-muted)";

  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        Fletcher
        <span>Mission Control</span>
        <span className="sidebar-model">{model}</span>
      </div>
      <div className="sidebar-nav">
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
      </div>
      <div className="sidebar-status">
        <span className="sidebar-status-dot" style={{ background: dotColor }}></span>
        <span>Fletcher {agentStatus.charAt(0).toUpperCase() + agentStatus.slice(1)}</span>
      </div>
    </nav>
  );
}
