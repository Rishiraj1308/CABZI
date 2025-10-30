
'use client'

import React from 'react'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import HospitalMissionControl from './hospital-dashboard'
import ClinicDashboard from './clinic-dashboard'
import { useCurePartner } from './layout'

export default function CureDashboardPage() {
    const { partnerData, isLoading } = useCurePartner();

    if (isLoading) {
        return (
            <div className="grid lg:grid-cols-3 gap-6 h-full">
                <div className="lg:col-span-2 space-y-6">
                    <Skeleton className="h-24 w-full"/>
                    <Skeleton className="h-[calc(100vh-20rem)] w-full"/>
                </div>
                <div className="space-y-6">
                    <Card>
                        <CardHeader><Skeleton className="h-8 w-full"/></CardHeader>
                        <CardContent><Skeleton className="h-96 w-full"/></CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    const facilityType = partnerData?.clinicType?.toLowerCase().includes('clinic') ? 'clinic' : 'hospital';

    if (facilityType === 'hospital') {
        return (
            <HospitalMissionControl
                partnerData={partnerData}
                isLoading={isLoading}
            />
        );
    }

    if (facilityType === 'clinic') {
        return <ClinicDashboard />;
    }
    
    return (
        <div className="flex h-full items-center justify-center">
            <Card className="max-w-md p-8 text-center">
                <CardHeader>
                    <CardTitle>Dashboard Error</CardTitle>
                    <CardDescription>Could not load the correct dashboard. Your facility type may not be set correctly. Please contact support.</CardDescription>
                </CardHeader>
            </Card>
        </div>
    )
}
