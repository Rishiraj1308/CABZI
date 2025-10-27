
'use client'

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Wrench } from 'lucide-react';
import type { PartnerData } from '@/lib/types';

export default function DriverDashboardPage({ partnerData }: { partnerData: PartnerData | null }) {
  return (
    <div className="flex flex-1 items-center justify-center h-full">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                <Wrench className="h-8 w-8 text-muted-foreground" />
            </div>
          <CardTitle>Dashboard Under Construction</CardTitle>
          <CardDescription>This page is currently being rebuilt. Please check back later.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
