import { PageHeaderSkeleton, CostsSummarySkeleton, CostsTableSkeleton } from '../components/Skeleton';

export default function CostsLoading() {
  return (
    <div>
      <PageHeaderSkeleton showButton={false} subtitleWidth="52%" />
      <CostsSummarySkeleton />
      <CostsTableSkeleton />
    </div>
  );
}
