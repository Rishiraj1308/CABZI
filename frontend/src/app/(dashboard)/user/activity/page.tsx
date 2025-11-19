
'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
    Activity, Car, Siren, Wrench, Calendar, ArrowRight, MoreHorizontal, FileText, IndianRupee, Route, MapPin
} from 'lucide-react';
import { useFirebase } from '@/lib/firebase/client-provider';
import { collection, query, where, getDocs, orderBy, Timestamp, doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import type { RideData, AmbulanceCase, Appointment, GarageRequest, ClientSession } from "@/lib/types";
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';

type ActivityItem = (RideData | AmbulanceCase | Appointment | GarageRequest) & { activityType: 'Ride' | 'SOS' | 'Appointment' | 'ResQ' };

export default function UserActivityPage() {
    const { user, db, isUserLoading } = useFirebase();
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null);

    useEffect(() => {
        if (isUserLoading || !user || !db) {
            if(!isUserLoading) setIsLoading(false);
            return;
        }

        const fetchAllActivity = async () => {
            setIsLoading(true);
            try {
                // Corrected field names for queries
                const ridesQuery = query(collection(db, 'rides'), where('riderId', '==', user.uid), orderBy('createdAt', 'desc'));
                const casesQuery = query(collection(db, 'emergencyCases'), where('riderId', '==', user.uid), orderBy('createdAt', 'desc'));
                const appointmentsQuery = query(collection(db, 'appointments'), where('patientId', '==', user.uid), orderBy('createdAt', 'desc'));
                const garageRequestsQuery = query(collection(db, 'garageRequests'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));

                const [ridesSnapshot, casesSnapshot, appointmentsSnapshot, garageRequestsSnapshot] = await Promise.all([
                    getDocs(ridesQuery),
                    getDocs(casesQuery),
                    getDocs(appointmentsQuery),
                    getDocs(garageRequestsQuery),
                ]);

                const combinedActivities: ActivityItem[] = [
                    ...ridesSnapshot.docs.map(doc => ({ activityType: 'Ride' as const, id: doc.id, ...doc.data(), title: `Ride to ${doc.data().destination?.address?.split(',')[0] || 'destination'}`, description: `Partner: ${doc.data().driverDetails?.name || 'N/A'}` } as ActivityItem)),
                    ...casesSnapshot.docs.map(doc => ({ activityType: 'SOS' as const, id: doc.id, ...doc.data(), title: `Emergency SOS`, description: `Hospital: ${doc.data().assignedPartner?.name || 'N/A'}` } as ActivityItem)),
                    ...appointmentsSnapshot.docs.map(doc => ({ activityType: 'Appointment' as const, id: doc.id, ...doc.data(), title: `Dr. ${doc.data().doctorName}`, description: doc.data().hospitalName || '' } as ActivityItem)),
                    ...garageRequestsSnapshot.docs.map(doc => ({ activityType: 'ResQ' as const, id: doc.id, ...doc.data(), title: `ResQ: ${doc.data().issue}`, description: `Mechanic: ${doc.data().mechanicName || 'N/A'}` } as ActivityItem)),
                ];
                
                combinedActivities.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
                
                setActivities(combinedActivities);

            } catch (error) {
                console.error("Error fetching user activity:", error);
                toast.error("Error", { description: "Could not load your activity history." });
            } finally {
                setIsLoading(false);
            }
        };

        fetchAllActivity();
    }, [user, isUserLoading, db]);

    const getStatusBadge = (status?: string) => {
        const lowerStatus = (status || '').toLowerCase().replace(/_/g, ' ');
        if (lowerStatus.includes('completed') || lowerStatus.includes('settled')) return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200 capitalize">{lowerStatus}</Badge>;
        if (lowerStatus.includes('cancel')) return <Badge variant="destructive" className="capitalize">{lowerStatus}</Badge>;
        if (lowerStatus.includes('pending') || lowerStatus.includes('searching')) return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200 capitalize">{lowerStatus}</Badge>;
        if (lowerStatus.includes('confirmed') || lowerStatus.includes('accepted') || lowerStatus.includes('arrived') || lowerStatus.includes('in progress')) return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 capitalize">{lowerStatus}</Badge>;
        return <Badge variant="secondary" className="capitalize">{lowerStatus}</Badge>;
    };

    const ActivityIcon = ({ type }: { type: string }) => {
        switch (type) {
            case 'Ride': return <Car className="w-4 h-4 text-primary" />;
            case 'SOS': return <Siren className="w-4 h-4 text-destructive" />;
            case 'Appointment': return <Calendar className="w-4 h-4 text-blue-500" />;
            case 'ResQ': return <Wrench className="w-4 h-4 text-amber-600" />;
            default: return <Activity className="w-4 h-4" />;
        }
    };
    
    const renderRideDetails = (activity: RideData) => (
      <div className="space-y-4 py-4 text-sm">
        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <span>{format(activity.createdAt.toDate(), 'PPP, p')}</span>
          <span className="font-mono">Invoice: {activity.invoiceId || 'N/A'}</span>
        </div>
        <Separator/>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Driver:</p>
          <p className="font-semibold">{activity.driverDetails?.name || 'N/A'}</p>
          <p className="text-xs text-muted-foreground">{activity.driverDetails?.vehicle} • {activity.vehicleNumber}</p>
        </div>
        <Separator/>
        <div className="flex items-start gap-3">
          <MapPin className="w-4 h-4 mt-1 text-green-500"/>
          <p><span className="font-semibold text-muted-foreground text-xs">FROM: </span>{activity.pickup?.address}</p>
        </div>
        <div className="flex items-start gap-3">
          <Route className="w-4 h-4 mt-1 text-red-500"/>
          <p><span className="font-semibold text-muted-foreground text-xs">TO: </span>{activity.destination?.address}</p>
        </div>
        <Separator />
        <div className="flex justify-between items-center text-lg">
          <span className="text-muted-foreground">Total Fare</span>
          <span className="font-bold text-primary">₹{activity.fare?.toFixed(2) || '0.00'}</span>
        </div>
      </div>
    );

    return (
        <div className="p-4 md:p-6 space-y-6">
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <Activity className="w-8 h-8" />
                My Activity
            </h2>

            <Card>
                <CardHeader>
                    <CardTitle>Activity History</CardTitle>
                    <CardDescription>A complete log of all your interactions on the Curocity platform.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Service</TableHead>
                                <TableHead>Details</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell>
                                    </TableRow>
                                ))
                            ) : activities.length > 0 ? (
                                activities.map(activity => (
                                    <TableRow key={activity.id}>
                                        <TableCell><div className="flex items-center gap-2 font-semibold"><ActivityIcon type={activity.activityType} /> {activity.activityType}</div></TableCell>
                                        <TableCell className="text-sm"><p className="font-medium truncate">{activity.title}</p><p className="text-xs text-muted-foreground truncate">{activity.description}</p></TableCell>
                                        <TableCell>{activity.createdAt ? format(activity.createdAt.toDate(), 'PPP') : 'N/A'}</TableCell>
                                        <TableCell>{getStatusBadge(activity.status)}</TableCell>
                                        <TableCell className="text-right">
                                            {activity.activityType === 'Ride' && (
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" onClick={() => setSelectedActivity(activity)}><FileText className="w-4 h-4" /></Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <DialogHeader>
                                                            <DialogTitle>Ride Invoice</DialogTitle>
                                                        </DialogHeader>
                                                        {selectedActivity && renderRideDetails(selectedActivity as RideData)}
                                                    </DialogContent>
                                                </Dialog>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No activity history found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
