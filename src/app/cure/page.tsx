
'use client'

import React, { useState, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'
import { useDb } from '@/firebase/client-provider'
import { onSnapshot, doc } from 'firebase/firestore'
import { Skeleton } from '@/components/ui/skeleton'
import HospitalMissionControl from './hospital-dashboard'
import ClinicDashboard from './clinic-dashboard'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ListChecks, PlusCircle, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'


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

        const session = localStorage.getItem('curocity-cure-session');
        if (session) {
            const { partnerId } = JSON.parse(session);
            if (partnerId) {
                const partnerRef = doc(db, 'ambulances', partnerId);
                const unsubType = onSnapshot(partnerRef, (docSnap) => {
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        const type = data.clinicType?.toLowerCase() || 'hospital';
                        
                        if (type.includes('clinic')) {
                            setFacilityType('clinic');
                        } else {
                            setFacilityType('hospital');
                        }
                    } else {
                        toast({ variant: 'destructive', title: 'Error', description: 'Partner profile not found.' });
                    }
                    setIsLoading(false);
                }, (error) => {
                    console.error("Error fetching facility type:", error);
                    toast({ variant: 'destructive', title: 'Error', description: 'Could not determine facility type.' });
                    setIsLoading(false);
                });

                return () => unsubType();

            } else {
                 setIsLoading(false);
            }
        } else {
             setIsLoading(false);
        }

    }, [db, toast]);
    
    // Placeholder function, as the actual implementation is inside HospitalMissionControl
    const renderChecklistManagement = () => {
         return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg"><ListChecks /> Pre-Duty Checklist</CardTitle>
                    <CardDescription>Define the checklist your ambulance drivers must complete before starting their duty.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                        {/* Placeholder Content */}
                        <div className="flex items-center gap-2 p-2 bg-muted rounded-md"><span className="flex-1 text-sm">Oxygen Cylinder Full?</span><Button variant="ghost" size="icon" className="h-8 w-8"><Trash2 className="w-4 h-4 text-destructive"/></Button></div>
                        <div className="flex items-center gap-2 p-2 bg-muted rounded-md"><span className="flex-1 text-sm">Defibrillator Charged?</span><Button variant="ghost" size="icon" className="h-8 w-8"><Trash2 className="w-4 h-4 text-destructive"/></Button></div>
                    </div>
                    <div className="flex gap-2">
                        <Input placeholder="Add new checklist item..." />
                        <Button><PlusCircle className="w-4 h-4 mr-2" /> Add Item</Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

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
        return (
            <HospitalMissionControl
                renderChecklistManagement={renderChecklistManagement}
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
                    <CardDescription>Could not load the correct dashboard because the facility type is not set correctly in your profile.</CardDescription>
                </CardHeader>
            </Card>
        </div>
    )
}

    