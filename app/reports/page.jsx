"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ClientTimestamp from "../components/ClientTimestamp";
import { getAuthHeaders, isAuthenticated, logout, getCurrentActor } from "../../lib/api-client";
import { getReportNotifications, hasNewAudit, isNewReport, markReportsListViewed } from "../../lib/notifications";
import { useRouter } from "next/navigation";
import { useToast } from "../components/ToastProvider";
import { FiltersSkeleton, ReportsListSkeleton } from "../components/Skeleton";

const REPORT_STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
];

const REPORT_AUTHOR_FILTERS = [
  { value: "all", label: "All" },
  { value: "fletcher", label: "Fletcher" },
  { value: "sawyer", label: "Sawyer" },
  { value: "celeste", label: "Celeste" },
];

function statusTone(status) {
  return status === 'submitted' ? 'badge-green' : 'badge-yellow';
}

function normalizeDateValue(value, endOfDay = false) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  if (endOfDay) date.setHours(23, 59, 59, 999);
  else date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export default function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', goal: '', summary: '' });
  const [notifications, setNotifications] = useState({ newReportsCount: 0, reportsWithNewAudits: [], totalCount: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [authorFilter, setAuthorFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const router = useRouter();
  const actor = useMemo(() => getCurrentActor(), []);
  const toast = useToast();

  async function loadReports() {
    setLoading(true);
    const res = await fetch('/api/reports', { headers: getAuthHeaders() });
    if (res.status === 401) {
      logout();
      router.push('/login');
      return;
    }
    const data = await res.json();
    const nextReports = Array.isArray(data) ? data : [];
    setReports(nextReports);
    setNotifications(getReportNotifications(nextReports));
    markReportsListViewed(nextReports);
    setLoading(false);
  }

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadReports();
  }, [router]);

  const filteredReports = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const fromTs = normalizeDateValue(fromDate, false);
    const toTs = normalizeDateValue(toDate, true);

    return reports.filter((report) => {
      const status = String(report.status || '').toLowerCase();
      const author = String(report.created_by || '').toLowerCase();
      const createdAt = report.created_at ? new Date(report.created_at).getTime() : null;

      if (statusFilter !== 'all' && status !== statusFilter) return false;
      if (authorFilter !== 'all' && author !== authorFilter) return false;
      if (fromTs && (!createdAt || createdAt < fromTs)) return false;
      if (toTs && (!createdAt || createdAt > toTs)) return false;
      if (!query) return true;

      return [
        report.title,
        report.summary,
        report.goal,
        report.existing_state,
        report.implemented_changes,
        report.agent_assignments,
        report.escalations,
        report.timeline,
        report.memories_added,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [reports, searchQuery, statusFilter, authorFilter, fromDate, toDate]);

  async function createReport(e) {
    e.preventDefault();
    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || 'Failed to create report');
      return;
    }
    setCreating(false);
    setForm({ title: '', goal: '', summary: '' });
    toast.success('Report submitted');
    router.push(`/reports/${data.id}`);
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Reports</h1>
            <p>Operational reports for Alex, Fletcher, and Sawyer.</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Viewing as {actor.charAt(0).toUpperCase() + actor.slice(1)}</p>
            {notifications.totalCount > 0 && (
              <p style={{ fontSize: 12, color: 'var(--red)', marginTop: 8 }}>
                {notifications.newReportsCount > 0 ? `${notifications.newReportsCount} new report${notifications.newReportsCount === 1 ? '' : 's'}` : null}
                {notifications.newReportsCount > 0 && notifications.reportsWithNewAudits.length > 0 ? ' • ' : null}
                {notifications.reportsWithNewAudits.length > 0 ? `${notifications.reportsWithNewAudits.length} audit update${notifications.reportsWithNewAudits.length === 1 ? '' : 's'}` : null}
              </p>
            )}
          </div>
          <div className="page-header-actions">
            <button className="btn btn-primary" onClick={() => setCreating(v => !v)}>{creating ? 'Cancel' : '+ New Report'}</button>
          </div>
        </div>
      </div>

      {creating && (
        <div className="card" style={{ marginBottom: 20 }}>
          <form onSubmit={createReport} className="reports-form-grid">
            <div>
              <label className="field-label">Title</label>
              <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div>
              <label className="field-label">Goal</label>
              <input className="input" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} />
            </div>
            <div className="content-form-field-full">
              <label className="field-label">Summary</label>
              <textarea className="textarea" rows={4} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
            </div>
            <div className="content-panel-actions content-form-actions">
              <button type="submit" className="btn btn-primary">Create Report</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <FiltersSkeleton />
      ) : (
        <div className="card content-filters-card" style={{ marginBottom: 16 }}>
          <div className="filters-row">
            <div className="filter-group" style={{ minWidth: 260 }}>
              <label>Search</label>
              <input className="input" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search title or content" />
            </div>
            <div className="filter-group">
              <label>Status</label>
              <select className="input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                {REPORT_STATUS_FILTERS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            <div className="filter-group">
              <label>Author</label>
              <select className="input" value={authorFilter} onChange={(event) => setAuthorFilter(event.target.value)}>
                {REPORT_AUTHOR_FILTERS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            <div className="filter-group">
              <label>From</label>
              <input className="input" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
            </div>
            <div className="filter-group">
              <label>To</label>
              <input className="input" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
            </div>
          </div>
        </div>
      )}

      <div className="results-count">
        {loading ? 'Loading reports…' : `Showing ${filteredReports.length} of ${reports.length} report${reports.length === 1 ? '' : 's'}`}
      </div>

      {loading ? <ReportsListSkeleton /> : filteredReports.length === 0 ? <div className="card empty-card"><p>No reports found.</p></div> : (
        <div className="reports-list">
          {filteredReports.map((report) => (
            <Link href={`/reports/${report.id}`} key={report.id} className="card report-row" style={{ display: 'block' }}>
              <div className="report-row-top">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div>
                    <h3>{report.title}</h3>
                    <p>{report.goal || 'No goal recorded.'}</p>
                  </div>
                  {isNewReport(report) && <span className="report-notification-dot report-notification-dot--new" aria-label="New report" title="New report" />}
                  {hasNewAudit(report) && <span className="report-notification-dot report-notification-dot--audit" aria-label="New Fletcher audit" title="New Fletcher audit" />}
                </div>
                <span className={`badge ${statusTone(report.status)}`}>{report.status}</span>
              </div>
              <div className="report-row-meta">
                <span>Author {(report.created_by || '—').toString().charAt(0).toUpperCase() + (report.created_by || '—').toString().slice(1)}</span>
                <span>Created <ClientTimestamp value={report.created_at} fallback="—" /></span>
                <span>Submitted <ClientTimestamp value={report.submitted_at} fallback="—" /></span>
                <span>{report.addendums?.length || 0} addendum(s)</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
