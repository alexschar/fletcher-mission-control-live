import { PageHeaderSkeleton, StatusCardSkeleton, FiltersSkeleton, ConversationsListSkeleton } from '../components/Skeleton';

export default function ConversationsLoading() {
  return (
    <div>
      <PageHeaderSkeleton showButton={false} subtitleWidth="56%" />
      <StatusCardSkeleton />
      <FiltersSkeleton showTopicCloud />
      <ConversationsListSkeleton />
    </div>
  );
}
