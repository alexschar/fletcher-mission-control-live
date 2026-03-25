"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getAuthHeaders } from "../../lib/api-client";
import { getReportNotifications, subscribeToNotificationChanges } from "../../lib/notifications";

const NAV_ITEMS = [
  { href: "/", label: "Life Feed" },
  { href: "/email", label: "Email" },
  { href: "/agents", label: "Agents" },
  { href: "/costs", label: "Costs" },
  { href: "/tasks", label: "Tasks" },
  { href: "/projects", label: "Projects" },
  { href: "/content", label: "Content" },
  { href: "/reports", label: "Reports", hasNotifications: true },
  { href: "/preferences", label: "Preferences" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [agents, setAgents] = useState({});
  const [loading, setLoading] = useState(true);
  const [reportNotificationCount, setReportNotificationCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    function fetchStatus() {
      fetch("/api/agents", { headers: getAuthHeaders() })
        .then((r) => r.json())
        .then((data) => {
          setAgents(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }

    async function refreshReportNotifications() {
      try {
        const res = await fetch("/api/reports", { headers: getAuthHeaders() });
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

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  const activeAgent = Object.values(agents).find((a) => a.status === "working")
    || Object.values(agents).find((a) => a.status !== "offline")
    || Object.values(agents)[0];

  const model = activeAgent?.model || (loading ? "..." : "—");
  const agentName = activeAgent?.name || "System";
  const agentStatus = activeAgent?.status || "idle";
  const dotColor = agentStatus === "working" ? "#fd7e14" : agentStatus === "idle" ? "#238636" : "#8b949e";

  const workingCount = Object.values(agents).filter((a) => a.status === "working").length;
  const totalCount = Object.keys(agents).length;



  function renderNavLinks() {
    return NAV_ITEMS.map((item) => {
      const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
      return (
        <a key={item.href} href={item.href} className={`sidebar-link ${isActive ? "active" : ""}`}>
          {item.label}
          {item.hasNotifications && reportNotificationCount > 0 ? (
            <span className="sidebar-notification-badge">{reportNotificationCount}</span>
          ) : null}
        </a>
      );
    });
  }

  function renderSidebarContent(isMobile = false) {
    return (
      <>
        <div className="sidebar-logo-row">
          <div className="sidebar-logo">
            Fletcher
            <span>Mission Control</span>
            <span className="sidebar-model">{model}</span>
          </div>
          {isMobile ? (
            <button className="sidebar-close-btn" onClick={() => setMobileOpen(false)} aria-label="Close navigation">
              ✕
            </button>
          ) : null}
        </div>
        <div className="sidebar-nav">{renderNavLinks()}</div>
        <div className="sidebar-status">
          <span className="sidebar-status-dot" style={{ background: dotColor }}></span>
          <span>{agentName} {agentStatus.charAt(0).toUpperCase() + agentStatus.slice(1)}</span>
          {totalCount > 0 && (
            <span style={{ marginLeft: "auto", fontSize: "11px", color: "var(--text-muted)" }}>
              {workingCount}/{totalCount} active
            </span>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <header className="mobile-topbar">
        <button className="mobile-menu-btn" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
          ☰
        </button>
        <div className="mobile-topbar-title">
          <strong>Mission Control</strong>
          <span>{agentName} {agentStatus}</span>
        </div>
      </header>

      <nav className="sidebar sidebar-desktop">
        {renderSidebarContent(false)}
      </nav>

      <div className={`sidebar-mobile-shell ${mobileOpen ? "open" : ""}`} aria-hidden={!mobileOpen}>
        <button className="sidebar-backdrop" onClick={() => setMobileOpen(false)} aria-label="Close navigation overlay" />
        <nav className="sidebar sidebar-mobile">
          {renderSidebarContent(true)}
        </nav>
      </div>
    </>
  );
}
