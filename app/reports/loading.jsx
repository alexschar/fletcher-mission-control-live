import { PageHeaderSkeleton, FiltersSkeleton, ReportsListSkeleton } from '../components/Skeleton';

export default function ReportsLoading() {
  return (
    <div>
      <PageHeaderSkeleton />
      <FiltersSkeleton />
      <ReportsListSkeleton />
    </div>
  );
}
