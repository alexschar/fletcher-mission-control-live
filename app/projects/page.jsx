"use client";

import { useEffect, useMemo, useState } from "react";
import { getAuthHeaders, isAuthenticated, logout } from "../../lib/api-client";
import { useRouter } from "next/navigation";
import { Interactable } from "../components/InteractModeProvider";

const STATUS_META = {
  active: { label: "Active", className: "badge badge-green" },
  paused: { label: "Paused", className: "badge badge-yellow" },
  blocked: { label: "Blocked", className: "badge badge-red" },
};

function normalizeProject(project) {
  if (!project || typeof project !== "object") return null;
  const status = String(project.status || "paused").toLowerCase();
  return {
    id: project.id,
    project_name: String(project.project_name || "Untitled Project"),
    status: STATUS_META[status] ? status : "paused",
    last_update: String(project.last_update || "No update yet."),
    updated_at: project.updated_at || new Date().toISOString(),
    updated_by: String(project.updated_by || "Unknown"),
  };
}

function timeAgo(timestamp, now) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "Unknown";
  const diffMs = Math.max(0, now - date.getTime());
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }

    let ignore = false;

    async function loadProjects() {
      try {
        setError("");
        const response = await fetch("/api/projects", {
          headers: getAuthHeaders(),
          cache: "no-store",
        });

        if (response.status === 401) {
          logout();
          router.push("/login");
          return;
        }

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || "Failed to load projects");
        }

        if (!ignore) {
          setProjects((Array.isArray(payload) ? payload : []).map(normalizeProject).filter(Boolean));
        }
      } catch (err) {
        if (!ignore) setError(err.message || "Failed to load projects");
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadProjects();
    const refreshTimer = setInterval(loadProjects, 60000);
    return () => {
      ignore = true;
      clearInterval(refreshTimer);
    };
  }, [router]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const counts = useMemo(() => {
    return projects.reduce((acc, project) => {
      acc.total += 1;
      acc[project.status] += 1;
      return acc;
    }, { total: 0, active: 0, paused: 0, blocked: 0 });
  }, [projects]);

  return (
    <div>
      <div className="page-header page-header-row">
        <div>
          <h1>Projects</h1>
          <p>Fast project pulse for Alex — most recent updates first.</p>
        </div>
      </div>

      <div className="grid-4">
        <Interactable as="section" meta={{ type: "project metric", title: "Total Projects", details: String(loading ? 'loading' : counts.total), page: "/projects" }} className="card dashboard-card">
          <div className="card-header">Total Projects</div>
          <div className="card-value">{loading ? "—" : counts.total}</div>
        </Interactable>
        <Interactable as="section" meta={{ type: "project metric", title: "Active Projects", details: String(loading ? 'loading' : counts.active), page: "/projects" }} className="card dashboard-card">
          <div className="card-header">Active</div>
          <div className="card-value green">{loading ? "—" : counts.active}</div>
        </Interactable>
        <Interactable as="section" meta={{ type: "project metric", title: "Paused Projects", details: String(loading ? 'loading' : counts.paused), page: "/projects" }} className="card dashboard-card">
          <div className="card-header">Paused</div>
          <div className="card-value yellow">{loading ? "—" : counts.paused}</div>
        </Interactable>
        <Interactable as="section" meta={{ type: "project metric", title: "Blocked Projects", details: String(loading ? 'loading' : counts.blocked), page: "/projects" }} className="card dashboard-card">
          <div className="card-header">Blocked</div>
          <div className="card-value red">{loading ? "—" : counts.blocked}</div>
        </Interactable>
      </div>

      {loading ? (
        <div className="projects-card-grid">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="card project-card">
              <div className="skeleton-block skeleton-kicker"></div>
              <div className="skeleton-block skeleton-title"></div>
              <div className="skeleton-text-stack">
                <div className="skeleton-block skeleton-line"></div>
                <div className="skeleton-block skeleton-line skeleton-line-short"></div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="card empty-card">
          <div className="card-header">Projects unavailable</div>
          <p>{error}</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="card empty-card">
          <div className="card-header">No projects yet</div>
          <p className="empty-hint">Seed data will appear here once the project_status table is available.</p>
        </div>
      ) : (
        <div className="projects-card-grid">
          {projects.map((project) => {
            const statusMeta = STATUS_META[project.status] || STATUS_META.paused;
            return (
              <Interactable as="article" key={project.id} meta={{ type: "project card", title: project.project_name, details: `${statusMeta.label} • ${project.last_update} • Updated by ${project.updated_by}`, page: "/projects" }} className="card project-card">
                <div className="project-card-top">
                  <h2>{project.project_name}</h2>
                  <span className={statusMeta.className}>{statusMeta.label}</span>
                </div>
                <p className="project-card-update">{project.last_update}</p>
                <div className="project-card-footer">
                  <span>{timeAgo(project.updated_at, now)}</span>
                  <span>Updated by {project.updated_by}</span>
                </div>
              </Interactable>
            );
          })}
        </div>
      )}
    </div>
  );
}
