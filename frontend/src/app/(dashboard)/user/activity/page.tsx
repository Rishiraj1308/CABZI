
'use client'

import React, { useState, useEffect } from 'react'
import { History, Car, Ambulance, Calendar } from 'lucide-react'
import { useFirebase } from '@/lib/firebase/client-provider'
import { collection, query, where, orderBy, onSnapshot, Timestamp, doc, updateDoc } from 'firebase/firestore'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import type { ClientSession, RideData, AmbulanceCase, Appointment } from '@/lib/types'
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

type ActivityStatus = 'Completed' | 'Cancelled' | 'Pending' | 'Confirmed' | 'Searching' | string;

interface ActivityItem {
    id: string;
    type: 'Ride' | 'Appointment' | 'Emergency';
    title: string;
    description: string;
    date: Date;
    status: ActivityStatus;
    fare?: number;
    icon: React.ElementType;
    color: string;
}

export default function MyActivityPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { db, user } = useFirebase();

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
        { type: 'Emergency' as const, q: query(collection(db, 'emergencyCases'), where('riderId', '==', userUid), orderBy('createdAt', 'desc'))}
    ];

    const unsubscribes = queries.map(({ type, q }) => {
        return onSnapshot(q, (querySnapshot) => {
            const newActivities: ActivityItem[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (type === 'Ride') { // Rides
                    const ride = data as RideData;
                    newActivities.push({
                        id: doc.id,
                        type: 'Ride',
                        title: `Ride to ${ride.destination?.address || 'destination'}`,
                        description: `From: ${ride.pickup?.address || 'start'}`,
                        date: (ride.createdAt as Timestamp)?.toDate() || new Date(),
                        status: ride.status.charAt(0).toUpperCase() + ride.status.slice(1).replace(/_/g, ' '),
                        fare: ride.fare,
                        icon: Car,
                        color: 'text-primary'
                    });
                } else if (type === 'Appointment') { // Appointments
                    const appt = data as Appointment;
                    newActivities.push({
                        id: doc.id,
                        type: 'Appointment',
                        title: `Appointment with Dr. ${appt.doctorName || ''}`,
                        description: appt.hospitalName || '',
                        date: (appt.appointmentDate as Timestamp)?.toDate() || new Date(),
                        status: appt.status,
                        icon: Calendar,
                        color: 'text-blue-500'
                    });
                } else if (type === 'Emergency') { // Emergency Cases
                    const emergency = data as AmbulanceCase;
                     newActivities.push({
                        id: doc.id,
                        type: 'Emergency',
                        title: `SOS Case: ${emergency.caseId}`,
                        description: `Assigned to: ${emergency.assignedPartner?.name || 'Searching...'}`,
                        date: (emergency.createdAt as Timestamp)?.toDate() || new Date(),
                        status: emergency.status.charAt(0).toUpperCase() + emergency.status.slice(1).replace(/_/g, ' '),
                        icon: Ambulance,
                        color: 'text-red-500'
                    });
                }
            });
            
             setActivities(prev => {
                const otherActivities = prev.filter(act => act.type !== type);
                return [...otherActivities, ...newActivities].sort((a, b) => b.date.getTime() - a.date.getTime());
            });
            
        }, (error) => {
            console.error(`Error fetching ${type} activity:`, error);
            toast.error("Error", { description: "Could not load part of your activity history."});
        });
    });
    
    setIsLoading(false);

    return () => unsubscribes.forEach(unsub => unsub());
  }, [db, user]);

  const handleCancel = async (item: ActivityItem) => {
    if (!db) return;
    
    let collectionName: string;
    let newStatus: string;

    switch(item.type) {
        case 'Ride': 
            collectionName = 'rides';
            newStatus = 'cancelled_by_rider';
            break;
        case 'Appointment':
            collectionName = 'appointments';
            newStatus = 'Cancelled';
            break;
        case 'Emergency':
            collectionName = 'emergencyCases';
            newStatus = 'cancelled';
            break;
        default:
            toast.error("Cannot cancel this item.");
            return;
    }
    
    try {
        const itemRef = doc(db, collectionName, item.id);
        await updateDoc(itemRef, { status: newStatus });
        toast.success(`${item.type} request has been cancelled.`);
    } catch (error) {
        console.error(`Failed to cancel ${item.type}:`, error);
        toast.error("Cancellation Failed", { description: `Could not cancel the ${item.type.toLowerCase()} request.` });
    }
  };

  const getStatusBadge = (status: ActivityStatus) => {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes('completed')) return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">{status}</Badge>;
    if (lowerStatus.includes('cancel')) return <Badge variant="destructive">{status}</Badge>;
    if (lowerStatus.includes('pending') || lowerStatus.includes('searching')) return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">{status}</Badge>;
    if (lowerStatus.includes('confirmed') || lowerStatus.includes('accepted') || lowerStatus.includes('arrived')) return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">{status}</Badge>;
    return <Badge variant="secondary">{status}</Badge>;
  };
  
  const isCancellable = (status: ActivityStatus) => {
      const lowerStatus = status.toLowerCase();
      return lowerStatus.includes('pending') || lowerStatus.includes('searching');
  }

  return (
    <div className="container mx-auto max-w-4xl py-8">
        <div className="mb-6">
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <History className="w-8 h-8 text-primary" /> 
                My Activity
            </h2>
            <p className="text-muted-foreground">A unified history of all your rides, appointments, and SOS calls.</p>
        </div>
        
        <div className="space-y-4">
            {isLoading ? (
                Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
            ) : activities.length > 0 ? (
                activities.map(item => (
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
                             {isCancellable(item.status) && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" size="sm" className="mt-1">Cancel</Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>This will cancel your {item.type.toLowerCase()} request. This action cannot be undone.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Go Back</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleCancel(item)} className="bg-destructive hover:bg-destructive/90">Confirm Cancellation</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                             )}
                        </div>
                    </CardContent>
                </Card>
                ))
            ) : (
                <Card className="h-48 flex items-center justify-center">
                    <p className="text-muted-foreground">You don&apos;t have any activity yet.</p>
                </Card>
            )}
        </div>
    </div>
  )
}
