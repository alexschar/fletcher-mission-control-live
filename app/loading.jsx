import { PageHeaderSkeleton, SkeletonBlock } from './components/Skeleton';

export default function LifeFeedLoading() {
  return (
    <div>
      <PageHeaderSkeleton />
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <SkeletonBlock key={i} className="skeleton-chip" />
        ))}
      </div>
      <div className="section-stack">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="card">
            <SkeletonBlock className="skeleton-kicker" />
            <SkeletonBlock className="skeleton-title" />
            <SkeletonBlock className="skeleton-line" />
            <SkeletonBlock className="skeleton-line skeleton-line-short" />
          </div>
        ))}
      </div>
    </div>
  );
}
