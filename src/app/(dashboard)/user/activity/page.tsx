
'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { History, Car, Ambulance, Calendar, Wrench, Siren } from 'lucide-react'
import { useFirebase } from '@/lib/firebase/client-provider'
import { collection, query, where, orderBy, onSnapshot, Timestamp, doc, updateDoc } from 'firebase/firestore'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import type { ClientSession, RideData, AmbulanceCase, Appointment, GarageRequest } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useSearchParams } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type ActivityStatus = 'Completed' | 'Cancelled' | 'Pending' | 'Confirmed' | 'Searching' | string;
type ActivityType = 'Ride' | 'Appointment' | 'SOS' | 'ResQ';

interface ActivityItem {
    id: string;
    type: ActivityType;
    title: string;
    description: string;
    date: Date;
    status: ActivityStatus;
    fare?: number;
    icon: React.ElementType;
    color: string;
}

export default function MyActivityPage() {
  const [allActivities, setAllActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('All');
  const { db, user } = useFirebase();
  const searchParams = useSearchParams();

  useEffect(() => {
    const filter = searchParams.get('filter');
    if (filter) {
        setTypeFilter(filter);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!db || !user) {
        setIsLoading(false);
        return;
    }

    const userUid = user.uid;
    if (!userUid) {
        toast.error("Authentication Error", { description: "Could not verify your user details." });
        setIsLoading(false);
        return;
    }

    const queries = [
        { type: 'Ride' as const, q: query(collection(db, 'rides'), where('riderId', '==', userUid), orderBy('createdAt', 'desc'))},
        { type: 'Appointment' as const, q: query(collection(db, 'appointments'), where('patientId', '==', userUid), orderBy('createdAt', 'desc'))},
        { type: 'SOS' as const, q: query(collection(db, 'emergencyCases'), where('riderId', '==', userUid), orderBy('createdAt', 'desc'))},
        { type: 'ResQ' as const, q: query(collection(db, 'garageRequests'), where('userId', '==', userUid), orderBy('createdAt', 'desc'))}
    ];

    const unsubs = queries.map(({ type, q }) => {
        return onSnapshot(q, (querySnapshot) => {
            const newActivities: ActivityItem[] = querySnapshot.docs.map(doc => {
                const data = doc.data();
                switch (type) {
                    case 'Ride':
                        const ride = data as RideData;
                        return { id: doc.id, type, title: `Ride to ${ride.destination?.address || 'destination'}`, description: `From: ${ride.pickup?.address || 'start'}`, date: (ride.createdAt as Timestamp)?.toDate() || new Date(), status: ride.status.charAt(0).toUpperCase() + ride.status.slice(1).replace(/_/g, ' '), fare: ride.fare, icon: Car, color: 'text-primary' };
                    case 'Appointment':
                        const appt = data as Appointment;
                        return { id: doc.id, type, title: `Appointment with Dr. ${appt.doctorName || ''}`, description: appt.hospitalName || '', date: (appt.appointmentDate as Timestamp)?.toDate() || new Date(), status: appt.status, icon: Calendar, color: 'text-blue-500' };
                    case 'SOS':
                        const emergency = data as AmbulanceCase;
                        return { id: doc.id, type, title: `SOS Case: ${emergency.caseId}`, description: `Assigned to: ${emergency.assignedPartner?.name || 'Searching...'}`, date: (emergency.createdAt as Timestamp)?.toDate() || new Date(), status: emergency.status.charAt(0).toUpperCase() + emergency.status.slice(1).replace(/_/g, ' '), icon: Siren, color: 'text-red-500' };
                    case 'ResQ':
                        const resq = data as GarageRequest;
                        return { id: doc.id, type, title: `ResQ: ${resq.issue}`, description: `Mechanic: ${resq.mechanicName || 'N/A'}`, date: (resq.createdAt as Timestamp)?.toDate() || new Date(), status: resq.status.charAt(0).toUpperCase() + resq.status.slice(1).replace(/_/g, ' '), fare: resq.totalAmount, icon: Wrench, color: 'text-amber-600' };
                }
            });
            
             setAllActivities(prev => {
                const otherActivities = prev.filter(act => act.type !== type);
                return [...otherActivities, ...newActivities].sort((a, b) => b.date.getTime() - a.date.getTime());
            });
            setIsLoading(false);
        });
    });

    return () => unsubs.forEach(unsub => unsub());
  }, [db, user]);
  
  const filteredActivities = useMemo(() => {
    if (typeFilter === 'All') return allActivities;
    return allActivities.filter(activity => activity.type === typeFilter);
  }, [allActivities, typeFilter]);

  const handleCancel = async (item: ActivityItem) => {
    // ... cancellation logic
  };

  const getStatusBadge = (status: ActivityStatus) => {
    // ... getStatusBadge logic
  };
  
  const isCancellable = (status: ActivityStatus) => {
    // ... isCancellable logic
  }

  return (
    <div className="container mx-auto max-w-4xl py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <History className="w-8 h-8 text-primary" /> 
                    My Activity
                </h2>
                <p className="text-muted-foreground">A unified history of all your Curocity activities.</p>
            </div>
            <div className="w-full md:w-auto">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-full md:w-[180px]">
                        <SelectValue placeholder="Filter by type..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="All">All Services</SelectItem>
                        <SelectItem value="Ride">Rides</SelectItem>
                        <SelectItem value="SOS">SOS</SelectItem>
                        <SelectItem value="ResQ">ResQ</SelectItem>
                        <SelectItem value="Appointment">Appointments</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
        
        <div className="space-y-4">
            {isLoading ? (
                Array.from({length: 4}).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
            ) : filteredActivities.length > 0 ? (
                filteredActivities.map(item => (
                <Card key={item.id} className="hover:bg-muted/50 transition-colors">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-muted rounded-lg">
                            <item.icon className={`w-6 h-6 ${item.color}`}/>
                        </div>
                        <div className="flex-1">
                            <p className="font-semibold text-sm line-clamp-1">{item.title}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
                            <p className="text-xs text-muted-foreground">{item.date.toLocaleDateString()}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                             {getStatusBadge(item.status)}
                             {item.fare && <p className="font-bold text-lg">~₹{item.fare?.toFixed(0)}</p>}
                        </div>
                    </CardContent>
                </Card>
                ))
            ) : (
                <Card className="h-48 flex items-center justify-center border-dashed">
                    <p className="text-muted-foreground text-center">No activity found for the selected filter.</p>
                </Card>
            )}
        </div>
    </div>
  )
}
