import Link from 'next/link';
import { getDashboardData } from '../lib/page-data';

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value || 0));
}

function statusLabel(status) {
  return String(status || 'unknown').replaceAll('_', ' ');
}

export default async function HomePage() {
  const data = await getDashboardData();
  const agentEntries = Object.values(data.agents || {});

  return (
    <div>
      <div className="page-header page-header-row">
        <div>
          <h1>Morning Dashboard</h1>
          <p>Everything important above the fold.</p>
        </div>
      </div>

      <div className="dashboard-grid">
        <section className="card dashboard-card">
          <div className="card-header">Today&apos;s Spend</div>
          <div className="card-value">{formatCurrency(data.todaysSpend)}</div>
          <p className="dashboard-card-note">Live from /api/costs</p>
        </section>

        <section className="card dashboard-card">
          <div className="card-header">Active Tasks</div>
          <div className="card-value">{data.activeTaskCount}</div>
          <p className="dashboard-card-note">Tasks currently in progress</p>
        </section>

        <section className="card dashboard-card">
          <div className="card-header">Agent Status Summary</div>
          <div className="dashboard-stat-list">
            <div><strong>{data.agentSummary.working}</strong><span>Working</span></div>
            <div><strong>{data.agentSummary.idle}</strong><span>Idle</span></div>
            <div><strong>{data.agentSummary.error}</strong><span>Errors</span></div>
            <div><strong>{data.agentSummary.offline}</strong><span>Offline</span></div>
          </div>
          <div className="dashboard-agent-mini-list">
            {agentEntries.map((agent) => (
              <Link key={agent.id} href={`/agents/${agent.id}/activity`} className="dashboard-inline-link">
                {agent.name}: {statusLabel(agent.status)}
              </Link>
            ))}
          </div>
        </section>

        <section className="card dashboard-card">
          <div className="card-header">Unprocessed Content Drops</div>
          <div className="card-value">{data.unprocessedContentDrops}</div>
          <p className="dashboard-card-note">Waiting in the content inbox</p>
        </section>

        <section className="card dashboard-card">
          <div className="card-header">Recent Health Issues</div>
          {data.recentHealthIssues.length > 0 ? (
            <div className="dashboard-issue-list">
              {data.recentHealthIssues.map((issue) => (
                <div key={`${issue.agentId}-${issue.timestamp}`} className="dashboard-issue-item">
                  <strong>{issue.agentId}</strong>
                  <span>{issue.message}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="dashboard-empty-state">No current health issues.</div>
          )}
        </section>

        <section className="card dashboard-card">
          <div className="card-header">Pending Reports</div>
          <div className="card-value">{data.pendingReportsCount}</div>
          <p className="dashboard-card-note">Reports not yet submitted</p>
        </section>
      </div>
    </div>
  );
}
