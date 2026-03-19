import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAgentActivityData } from '../../../../lib/page-data';

const AGENT_NAMES = {
  main: 'Fletcher',
  fletcher: 'Fletcher',
  sawyer: 'Sawyer',
  celeste: 'Celeste',
};

function formatTimestamp(value) {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default async function AgentActivityPage({ params }) {
  const resolvedParams = await params;
  const agentId = String(resolvedParams?.id || '').toLowerCase();
  const name = AGENT_NAMES[agentId];

  if (!name) {
    notFound();
  }

  const normalizedAgentId = agentId === 'fletcher' ? 'main' : agentId;
  const events = await getAgentActivityData(normalizedAgentId);

  return (
    <div>
      <div className="page-header page-header-row">
        <div>
          <h1>{name} Activity</h1>
          <p>Newest first: tasks, reports, conversations, heartbeat results, and delegation events.</p>
        </div>
        <div className="page-header-actions">
          <Link href="/agents" className="btn">Back to Agents</Link>
        </div>
      </div>

      <div className="activity-timeline">
        {events.length > 0 ? events.map((event) => (
          <div key={event.id} className={`card timeline-card timeline-${event.type}`}>
            <div className="timeline-top-row">
              <span className="badge badge-blue">{event.type}</span>
              <span className="timeline-time">{formatTimestamp(event.timestamp)}</span>
            </div>
            <h3>{event.title}</h3>
            <p>{event.detail}</p>
            <Link href={event.href} className="dashboard-inline-link">Open related page</Link>
          </div>
        )) : (
          <div className="card dashboard-empty-state">No activity found for this agent yet.</div>
        )}
      </div>
    </div>
  );
}
