
'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin, History, Car, Ambulance, Calendar, Wrench, X, ArrowRight } from 'lucide-react'
import { useFirebase } from '@/firebase/client-provider'
import { collection, query, where, orderBy, onSnapshot, Timestamp, doc, updateDoc } from 'firebase/firestore'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
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

type ActivityStatus = 'Completed' | 'Cancelled' | 'Pending' | 'Confirmed' | string;

interface ActivityItem {
    id: string;
    type: 'Ride' | 'Appointment' | 'Emergency' | 'ResQ';
    title: string;
    description: string;
    date: Date;
    status: ActivityStatus;
    fare?: number;
    icon: React.ElementType;
    color: string;
    href: string;
    cancellable?: boolean;
    collectionName?: string;
}

export default function MyActivityPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { db, user } = useFirebase();
  const { toast } = useToast();

  const handleCancel = async (e: React.MouseEvent, item: ActivityItem) => {
    e.stopPropagation(); // Prevent the link from firing
    e.preventDefault();
    if (!db || !item.collectionName) return;

    const docRef = doc(db, item.collectionName, item.id);
    try {
        await updateDoc(docRef, { status: 'cancelled_by_user' }); // A generic cancelled status
        toast({ title: "Request Cancelled", description: `${item.type} request has been cancelled.` });
    } catch (error) {
        toast({ variant: 'destructive', title: "Error", description: `Could not cancel the ${item.type} request.` });
    }
  }

  useEffect(() => {
    if (!db || !user) {
      setIsLoading(false);
      return;
    }

    const activityTypes = [
      { name: 'rides', type: 'Ride' as const, icon: Car, color: 'text-primary', href: '/user/book' },
      { name: 'appointments', type: 'Appointment' as const, icon: Calendar, color: 'text-blue-500', href: '/user/appointments' },
      { name: 'emergencyCases', type: 'Emergency' as const, icon: Ambulance, color: 'text-red-500', href: '/user' },
      { name: 'garageRequests', type: 'ResQ' as const, icon: Wrench, color: 'text-amber-500', href: '/user/resq' },
    ];

    const unsubscribes = activityTypes.map(({ name, type, icon, color, href }) => {
      const collectionName = name;
      const idField = name === 'rides' || name === 'emergencyCases' ? 'riderId' : name === 'appointments' ? 'patientId' : 'driverId';

      const q = query(collection(db, collectionName), where(idField, '==', user.uid), orderBy('createdAt', 'desc'));
      
      return onSnapshot(q, (snapshot) => {
        const newItems = snapshot.docs.map(doc => {
          const data = doc.data();
          let title = '';
          let description = '';
          let date = (data.createdAt as Timestamp)?.toDate() || new Date();
          let cancellable = false;

          switch (type) {
            case 'Ride':
              title = `Ride to ${data.destination?.address || 'destination'}`;
              description = `From: ${data.pickup?.address || 'start'}`;
              cancellable = ['searching', 'accepted'].includes(data.status);
              break;
            case 'Appointment':
              title = `Appointment with ${data.doctorName}`;
              description = data.hospitalName;
              date = (data.appointmentDate as Timestamp)?.toDate();
              cancellable = data.status === 'Pending';
              break;
            case 'Emergency':
              title = `SOS Case: ${data.caseId}`;
              description = `Assigned to: ${data.assignedPartner?.name || 'Searching...'}`;
              cancellable = data.status === 'pending';
              break;
            case 'ResQ':
              title = `ResQ Request: ${data.issue}`;
              description = `Mechanic: ${data.mechanicName || 'Searching...'}`;
              cancellable = data.status === 'pending';
              break;
          }
          
          return {
            id: doc.id,
            type,
            title,
            description,
            date,
            status: data.status ? String(data.status).charAt(0).toUpperCase() + String(data.status).slice(1).replace(/_/g, ' ') : 'Unknown',
            fare: data.fare || data.totalAmount,
            icon,
            color,
            href,
            cancellable,
            collectionName,
          };
        });

        setActivities(prev => {
          const otherItems = prev.filter(item => item.type !== type);
          return [...otherItems, ...newItems].sort((a, b) => b.date.getTime() - a.date.getTime());
        });
        setIsLoading(false);
      }, (error) => {
        console.error(`Error fetching ${name}:`, error);
        toast({ variant: 'destructive', title: "Error", description: `Could not load ${type} history.` });
        setIsLoading(false);
      });
    });

    return () => unsubscribes.forEach(unsub => unsub());

  }, [db, user, toast]);

  const getStatusBadge = (status: ActivityStatus) => {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes('completed')) return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">{status}</Badge>;
    if (lowerStatus.includes('cancel')) return <Badge variant="destructive">{status}</Badge>;
    if (lowerStatus.includes('pending') || lowerStatus.includes('searching')) return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">{status}</Badge>;
    if (lowerStatus.includes('confirmed') || lowerStatus.includes('accepted') || lowerStatus.includes('transit') || lowerStatus.includes('progress') || lowerStatus.includes('bill')) return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">{status}</Badge>;
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
                <Card key={item.id} className="hover:bg-muted/50">
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
                                {item.fare != null && <p className="font-bold text-lg">~₹{item.fare?.toFixed(0)}</p>}
                                {item.cancellable ? (
                                    <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="sm" className="text-destructive h-auto p-1 mt-1 text-xs" onClick={(e) => e.stopPropagation()}>
                                            <X className="w-3 h-3 mr-1" />
                                            Cancel
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This will cancel your {item.type} request. This action cannot be undone.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Go Back</AlertDialogCancel>
                                            <AlertDialogAction onClick={(e) => handleCancel(e, item)} className="bg-destructive hover:bg-destructive/90">
                                                Yes, Cancel Request
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                                ) : (
                                     <Link href={item.href} passHref legacyBehavior>
                                        <a className="mt-1">
                                            <Button variant="outline" size="sm" className="h-auto p-1 px-2 text-xs">
                                                View Details <ArrowRight className="w-3 h-3 ml-1" />
                                            </Button>
                                        </a>
                                    </Link>
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
