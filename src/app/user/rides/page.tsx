'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin, History, Car, Ambulance, Calendar, User, Clock, IndianRupee, KeyRound } from 'lucide-react'
import { useFirebase } from '@/firebase/client-provider'
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

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
    // Add all possible fields for the dialog
    driverName?: string;
    vehicle?: string;
    pickupAddress?: string;
    destinationAddress?: string;
    caseId?: string;
    assignedPartnerName?: string;
    doctorName?: string;
    hospitalName?: string;
    appointmentDate?: Timestamp;
    otp?: string;
}

export default function MyActivityPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null);
  const { db, user } = useFirebase();
  const { toast } = useToast();

  useEffect(() => {
    if (!db || !user) {
        setIsLoading(false);
        return;
    }
    
    const userId = user.uid;

    const queries = [
        query(collection(db, 'rides'), where('riderId', '==', userId), orderBy('createdAt', 'desc')),
        query(collection(db, 'appointments'), where('patientId', '==', userId), orderBy('createdAt', 'desc')),
        query(collection(db, 'emergencyCases'), where('riderId', '==', userId), orderBy('createdAt', 'desc'))
    ];
    
    const unsubs = queries.map((q, index) => {
        return onSnapshot(q, (querySnapshot) => {
            const newActivities: ActivityItem[] = querySnapshot.docs.map(doc => {
                const data = doc.data();
                if (index === 0) { // Rides
                    return {
                        id: doc.id,
                        type: 'Ride',
                        title: `Ride to ${data.destination?.address || 'destination'}`,
                        description: `From: ${data.pickup?.address || 'start'}`,
                        date: (data.createdAt as Timestamp).toDate(),
                        status: data.status.charAt(0).toUpperCase() + data.status.slice(1).replace(/_/g, ' '),
                        fare: data.fare,
                        icon: Car,
                        color: 'text-primary',
                        driverName: data.driverDetails?.name,
                        vehicle: data.driverDetails?.vehicle,
                        pickupAddress: data.pickup?.address,
                        destinationAddress: data.destination?.address,
                        otp: data.otp,
                    };
                } else if (index === 1) { // Appointments
                    return {
                        id: doc.id,
                        type: 'Appointment',
                        title: `Appointment with ${data.doctorName}`,
                        description: data.hospitalName,
                        date: (data.appointmentDate as Timestamp).toDate(),
                        status: data.status,
                        icon: Calendar,
                        color: 'text-blue-500',
                        doctorName: data.doctorName,
                        hospitalName: data.hospitalName,
                        appointmentDate: data.appointmentDate,
                    };
                } else { // Emergency Cases
                     return {
                        id: doc.id,
                        type: 'Emergency',
                        title: `SOS Case: ${data.caseId}`,
                        description: `Assigned to: ${data.assignedPartner?.name || 'Searching...'}`,
                        date: (data.createdAt as Timestamp).toDate(),
                        status: data.status.charAt(0).toUpperCase() + data.status.slice(1).replace(/_/g, ' '),
                        icon: Ambulance,
                        color: 'text-red-500',
                        caseId: data.caseId,
                        assignedPartnerName: data.assignedPartner?.name,
                        otp: data.otp,
                    };
                }
            });

            setActivities(prev => {
                const typeToUpdate = index === 0 ? 'Ride' : index === 1 ? 'Appointment' : 'Emergency';
                const otherActivities = prev.filter(act => act.type !== typeToUpdate);
                const all = [...otherActivities, ...newActivities].sort((a, b) => b.date.getTime() - a.date.getTime());
                return all;
            });

        }, (error) => {
            console.error("Error fetching activity:", error);
            toast({ variant: 'destructive', title: "Error", description: "Could not load part of your activity history."});
        });
    });

    setIsLoading(false);
    return () => unsubs.forEach(unsub => unsub());

  }, [db, user, toast]);

  const getStatusBadge = (status: ActivityStatus) => {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes('completed')) return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">{status}</Badge>;
    if (lowerStatus.includes('cancel')) return <Badge variant="destructive">{status}</Badge>;
    if (lowerStatus.includes('pending') || lowerStatus.includes('searching')) return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">{status}</Badge>;
    if (lowerStatus.includes('confirmed') || lowerStatus.includes('accepted') || lowerStatus.includes('transit')) return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">{status}</Badge>;
    return <Badge variant="secondary">{status}</Badge>;
  };
  
    const DetailRow = ({ icon: Icon, label, value, valueClass, isMono }: { icon: React.ElementType, label: string, value: string | React.ReactNode, valueClass?: string, isMono?: boolean }) => (
        <div className="flex items-start">
            <div className="w-2/5 flex items-center text-muted-foreground gap-2">
                <Icon className="w-4 h-4" />
                <span>{label}</span>
            </div>
            <div className={`w-3/5 font-medium text-right ${valueClass} ${isMono ? 'font-mono' : ''}`}>{value}</div>
        </div>
    );

  const renderDialogContent = () => {
    if (!selectedActivity) return null;

    switch (selectedActivity.type) {
      case 'Ride':
        return (
          <>
            <DialogHeader>
                <div className="flex items-center gap-4">
                    <Avatar className="w-16 h-16"><AvatarImage src="https://placehold.co/100x100.png" data-ai-hint="driver portrait" /><AvatarFallback>{selectedActivity.driverName?.substring(0, 2)}</AvatarFallback></Avatar>
                    <div>
                        <DialogTitle className="text-2xl">Ride with {selectedActivity.driverName}</DialogTitle>
                        <DialogDescription>{selectedActivity.vehicle}</DialogDescription>
                    </div>
                </div>
            </DialogHeader>
            <div className="space-y-4 text-sm py-4 border-t mt-4">
              <DetailRow icon={MapPin} label="Pickup" value={selectedActivity.pickupAddress || 'N/A'} />
              <DetailRow icon={MapPin} label="Drop" value={selectedActivity.destinationAddress || 'N/A'} />
              <DetailRow icon={Clock} label="Date" value={selectedActivity.date.toLocaleString()} />
              <DetailRow icon={History} label="Status" value={getStatusBadge(selectedActivity.status)} />
              <DetailRow icon={KeyRound} label="OTP" value={selectedActivity.otp || 'N/A'} isMono valueClass="text-lg" />
              <div className="border-t my-2"></div>
              <DetailRow icon={IndianRupee} label="Fare" value={`₹${selectedActivity.fare?.toFixed(2) || '0.00'}`} valueClass="text-xl font-bold text-primary" />
            </div>
          </>
        );
      case 'Appointment':
         return (
          <>
            <DialogHeader>
              <div className="flex items-center gap-4">
                 <Avatar className="w-16 h-16"><AvatarImage src="https://placehold.co/100x100.png" data-ai-hint="doctor portrait"/><AvatarFallback>{selectedActivity.doctorName?.substring(3, 5)}</AvatarFallback></Avatar>
                 <div>
                    <DialogTitle className="text-2xl">{selectedActivity.doctorName}</DialogTitle>
                    <DialogDescription>{selectedActivity.hospitalName}</DialogDescription>
                 </div>
              </div>
            </DialogHeader>
             <div className="space-y-4 text-sm py-4 border-t mt-4">
                <DetailRow icon={Clock} label="Date & Time" value={selectedActivity.appointmentDate?.toDate().toLocaleString() || 'N/A'} />
                <DetailRow icon={History} label="Status" value={getStatusBadge(selectedActivity.status)} />
            </div>
          </>
        );
      case 'Emergency':
         return (
           <>
             <DialogHeader>
                <div className="flex items-center gap-4">
                   <div className="p-3 bg-red-100 rounded-full"><Ambulance className="w-8 h-8 text-red-600"/></div>
                   <div>
                      <DialogTitle className="text-2xl">SOS Case: {selectedActivity.caseId}</DialogTitle>
                      <DialogDescription>Emergency request details.</DialogDescription>
                   </div>
                </div>
            </DialogHeader>
             <div className="space-y-4 text-sm py-4 border-t mt-4">
                <DetailRow icon={Clock} label="Date" value={selectedActivity.date.toLocaleString()} />
                <DetailRow icon={User} label="Assigned Partner" value={selectedActivity.assignedPartnerName || 'N/A'} />
                <DetailRow icon={History} label="Status" value={getStatusBadge(selectedActivity.status)} />
            </div>
          </>
        );
      default:
        return <p>Details not available.</p>;
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
        <div className="animate-fade-in">
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <History className="w-8 h-8 text-primary" /> 
                My Activity
            </h2>
            <p className="text-muted-foreground">A unified history of all your rides, appointments, and SOS calls.</p>
        </div>
        
        <Dialog onOpenChange={(open) => !open && setSelectedActivity(null)}>
            <div className="space-y-4 animate-fade-in">
                {isLoading ? (
                    Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
                ) : activities.length > 0 ? (
                    activities.map(item => (
                        <DialogTrigger asChild key={item.id}>
                            <Card className="hover:bg-muted/50 cursor-pointer" onClick={() => setSelectedActivity(item)}>
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
                                    </div>
                                </CardContent>
                            </Card>
                        </DialogTrigger>
                    ))
                ) : (
                    <Card className="h-48 flex items-center justify-center">
                        <p className="text-muted-foreground">You don&apos;t have any activity yet.</p>
                    </Card>
                )}
            </div>
            <DialogContent className="max-w-md">
              {renderDialogContent()}
               <DialogFooter>
                  <Button variant="outline" onClick={() => setSelectedActivity(null)}>Close</Button>
               </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  )
}
