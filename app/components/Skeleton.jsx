export function SkeletonBlock({ className = '', style }) {
  return <div className={`skeleton-block ${className}`.trim()} style={style} aria-hidden="true" />;
}

export function SkeletonText({ lines = 3, widths = [] }) {
  return (
    <div className="skeleton-text-stack" aria-hidden="true">
      {Array.from({ length: lines }).map((_, index) => (
        <SkeletonBlock
          key={index}
          className="skeleton-line"
          style={{ width: widths[index] || `${Math.max(40, 100 - index * 12)}%` }}
        />
      ))}
    </div>
  );
}

export function PageHeaderSkeleton({ showButton = true, subtitleWidth = '80%' }) {
  return (
    <div className="page-header page-header-row">
      <div style={{ flex: 1 }}>
        <SkeletonBlock className="skeleton-title" />
        <SkeletonBlock className="skeleton-subtitle" style={{ width: subtitleWidth }} />
      </div>
      {showButton ? <SkeletonBlock className="skeleton-button" /> : null}
    </div>
  );
}

export function StatusCardSkeleton() {
  return (
    <div className="card status-card">
      <div className="status-card-row">
        <div className="status-card-left" style={{ flex: 1 }}>
          <SkeletonBlock className="skeleton-dot" />
          <div style={{ flex: 1 }}>
            <SkeletonBlock className="skeleton-line" style={{ width: '42%', marginBottom: 8 }} />
            <SkeletonBlock className="skeleton-line" style={{ width: '68%', marginBottom: 0 }} />
          </div>
        </div>
        <SkeletonBlock className="skeleton-timer" />
      </div>
    </div>
  );
}

export function FiltersSkeleton({ showTopicCloud = false }) {
  return (
    <div className="card filters-card">
      <div className="filters-row">
        <SkeletonBlock className="skeleton-input" />
        <SkeletonBlock className="skeleton-input" />
        <SkeletonBlock className="skeleton-input" />
      </div>
      {showTopicCloud ? (
        <div className="topic-cloud">
          <SkeletonBlock className="skeleton-chip" />
          <SkeletonBlock className="skeleton-chip" />
          <SkeletonBlock className="skeleton-chip" />
          <SkeletonBlock className="skeleton-chip" />
        </div>
      ) : null}
    </div>
  );
}

export function TaskSkeleton() {
  return (
    <div className="kanban-card">
      <SkeletonBlock className="skeleton-line" />
      <SkeletonBlock className="skeleton-line skeleton-line-short" />
      <SkeletonBlock className="skeleton-chip skeleton-tag" />
      <div className="skeleton-button-row">
        <SkeletonBlock className="skeleton-button skeleton-button-sm" />
        <SkeletonBlock className="skeleton-button skeleton-button-sm" />
      </div>
    </div>
  );
}

export function TasksBoardSkeleton() {
  return (
    <div className="kanban">
      {Array.from({ length: 4 }).map((_, colIndex) => (
        <div key={colIndex} className="kanban-col">
          <div className="kanban-col-header">
            <SkeletonBlock className="skeleton-dot" />
            <SkeletonBlock className="skeleton-kicker" style={{ width: 90, marginBottom: 0 }} />
            <SkeletonBlock className="skeleton-badge" style={{ width: 34, height: 20, marginLeft: 'auto' }} />
          </div>
          {Array.from({ length: 3 }).map((__, cardIndex) => <TaskSkeleton key={cardIndex} />)}
        </div>
      ))}
    </div>
  );
}

export function ReportSkeleton() {
  return (
    <div className="card report-row">
      <div className="report-row-top">
        <div style={{ flex: 1 }}>
          <SkeletonBlock className="skeleton-line" style={{ width: '50%' }} />
          <SkeletonText lines={2} widths={[70, 50]} />
        </div>
        <SkeletonBlock className="skeleton-badge" />
      </div>
      <div className="report-row-meta">
        <SkeletonBlock className="skeleton-meta-pill" />
        <SkeletonBlock className="skeleton-meta-pill" />
        <SkeletonBlock className="skeleton-meta-pill" />
      </div>
    </div>
  );
}

export function ReportsListSkeleton({ count = 4 }) {
  return (
    <div className="reports-list">
      {Array.from({ length: count }).map((_, index) => <ReportSkeleton key={index} />)}
    </div>
  );
}

export function ConversationSkeleton() {
  return (
    <div className="card conversation-card">
      <div className="conversation-header">
        <SkeletonBlock className="skeleton-badge" style={{ width: 76 }} />
        <SkeletonBlock className="skeleton-meta-pill" />
      </div>
      <SkeletonText lines={3} widths={[95, 90, 65]} />
      <div className="conversation-topics">
        <SkeletonBlock className="skeleton-chip" />
        <SkeletonBlock className="skeleton-chip" />
        <SkeletonBlock className="skeleton-chip" />
      </div>
    </div>
  );
}

export function ConversationsListSkeleton({ count = 4 }) {
  return (
    <div className="conversations-list">
      {Array.from({ length: count }).map((_, index) => <ConversationSkeleton key={index} />)}
    </div>
  );
}

export function CostsSummarySkeleton() {
  return (
    <div className="grid-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="card">
          <SkeletonBlock className="skeleton-kicker" style={{ width: '34%' }} />
          <SkeletonBlock className="skeleton-metric" style={{ width: '55%', marginTop: 8 }} />
          {index === 2 ? <SkeletonBlock className="skeleton-badge" style={{ marginTop: 14 }} /> : null}
        </div>
      ))}
    </div>
  );
}

export function CostsTableSkeleton({ rows = 6 }) {
  return (
    <div className="grid-2">
      <div className="card">
        <SkeletonBlock className="skeleton-kicker" style={{ width: '36%', marginBottom: 16 }} />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th><SkeletonBlock className="skeleton-line" style={{ width: 70, height: 10, marginBottom: 0 }} /></th>
                <th><SkeletonBlock className="skeleton-line" style={{ width: 80, height: 10, marginBottom: 0 }} /></th>
                <th><SkeletonBlock className="skeleton-line" style={{ width: 60, height: 10, marginBottom: 0 }} /></th>
                <th><SkeletonBlock className="skeleton-line" style={{ width: 50, height: 10, marginBottom: 0 }} /></th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rows }).map((_, index) => (
                <tr key={index}>
                  <td><SkeletonBlock className="skeleton-line" style={{ width: '80%', marginBottom: 0 }} /></td>
                  <td><SkeletonBlock className="skeleton-line" style={{ width: '75%', marginBottom: 0 }} /></td>
                  <td><SkeletonBlock className="skeleton-line" style={{ width: '90%', marginBottom: 0 }} /></td>
                  <td><SkeletonBlock className="skeleton-line" style={{ width: '65%', marginBottom: 0 }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function AgentCardSkeleton() {
  return (
    <div className="card agent-card">
      <div className="agent-header">
        <div className="agent-info" style={{ flex: 1 }}>
          <SkeletonBlock className="skeleton-line" style={{ width: '42%', height: 20 }} />
          <SkeletonBlock className="skeleton-line" style={{ width: '58%', marginBottom: 0 }} />
        </div>
        <SkeletonBlock className="skeleton-badge" />
      </div>
      <div className="agent-details">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="detail-row">
            <SkeletonBlock className="skeleton-line" style={{ width: '72%', marginBottom: 0 }} />
            <SkeletonBlock className="skeleton-line" style={{ width: '88%', marginBottom: 0 }} />
          </div>
        ))}
      </div>
      <SkeletonBlock className="skeleton-button" style={{ width: 180, marginTop: 16 }} />
    </div>
  );
}

export function AgentsOverviewSkeleton() {
  return (
    <div className="card" style={{ marginTop: 20 }}>
      <SkeletonBlock className="skeleton-kicker" style={{ width: 140, marginBottom: 16 }} />
      <div className="metric-grid">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="metric">
            <SkeletonBlock className="skeleton-metric" style={{ width: 56, height: 28, margin: '0 auto 8px' }} />
            <SkeletonBlock className="skeleton-line" style={{ width: '60%', height: 10, margin: '0 auto' }} />
          </div>
        ))}
      </div>
    </div>
  );
}
