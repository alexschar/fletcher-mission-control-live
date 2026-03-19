import { PageHeaderSkeleton, AgentCardSkeleton, AgentsOverviewSkeleton } from '../components/Skeleton';

export default function AgentsLoading() {
  return (
    <div>
      <PageHeaderSkeleton showButton={false} subtitleWidth="58%" />
      <div className="grid-1">
        {Array.from({ length: 3 }).map((_, index) => <AgentCardSkeleton key={index} />)}
      </div>
      <AgentsOverviewSkeleton />
    </div>
  );
}
