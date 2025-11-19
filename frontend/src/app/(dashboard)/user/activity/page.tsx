
'use client'

import React, { useState, useEffect } from 'react'
import { History, Car, Ambulance, Calendar, Wrench, IndianRupee, MapPin, Route, PartyPopper } from 'lucide-react'
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { format } from 'date-fns'


type ActivityStatus = 'Completed' | 'Cancelled' | 'Pending' | 'Confirmed' | 'Searching' | string;

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
    data: any;
}

export default function MyActivityPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { db, user } = useFirebase();
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null);

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
        { type: 'Emergency' as const, q: query(collection(db, 'emergencyCases'), where('riderId', '==', userUid), orderBy('createdAt', 'desc'))},
        { type: 'ResQ' as const, q: query(collection(db, 'garageRequests'), where('userId', '==', userUid), orderBy('createdAt', 'desc')) }
    ];

    const unsubs: (()=>void)[] = [];

    queries.forEach(({ type, q }) => {
        const unsub = onSnapshot(q, (querySnapshot) => {
            const newActivities: ActivityItem[] = querySnapshot.docs.map(doc => {
                const data = doc.data();
                if (type === 'Ride') {
                    const ride = data as RideData;
                    return { id: doc.id, type, title: `Ride to ${ride.destination?.address?.split(',')[0] || 'destination'}`, description: `Driver: ${ride.driverDetails?.name || 'N/A'}`, date: (ride.createdAt as Timestamp)?.toDate(), status: ride.status, fare: ride.fare, icon: Car, color: 'text-primary', data: ride };
                }
                if (type === 'Appointment') {
                    const appt = data as Appointment;
                    return { id: doc.id, type, title: `Appointment with Dr. ${appt.doctorName || ''}`, description: appt.hospitalName || '', date: (appt.appointmentDate as Timestamp)?.toDate(), status: appt.status, icon: Calendar, color: 'text-blue-500', data: appt };
                }
                if (type === 'Emergency') {
                    const emergency = data as AmbulanceCase;
                    return { id: doc.id, type, title: `Emergency SOS`, description: `Assigned: ${emergency.assignedPartner?.name || 'Searching...'}`, date: (emergency.createdAt as Timestamp)?.toDate(), status: emergency.status, icon: Ambulance, color: 'text-red-500', data: emergency };
                }
                if (type === 'ResQ') {
                    const resq = data as GarageRequest;
                    return { id: doc.id, type, title: `ResQ: ${resq.issue}`, description: `Mechanic: ${resq.mechanicName || 'N/A'}`, date: (resq.createdAt as Timestamp)?.toDate(), status: resq.status, fare: resq.totalAmount, icon: Wrench, color: 'text-amber-600', data: resq };
                }
                return null;
            }).filter(Boolean) as ActivityItem[];
            
             setActivities(prev => {
                const otherActivities = prev.filter(act => act.type !== type);
                return [...otherActivities, ...newActivities].sort((a, b) => b.date.getTime() - a.date.getTime());
            });
            setIsLoading(false);
        });
        unsubs.push(unsub);
    });

    return () => unsubs.forEach(unsub => unsub());
  }, [db, user]);

  const handleCancel = async (item: ActivityItem) => {
    if (!db) return;
    
    let collectionName: string;
    let newStatus: string;

    switch(item.type) {
        case 'Ride': collectionName = 'rides'; newStatus = 'cancelled_by_rider'; break;
        case 'Appointment': collectionName = 'appointments'; newStatus = 'Cancelled'; break;
        case 'Emergency': collectionName = 'emergencyCases'; newStatus = 'cancelled_by_rider'; break;
        case 'ResQ': collectionName = 'garageRequests'; newStatus = 'cancelled_by_user'; break;
        default: toast.error("Cannot cancel this item."); return;
    }
    
    try {
        await updateDoc(doc(db, collectionName, item.id), { status: newStatus });
        toast.success(`${item.type} request has been cancelled.`);
    } catch (error) {
        toast.error("Cancellation Failed");
    }
  };

  const getStatusBadge = (status: ActivityStatus) => {
    const lowerStatus = String(status).toLowerCase().replace(/_/g, ' ');
    if (lowerStatus.includes('completed') || lowerStatus.includes('settled')) return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200 capitalize">{lowerStatus}</Badge>;
    if (lowerStatus.includes('cancel')) return <Badge variant="destructive" className="capitalize">{lowerStatus}</Badge>;
    if (lowerStatus.includes('pending') || lowerStatus.includes('searching')) return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200 capitalize">{lowerStatus}</Badge>;
    if (lowerStatus.includes('confirmed') || lowerStatus.includes('accepted') || lowerStatus.includes('arrived') || lowerStatus.includes('in progress') || lowerStatus.includes('on the way')) return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 capitalize">{lowerStatus}</Badge>;
    return <Badge variant="secondary" className="capitalize">{lowerStatus}</Badge>;
  };
  
  const isCancellable = (status: ActivityStatus) => {
      const lowerStatus = String(status).toLowerCase();
      return lowerStatus.includes('pending') || lowerStatus.includes('searching');
  }

  const renderRideInvoice = (data: RideData) => (
       <div className="space-y-4 py-4 text-sm">
            <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>{data.createdAt ? format(data.createdAt.toDate(), 'PPP, p') : ''}</span>
                <span className="font-mono">Invoice: {data.invoiceId || 'N/A'}</span>
            </div>
            <Separator/>
            <div className="space-y-1"><p className="text-xs text-muted-foreground">Partner:</p><p className="font-semibold">{data.driverDetails?.name} ({data.driverDetails?.vehicle})</p></div>
            <Separator/>
            <div className="flex items-start gap-3"><MapPin className="w-4 h-4 mt-1 text-green-500" /><p><span className="font-semibold text-muted-foreground text-xs">FROM: </span>{data.pickup?.address}</p></div>
            <div className="flex items-start gap-3"><Route className="w-4 h-4 mt-1 text-red-500" /><p><span className="font-semibold text-muted-foreground text-xs">TO: </span>{data.destination?.address}</p></div>
            <Separator />
            <div className="flex justify-between items-center text-lg"><span className="text-muted-foreground">Total Fare</span><span className="font-bold text-primary">₹{data.fare?.toFixed(2)}</span></div>
        </div>
  );

  return (
    <>
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
                  <Card key={item.id} className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => setSelectedActivity(item)}>
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
                              {item.fare && <p className="font-bold text-lg">₹{item.fare?.toFixed(0)}</p>}
                              {isCancellable(item.status) && (
                                  <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                          <Button variant="destructive" size="sm" className="mt-1" onClick={(e) => e.stopPropagation()}>Cancel</Button>
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
                      <p className="text-muted-foreground">You don't have any activity yet.</p>
                  </Card>
              )}
          </div>
      </div>
      <Dialog open={!!selectedActivity} onOpenChange={(isOpen) => !isOpen && setSelectedActivity(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Activity Details</DialogTitle>
                <DialogDescription>A summary of your selected activity.</DialogDescription>
            </DialogHeader>
             {selectedActivity?.type === 'Ride' && renderRideInvoice(selectedActivity.data)}
             {/* TODO: Add invoice views for other activity types */}
        </DialogContent>
      </Dialog>
    </>
  )
}
