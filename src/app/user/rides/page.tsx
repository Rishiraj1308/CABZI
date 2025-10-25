
'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin, History, Car, Ambulance, Calendar } from 'lucide-react'
import { useFirebase } from '@/firebase/client-provider'
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'

type ActivityStatus = 'Completed' | 'Cancelled' | 'Pending' | 'Confirmed' | string;

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
  const { toast } = useToast();

  useEffect(() => {
    if (!db || !user) {
        setIsLoading(false);
        return;
    }
    
    const userPhone = user.phoneNumber?.replace('+91', '');
    if (!userPhone) {
        toast({ variant: 'destructive', title: "Authentication Error", description: "Could not verify your user details." });
        setIsLoading(false);
        return;
    }

    const queries = [
        query(collection(db, 'rides'), where('riderId', '==', user.uid), orderBy('createdAt', 'desc')),
        query(collection(db, 'appointments'), where('patientId', '==', user.uid), orderBy('createdAt', 'desc')),
        query(collection(db, 'emergencyCases'), where('riderId', '==', user.uid), orderBy('createdAt', 'desc'))
    ];

    const unsubscribes = queries.map((q, index) => {
        return onSnapshot(q, (querySnapshot) => {
            let newActivities: ActivityItem[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (index === 0) { // Rides
                    newActivities.push({
                        id: doc.id,
                        type: 'Ride',
                        title: `Ride to ${data.destination?.address || 'destination'}`,
                        description: `From: ${data.pickup?.address || 'start'}`,
                        date: (data.createdAt as Timestamp).toDate(),
                        status: data.status.charAt(0).toUpperCase() + data.status.slice(1).replace(/_/g, ' '),
                        fare: data.fare,
                        icon: Car,
                        color: 'text-primary'
                    });
                } else if (index === 1) { // Appointments
                    newActivities.push({
                        id: doc.id,
                        type: 'Appointment',
                        title: `Appointment with ${data.doctorName}`,
                        description: data.hospitalName,
                        date: (data.appointmentDate as Timestamp).toDate(),
                        status: data.status,
                        icon: Calendar,
                        color: 'text-blue-500'
                    });
                } else if (index === 2) { // Emergency Cases
                     newActivities.push({
                        id: doc.id,
                        type: 'Emergency',
                        title: `SOS Case: ${data.caseId}`,
                        description: `Assigned to: ${data.assignedPartner?.name || 'Searching...'}`,
                        date: (data.createdAt as Timestamp).toDate(),
                        status: data.status.charAt(0).toUpperCase() + data.status.slice(1).replace(/_/g, ' '),
                        icon: Ambulance,
                        color: 'text-red-500'
                    });
                }
            });
            
             setActivities(prev => {
                // Filter out old activities of the same type and merge new ones
                const otherActivities = prev.filter(act => act.type !== newActivities[0]?.type);
                return [...otherActivities, ...newActivities].sort((a, b) => b.date.getTime() - a.date.getTime());
            });
            
        }, (error) => {
            console.error("Error fetching activity:", error);
            toast({ variant: 'destructive', title: "Error", description: "Could not load part of your activity history."});
        });
    });
    
    // Once all listeners are set up, loading is complete.
    setIsLoading(false);

    return () => unsubscribes.forEach(unsub => unsub());
  }, [db, user, toast]);

  const getStatusBadge = (status: ActivityStatus) => {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes('completed')) return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">{status}</Badge>;
    if (lowerStatus.includes('cancel')) return <Badge variant="destructive">{status}</Badge>;
    if (lowerStatus.includes('pending')) return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">{status}</Badge>;
    if (lowerStatus.includes('confirmed')) return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">{status}</Badge>;
    return <Badge variant="secondary">{status}</Badge>;
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
        <div className="animate-fade-in">
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <History className="w-8 h-8 text-primary" /> 
                My Activity
            </h2>
            <p className="text-muted-foreground">A unified history of all your rides, appointments, and SOS calls.</p>
        </div>
        
        <div className="space-y-4 animate-fade-in">
            {isLoading ? (
                Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
            ) : activities.length > 0 ? (
                activities.map(item => (
                <Card key={item.id} className="hover:bg-muted/50 cursor-pointer">
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
                <Card className="h-48 flex items-center justify-center">
                    <p className="text-muted-foreground">You don&apos;t have any activity yet.</p>
                </Card>
            )}
        </div>
    </div>
  )
}
