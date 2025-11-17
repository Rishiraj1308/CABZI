'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CircleHelp, FilePieChart } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface QuickActionsProps {
    pendingApprovals: number;
}

export const QuickActions = ({ pendingApprovals }: QuickActionsProps) => (
  <Card>
    <CardHeader>
      <CardTitle>Quick Actions</CardTitle>
      <CardDescription>Essential management shortcuts.</CardDescription>
    </CardHeader>
    <CardContent className="grid grid-cols-2 gap-4">
      <Link href="/admin/partners" legacyBehavior>
        <a className="p-4 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-center hover:bg-yellow-100/80 transition-colors">
          <CircleHelp className="w-8 h-8 mx-auto text-yellow-600 mb-2" />
          <p className="font-bold text-lg">{pendingApprovals}</p>
          <p className="text-xs text-yellow-800 dark:text-yellow-200">Pending Approvals</p>
        </a>
      </Link>
      <Link href="/admin/audit" legacyBehavior>
        <a className="p-4 rounded-lg bg-green-100 dark:bg-green-900/30 text-center hover:bg-green-100/80 transition-colors">
          <FilePieChart className="w-8 h-8 mx-auto text-green-600 mb-2" />
          <p className="font-bold text-lg">P&L</p>
          <p className="text-xs text-green-800 dark:text-green-200">View Audit Report</p>
        </a>
      </Link>
    </CardContent>
  </Card>
)

export const QuickActionsSkeleton = () => (
    <Card>
        <CardHeader>
            <Skeleton className="h-7 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
        </CardContent>
    </Card>
)
