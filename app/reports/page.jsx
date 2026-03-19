"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getAuthHeaders, isAuthenticated, logout, getCurrentActor } from "../../lib/api-client";
import { getReportNotifications, hasNewAudit, isNewReport, markReportsListViewed } from "../../lib/notifications";
import { useRouter } from "next/navigation";

function statusTone(status) {
  return status === 'submitted' ? 'badge-green' : 'badge-yellow';
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

export default function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', goal: '', summary: '' });
  const [notifications, setNotifications] = useState({ newReportsCount: 0, reportsWithNewAudits: [], totalCount: 0 });
  const router = useRouter();
  const actor = useMemo(() => getCurrentActor(), []);

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

  async function createReport(e) {
    e.preventDefault();
    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Failed to create report');
      return;
    }
    setCreating(false);
    setForm({ title: '', goal: '', summary: '' });
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

      {loading ? <div className="empty">Loading reports...</div> : reports.length === 0 ? <div className="card empty-card"><p>No reports yet.</p></div> : (
        <div className="reports-list">
          {reports.map((report) => (
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
                <span>Created {formatDate(report.created_at)}</span>
                <span>Submitted {formatDate(report.submitted_at)}</span>
                <span>{report.addendums?.length || 0} addendum(s)</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
