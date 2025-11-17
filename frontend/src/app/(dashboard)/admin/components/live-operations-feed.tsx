'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Activity } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import type { TodayPartner, OngoingActivity } from '../hooks/useLiveFeed'

const getInitials = (name: string) => {
    if (!name) return 'U';
    const names = name.split(' ');
    return names.length > 1 ? names[0][0] + names[1][0] : name.substring(0, 2);
}

interface LiveOperationsFeedProps {
    todayPartners: TodayPartner[];
    ongoingActivities: OngoingActivity[];
    ongoingCount: number;
}

export const LiveOperationsFeed = ({ todayPartners, ongoingActivities, ongoingCount }: LiveOperationsFeedProps) => {
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Live Operations Feed</CardTitle>
        <CardDescription>A real-time snapshot of new signups and ongoing activities across the platform.</CardDescription>
      </CardHeader>
      <CardContent className="h-96 overflow-y-auto pr-4">
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">New Partner Signups Today</h3>
            {todayPartners.length > 0 ? (
              <div className="space-y-2">
                {todayPartners.map(p => (
                  <div key={p.id} className="flex items-center gap-3 bg-muted/50 p-2 rounded-lg">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={`https://picsum.photos/40/40?random=${p.id}`} alt={p.name} />
                      <AvatarFallback>{getInitials(p.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{p.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">Joined as {p.type} Partner at {p.createdAt.toDate().toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-center py-4 text-muted-foreground">No new partners have signed up yet today.</p>}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Ongoing Activities ({ongoingCount})</h3>
            {ongoingActivities.length > 0 ? (
              <div className="space-y-2">
                {ongoingActivities.map(act => (
                  <div key={act.id} className="flex items-center gap-3 bg-muted/50 p-2 rounded-lg">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary/10">
                      <Activity className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{act.type} for {act.customerName}</p>
                      <p className="text-xs text-muted-foreground">Status: <span className="font-semibold capitalize">{act.status.replace(/_/g, ' ')}</span></p>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-center py-4 text-muted-foreground">No ongoing activities at the moment.</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}


export const LiveFeedSkeleton = () => (
    <Card className="lg:col-span-2">
        <CardHeader>
            <Skeleton className="h-7 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
        </CardHeader>
        <CardContent className="h-96 space-y-6">
            <div className="space-y-2">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
             <div className="space-y-2">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-12 w-full" />
            </div>
        </CardContent>
    </Card>
)
