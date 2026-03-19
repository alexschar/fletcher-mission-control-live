import { PageHeaderSkeleton, SkeletonBlock } from './components/Skeleton';

export default function DashboardLoading() {
  return (
    <div>
      <PageHeaderSkeleton />
      <div className="dashboard-grid">
        {Array.from({ length: 6 }).map((_, index) => (
          <section key={index} className="card dashboard-card">
            <SkeletonBlock className="skeleton-kicker" />
            <SkeletonBlock className="skeleton-metric" />
            <div className="skeleton-list">
              <SkeletonBlock className="skeleton-line" />
              <SkeletonBlock className="skeleton-line skeleton-line-short" />
              <SkeletonBlock className="skeleton-line" />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
