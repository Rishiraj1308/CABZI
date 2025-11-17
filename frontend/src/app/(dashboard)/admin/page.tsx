
'use client'

import { useAdminStats } from './hooks/useAdminStats'
import { useLiveFeed } from './hooks/useLiveFeed'
import { StatCards, StatCardSkeleton } from './components/stat-cards'
import { LiveOperationsFeed, LiveFeedSkeleton } from './components/live-operations-feed'
import { QuickActions, QuickActionsSkeleton } from './components/quick-actions'

export default function AdminDashboardPage() {
  const { stats, isLoading: isLoadingStats } = useAdminStats();
  const { todayPartners, ongoingActivities, isLoading: isLoadingFeed } = useLiveFeed();

  const isLoading = isLoadingStats || isLoadingFeed;

  return (
    <div className="space-y-6">
      {isLoading ? <StatCardSkeleton /> : <StatCards stats={stats} />}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {isLoading ? (
            <LiveFeedSkeleton />
          ) : (
            <LiveOperationsFeed
              todayPartners={todayPartners}
              ongoingActivities={ongoingActivities}
              ongoingCount={stats.ongoingRides}
            />
          )}
        </div>
        <div className="lg:col-span-1">
          {isLoading ? <QuickActionsSkeleton /> : <QuickActions pendingApprovals={stats.pendingPartners} />}
        </div>
      </div>
    </div>
  );
}
