
'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useToast } from '@/hooks/use-toast'
import { useDb } from '@/firebase/client-provider'
import { onSnapshot, doc } from 'firebase/firestore'
import { Skeleton } from '@/components/ui/skeleton'
import HospitalMissionControl from './hospital-dashboard'
import ClinicDashboard from './clinic-dashboard'
import { Card, CardContent, CardHeader } from '@/components/ui/card'


export default function CureDashboardPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [facilityType, setFacilityType] = useState<'hospital' | 'clinic' | null>(null);
    const { toast } = useToast();
    const db = useDb();

    useEffect(() => {
        if (!db) {
            setIsLoading(false);
            return;
        }

        const session = localStorage.getItem('cabzi-cure-session');
        if (session) {
            const { partnerId } = JSON.parse(session);
            if (partnerId) {
                const unsub = onSnapshot(doc(db, 'ambulances', partnerId), (docSnap) => {
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        // Make logic more robust: default to hospital unless explicitly 'clinic'
                        const type = data.businessType?.toLowerCase() || 'hospital'; // Default to 'hospital'
                        if (type.includes('clinic')) {
                            setFacilityType('clinic');
                        } else {
                            setFacilityType('hospital');
                        }
                    } else {
                        // Handle case where document doesn't exist
                        toast({ variant: 'destructive', title: 'Error', description: 'Partner profile not found.' });
                    }
                    setIsLoading(false);
                }, (error) => {
                    console.error("Error fetching facility type:", error);
                    toast({ variant: 'destructive', title: 'Error', description: 'Could not determine facility type.' });
                    setIsLoading(false);
                });
                return () => unsub();
            } else {
                 setIsLoading(false);
            }
        } else {
             setIsLoading(false);
        }

    }, [db, toast]);

    if (isLoading) {
        return (
            <div className="grid lg:grid-cols-3 gap-6 h-full">
              <div className="lg:col-span-2 space-y-6">
                  <Skeleton className="h-24 w-full"/>
                  <Skeleton className="h-[calc(100vh-20rem)] w-full"/>
              </div>
              <div className="space-y-6">
                  <Card><CardHeader><Skeleton className="h-8 w-full"/></CardHeader><CardContent><Skeleton className="h-96 w-full"/></CardContent></Card>
              </div>
          </div>
        )
    }

    if (facilityType === 'hospital') {
        return <HospitalMissionControl />;
    }

    if (facilityType === 'clinic') {
        return <ClinicDashboard />;
    }
    
    // Fallback or error state
    return (
        <div className="flex h-full items-center justify-center">
            <Card className="max-w-md p-8 text-center">
                <CardHeader>
                    <CardTitle>Dashboard Error</CardTitle>
                    <CardDescription>Could not load the correct dashboard because the facility type is not set correctly in your profile.</CardDescription>
                </CardHeader>
            </Card>
        </div>
    )
}
