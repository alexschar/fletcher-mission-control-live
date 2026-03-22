import Link from 'next/link';
import ContentPipelineOverview from '../components/dashboard/ContentPipelineOverview';
import { Interactable } from './components/InteractModeProvider';
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
        <Interactable as="section" meta={{ type: 'dashboard card', title: "Today's Spend", details: formatCurrency(data.todaysSpend), page: '/' }} className="card dashboard-card">
          <div className="card-header">Today&apos;s Spend</div>
          <div className="card-value">{formatCurrency(data.todaysSpend)}</div>
          <p className="dashboard-card-note">Live from /api/costs</p>
        </Interactable>

        <Interactable as="section" meta={{ type: 'dashboard card', title: 'Active Tasks', details: `${data.activeTaskCount} tasks in progress`, page: '/' }} className="card dashboard-card">
          <div className="card-header">Active Tasks</div>
          <div className="card-value">{data.activeTaskCount}</div>
          <p className="dashboard-card-note">Tasks currently in progress</p>
        </Interactable>

        <Interactable as="section" meta={{ type: 'dashboard card', title: 'Agent Status Summary', details: `${data.agentSummary.working} working • ${data.agentSummary.idle} idle`, page: '/' }} className="card dashboard-card">
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
        </Interactable>

        <Interactable as="section" meta={{ type: 'dashboard card', title: 'Unprocessed Content Drops', details: String(data.unprocessedContentDrops), page: '/' }} className="card dashboard-card">
          <div className="card-header">Unprocessed Content Drops</div>
          <div className="card-value">{data.unprocessedContentDrops}</div>
          <p className="dashboard-card-note">Waiting in the content inbox</p>
        </Interactable>

        <Interactable as="section" meta={{ type: 'dashboard card', title: 'Recent Health Issues', details: `${data.recentHealthIssues.length} issues`, page: '/' }} className="card dashboard-card">
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
        </Interactable>

        <Interactable as="section" meta={{ type: 'dashboard card', title: 'Pending Reports', details: String(data.pendingReportsCount), page: '/' }} className="card dashboard-card">
          <div className="card-header">Pending Reports</div>
          <div className="card-value">{data.pendingReportsCount}</div>
          <p className="dashboard-card-note">Reports not yet submitted</p>
        </Interactable>

        <ContentPipelineOverview />
      </div>
    </div>
  );
}
