import { PageHeaderSkeleton, StatusCardSkeleton, FiltersSkeleton, TasksBoardSkeleton } from '../components/Skeleton';

export default function TasksLoading() {
  return (
    <div>
      <PageHeaderSkeleton />
      <StatusCardSkeleton />
      <FiltersSkeleton />
      <TasksBoardSkeleton />
    </div>
  );
}
