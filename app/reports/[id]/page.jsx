"use client";
import { useEffect, useMemo, useState } from "react";
import { getAuthHeaders, getCurrentActor, isAuthenticated, logout } from "../../../lib/api-client";
import { markReportAuditViewed } from "../../../lib/notifications";
import { useParams, useRouter } from "next/navigation";

const FIELDS = [
  ['goal', 'Goal'],
  ['summary', 'Summary'],
  ['existing_state', 'Existing State'],
  ['implemented_changes', 'Implemented Changes'],
  ['agent_assignments', 'Agent Assignments'],
  ['escalations', 'Escalations'],
  ['timeline', 'Timeline'],
  ['memories_added', 'Memories Added'],
];

function Section({ label, value, editable, onChange }) {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-header">{label}</div>
      {editable ? (
        <textarea className="textarea" rows={5} value={value || ''} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <div className="report-text">{value || '—'}</div>
      )}
    </div>
  );
}

export default function ReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const actor = useMemo(() => getCurrentActor(), []);
  const [report, setReport] = useState(null);
  const [form, setForm] = useState(null);
  const [audit, setAudit] = useState(null);
  const [addendum, setAddendum] = useState('');
  const [auditDraft, setAuditDraft] = useState({
    audit_content: '', suggestions_for_team: '', suggestions_per_agent: '', rules_compliance: '', scope_assessment: '', performance_assessment: ''
  });

  async function loadReport() {
    const res = await fetch(`/api/reports/${params.id}`, { headers: getAuthHeaders() });
    if (res.status === 401) {
      logout();
      router.push('/login');
      return;
    }
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Failed to load report');
      return;
    }
    setReport(data);
    setForm({
      title: data.title || '',
      goal: data.goal || '',
      summary: data.summary || '',
      existing_state: data.existing_state || '',
      implemented_changes: data.implemented_changes || '',
      agent_assignments: data.agent_assignments || '',
      escalations: data.escalations || '',
      timeline: data.timeline || '',
      memories_added: data.memories_added || '',
    });
  }

  async function loadAudit() {
    const res = await fetch(`/api/reports/${params.id}/audit`, { headers: getAuthHeaders() });
    if (res.status === 403) return;
    const data = await res.json();
    if (res.ok && data) {
      setAudit(data);
      setAuditDraft({
        audit_content: data.audit_content || '',
        suggestions_for_team: data.suggestions_for_team || '',
        suggestions_per_agent: data.suggestions_per_agent || '',
        rules_compliance: data.rules_compliance || '',
        scope_assessment: data.scope_assessment || '',
        performance_assessment: data.performance_assessment || '',
      });
      markReportAuditViewed({ id: params.id, audit: data });
    }
  }

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    if (params.id) {
      loadReport();
      loadAudit();
    }
  }, [params.id, router]);

  if (!report || !form) return <div className="empty">Loading report...</div>;

  const canViewAudit = actor === 'alex' || actor === 'fletcher';
  const canViewSuggestions = actor === 'sawyer';
  const canCreateAudit = actor === 'fletcher';

  async function createAddendum() {
    const res = await fetch(`/api/reports/${report.id}/addendums`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ content: addendum }),
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error || 'Failed to add addendum');
    setAddendum('');
    await loadReport();
  }

  async function saveAudit() {
    const res = await fetch(`/api/reports/${report.id}/audit`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(auditDraft),
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error || 'Failed to save audit');
    setAudit(data);
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div>
          <h1>{report.title}</h1>
          <p>Submitted report • Viewing as {actor}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }} />
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="reports-form-grid">
          <div>
            <label className="field-label">Title</label>
            <div className="report-text">{report.title}</div>
          </div>
          <div>
            <label className="field-label">Status</label>
            <div className="report-text">{report.status}</div>
          </div>
        </div>
      </div>

      {FIELDS.map(([key, label]) => (
        <Section key={key} label={label} value={form[key]} editable={false} onChange={(value) => setForm({ ...form, [key]: value })} />
      ))}

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">Addendums</div>
        {report.addendums?.length ? (
          <div className="stack-list">
            {report.addendums.map((item) => (
              <div key={item.id} className="subtle-panel">
                <div className="report-meta">{item.created_by} • {new Date(item.created_at).toLocaleString()}</div>
                <div className="report-text">{item.content}</div>
              </div>
            ))}
          </div>
        ) : <div className="report-text">No addendums yet.</div>}

        {report.status === 'submitted' && (
          <div style={{ marginTop: 16 }}>
            <textarea className="textarea" rows={4} value={addendum} onChange={(e) => setAddendum(e.target.value)} placeholder="Add follow-up notes after submission..." />
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={createAddendum}>Add Addendum</button>
            </div>
          </div>
        )}
      </div>

      {canViewAudit && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">Fletcher Audit</div>
          {['audit_content', 'suggestions_for_team', 'suggestions_per_agent', 'rules_compliance', 'scope_assessment', 'performance_assessment'].map((key) => (
            <div key={key} style={{ marginBottom: 14 }}>
              <label className="field-label">{key.replaceAll('_', ' ')}</label>
              {canCreateAudit ? (
                <textarea className="textarea" rows={key === 'audit_content' ? 5 : 3} value={auditDraft[key]} onChange={(e) => setAuditDraft({ ...auditDraft, [key]: e.target.value })} />
              ) : (
                <div className="report-text">{audit?.[key] || '—'}</div>
              )}
            </div>
          ))}
          {canCreateAudit && <div style={{ display: 'flex', justifyContent: 'flex-end' }}><button className="btn btn-primary" onClick={saveAudit}>Save Audit</button></div>}
        </div>
      )}

      {canViewSuggestions && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">Implementation Suggestions</div>
          <div className="report-text">{audit?.suggestions_per_agent || 'No implementation suggestions yet.'}</div>
        </div>
      )}
    </div>
  );
}
