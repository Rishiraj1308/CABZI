
'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Star, History, IndianRupee, Power, AlertTriangle } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from '@/hooks/use-toast'
import { doc, updateDoc, GeoPoint, serverTimestamp, onSnapshot, collection, query, where, arrayUnion, getDoc } from 'firebase/firestore'
import { useFirebase } from '@/firebase/client-provider'
import dynamic from 'next/dynamic'
import type { PartnerData, RideData, JobRequest } from '@/lib/types'
import { AnimatePresence, motion } from 'framer-motion'
import RideStatus from '@/components/ride-status'
import SearchingIndicator from '@/components/ui/searching-indicator'
import { Skeleton } from '@/components/ui/skeleton'
import { useDriver } from './layout'

const LiveMap = dynamic(() => import('@/components/live-map'), { 
    ssr: false,
    loading: () => <div className="w-full h-full bg-muted flex items-center justify-center"><p>Loading Map...</p></div>
});

const StatCard = ({ title, value, icon: Icon, isLoading }: { title: string, value: string, icon: React.ElementType, isLoading?: boolean }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
             {isLoading ? (
                <Skeleton className="h-8 w-20" />
            ) : (
                <div className="text-2xl font-bold">{value}</div>
            )}
        </CardContent>
    </Card>
);

export default function DriverDashboardPage() {
    const [availableJobs, setAvailableJobs] = useState<JobRequest[]>([]);
    const [activeRide, setActiveRide] = useState<RideData | null>(null);
    const [requestTimeout, setRequestTimeout] = useState(15);
    const requestTimerRef = useRef<NodeJS.Timeout | null>(null);
    const notificationSoundRef = useRef<HTMLAudioElement | null>(null);
    
    const { partnerData, isLoading: isDriverLoading } = useDriver(); 

    const { db } = useFirebase();
    const { toast } = useToast();
    const liveMapRef = useRef<any>(null);

    const isOnline = partnerData?.isOnline || false;
    const jobRequest = availableJobs.length > 0 ? availableJobs[0] : null;

    useEffect(() => {
        if (typeof window !== 'undefined') {
            notificationSoundRef.current = new Audio('/sounds/notification.mp3');
        }
    }, []);

    // New onSnapshot listener for ride requests
    useEffect(() => {
        if (!db || !isOnline || activeRide) return;

        const twentySecondsAgo = Timestamp.fromMillis(Date.now() - 20000);
        const ridesRef = collection(db, 'rides');
        const q = query(
            ridesRef, 
            where('status', '==', 'searching'),
            where('createdAt', '>=', twentySecondsAgo)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newJobs: JobRequest[] = [];
            let playSound = false;

            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const job = { id: change.doc.id, ...change.doc.data() } as JobRequest;
                    
                    // Simple distance check (you can make this more complex)
                    // This is a rough check; a geo-query in the Cloud Function is better for production
                    if (partnerData?.currentLocation && job.pickup) {
                        // Assuming job.pickup is a GeoPoint. If not, this needs adjustment.
                        const distance = getDistance(
                            partnerData.currentLocation.latitude, partnerData.currentLocation.longitude,
                            job.pickup.latitude, job.pickup.longitude
                        );
                        if (distance < 10) { // Only consider jobs within 10km
                           newJobs.push(job);
                           playSound = true; // A new relevant job has appeared
                        }
                    } else {
                         newJobs.push(job);
                         playSound = true;
                    }
                }
            });

            if (newJobs.length > 0) {
                 setAvailableJobs(prevJobs => {
                     const existingIds = new Set(prevJobs.map(j => j.id));
                     const uniqueNewJobs = newJobs.filter(j => !existingIds.has(j.id));
                     return [...uniqueNewJobs, ...prevJobs].sort((a,b) => b.createdAt.toMillis() - a.createdAt.toMillis());
                 });
                 if (playSound) {
                    notificationSoundRef.current?.play().catch(e => console.error("Audio play failed:", e));
                 }
            }
        });

        return () => unsubscribe();
    }, [db, isOnline, activeRide, partnerData?.currentLocation]);

    // Simple distance calculator
    const getDistance = (lat1:number, lon1:number, lat2:number, lon2:number) => {
      const R = 6371; // Radius of the earth in km
      const dLat = (lat2-lat1) * Math.PI / 180;
      const dLon = (lon2-lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1* Math.PI/180) * Math.cos(lat2* Math.PI/180) * Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c; // distance in km
    }

    const handleOnlineStatusChange = async (checked: boolean) => {
        if (!partnerData || !db) return;
        
        const partnerRef = doc(db, 'partners', partnerData.id);
        try {
            await updateDoc(partnerRef, { 
                isOnline: checked,
                status: checked ? 'online' : 'offline',
                lastSeen: serverTimestamp() 
            });

            if (checked) {
                liveMapRef.current?.locate();
            } else {
                await updateDoc(partnerRef, { currentLocation: null });
            }
            toast({ title: checked ? "You are now Online" : "You've gone Offline" });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not update your status. Please try again.' });
        }
    }
    
    const handleAcceptJob = async () => {
        if (!jobRequest || !partnerData || !db) return;
        if(requestTimerRef.current) clearInterval(requestTimerRef.current);
        
        const jobRef = doc(db, 'rides', jobRequest.id);
        try {
            await updateDoc(jobRef, { status: 'accepted', driverId: partnerData.id, driverName: partnerData.name, driverDetails: { name: partnerData.name, vehicle: `${partnerData.vehicleBrand} ${partnerData.vehicleName}`, rating: partnerData.rating, photoUrl: partnerData.photoUrl, phone: partnerData.phone, location: partnerData.currentLocation } });
            setAvailableJobs(prev => prev.filter(j => j.id !== jobRequest.id));
            setActiveRide({ id: jobRequest.id, ...jobRequest } as RideData);
            localStorage.setItem('activeRideId', jobRequest.id);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not accept job. It might have been taken.' });
            setAvailableJobs(prev => prev.filter(j => j.id !== jobRequest.id));
        }
    }
    
    const handleDeclineJob = async (isTimeout = false) => {
        if (!jobRequest) return;
        if(requestTimerRef.current) clearInterval(requestTimerRef.current);
        setAvailableJobs(prev => prev.filter(j => j.id !== jobRequest.id));
        if (!isTimeout) toast({ title: "Job Declined" });
        else toast({ variant: 'destructive', title: "Request Timed Out" });
    }
    
    const resetAfterRide = () => {
        setActiveRide(null);
        localStorage.removeItem('activeRideId');
    }

    if (activeRide) {
        return (
             <div className="flex justify-center items-center h-full">
                <RideStatus ride={activeRide} onCancel={resetAfterRide} onDone={resetAfterRide} />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <Card className="shadow-lg">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Your Dashboard</CardTitle>
                            <CardDescription>You are currently <span className={isOnline ? "font-bold text-green-600" : "font-bold text-destructive"}>{isOnline ? "Online" : "Offline"}</span>.</CardDescription>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch id="online-status" checked={isOnline} onCheckedChange={handleOnlineStatusChange} className="data-[state=checked]:bg-green-500" />
                            <Label htmlFor="online-status" className="font-bold text-lg">{isOnline ? 'ONLINE' : 'OFFLINE'}</Label>
                        </div>
                    </div>
                </CardHeader>
                {isOnline && (
                     <CardContent className="text-center py-12">
                        <SearchingIndicator partnerType="path" className="w-24 h-24" />
                        <h3 className="text-xl font-bold mt-4">Waiting for Rides...</h3>
                        <p className="text-muted-foreground text-sm">Your location is being shared to get nearby requests.</p>
                     </CardContent>
                )}
            </Card>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Today's Earnings" value={`₹${(partnerData?.todaysEarnings || 0).toLocaleString()}`} icon={IndianRupee} isLoading={isDriverLoading} />
                <StatCard title="Today's Rides" value={partnerData?.jobsToday?.toString() || '0'} icon={History} isLoading={isDriverLoading} />
                <StatCard title="Acceptance Rate" value={`${partnerData?.acceptanceRate || '95'}%`} icon={Power} isLoading={isDriverLoading} />
                <StatCard title="Rating" value={partnerData?.rating?.toString() || '4.9'} icon={Star} isLoading={isDriverLoading} />
            </div>

            <Card className="bg-gradient-to-r from-primary to-primary/90 text-primary-foreground border-none">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Sparkles className="text-yellow-300"/> AI Earnings Coach</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>Focus on the Cyber Hub area between 5 PM - 8 PM. High demand is expected, and you could earn up to 30% more.</p>
                </CardContent>
            </Card>
            
            <AlertDialog open={!!jobRequest}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="w-8 h-8 text-primary"/> New Ride Request!</AlertDialogTitle>
                        <AlertDialogDescription>Please review the details and respond quickly.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="relative space-y-3 py-4">
                         <div className="absolute top-0 right-0 w-12 h-12 flex items-center justify-center rounded-full border-4 border-primary text-primary font-bold text-xl">
                            {requestTimeout}
                        </div>
                        <div><Label>Pickup</Label><p className="font-semibold">{jobRequest?.pickupAddress}</p></div>
                        <div><Label>Drop</Label><p className="font-semibold">{jobRequest?.destinationAddress}</p></div>
                        <div><Label>Estimated Fare</Label><p className="font-bold text-xl text-green-600">₹{jobRequest?.fare}</p></div>
                    </div>
                    <AlertDialogFooter className="grid grid-cols-2">
                        <Button variant="destructive" onClick={() => handleDeclineJob()}>Decline</Button>
                        <Button onClick={handleAcceptJob}>Accept Ride</Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

    