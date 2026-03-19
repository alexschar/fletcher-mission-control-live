import { PageHeaderSkeleton, SkeletonBlock, SkeletonText } from '../components/Skeleton';

export default function ContentLoading() {
  return (
    <div className="content-page-shell">
      <PageHeaderSkeleton />
      <div className="content-tab-row">
        <SkeletonBlock className="skeleton-chip" />
        <SkeletonBlock className="skeleton-chip" />
      </div>
      <div className="card content-filters-card" style={{ marginBottom: 16 }}>
        <SkeletonBlock className="skeleton-filter-row" />
      </div>
      <div className="card content-list-card">
        <SkeletonBlock className="skeleton-kicker" />
        <div className="content-card-grid">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="content-card">
              <div className="content-card-top">
                <SkeletonBlock className="skeleton-chip" />
                <SkeletonBlock className="skeleton-badge" />
              </div>
              <SkeletonBlock className="skeleton-line" />
              <SkeletonText lines={3} widths={[100, 88, 62]} />
              <div className="content-card-footer">
                <SkeletonBlock className="skeleton-meta-pill" />
                <SkeletonBlock className="skeleton-meta-pill" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
