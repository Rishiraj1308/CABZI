
'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Star, History, IndianRupee, Power, LocateFixed, AlertTriangle, X } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from '@/hooks/use-toast'
import { doc, updateDoc, GeoPoint, serverTimestamp, onSnapshot, collection, query, where, arrayUnion } from 'firebase/firestore'
import { useFirebase, useMessaging } from '@/firebase/client-provider'
import dynamic from 'next/dynamic'
import type { PartnerData, RideData, JobRequest } from '@/lib/types'
import { AnimatePresence, motion } from 'framer-motion'
import { onMessage } from 'firebase/messaging'
import RideStatus from '@/components/ride-status'
import SearchingIndicator from '@/components/ui/searching-indicator'

const LiveMap = dynamic(() => import('@/components/live-map'), { 
    ssr: false,
    loading: () => <div className="w-full h-full bg-muted flex items-center justify-center"><p>Loading Map...</p></div>
});

const StatCard = ({ title, value, icon: Icon }: { title: string, value: string, icon: React.ElementType }) => (
    <Card className="bg-transparent border-0 shadow-none">
        <CardContent className="p-2 text-center">
            <Icon className="w-6 h-6 mx-auto mb-1 text-muted-foreground"/>
            <p className="font-bold text-lg">{value}</p>
            <p className="text-xs text-muted-foreground">{title}</p>
        </CardContent>
    </Card>
);

export default function DriverDashboardPage({ partnerData, setPartnerData }: { partnerData: PartnerData | null, setPartnerData: (data: PartnerData) => void }) {
    const [isOnline, setIsOnline] = useState(partnerData?.isOnline || false);
    const [jobRequest, setJobRequest] = useState<JobRequest | null>(null);
    const [activeRide, setActiveRide] = useState<RideData | null>(null);
    const [requestTimeout, setRequestTimeout] = useState(15);
    const requestTimerRef = useRef<NodeJS.Timeout | null>(null);

    const { db } = useFirebase();
    const { toast } = useToast();
    const messaging = useMessaging();
    const liveMapRef = useRef<any>(null);

    // This effect handles real-time job requests via FCM
    useEffect(() => {
        if (!messaging || !isOnline || !partnerData?.id || activeRide || jobRequest) return;

        const unsubscribe = onMessage(messaging, (payload) => {
            const { type, rideId } = payload.data || {};
            if (type === 'new_ride_request' && rideId) {
                const rideDocRef = doc(db, 'rides', rideId);
                getDoc(rideDocRef).then(rideSnap => {
                    if (rideSnap.exists()) {
                        setJobRequest({ id: rideSnap.id, ...rideSnap.data() } as JobRequest);
                    }
                });
            }
        });
        return () => unsubscribe();
    }, [messaging, isOnline, partnerData, activeRide, jobRequest, db]);
    
    // This effect tracks the status of an accepted ride
    useEffect(() => {
        if(!db || !activeRide?.id) return;
        const rideRef = doc(db, 'rides', activeRide.id);
        const unsubscribe = onSnapshot(rideRef, (docSnap) => {
            if (docSnap.exists()) {
                const status = docSnap.data().status;
                if(status === 'completed' || status.startsWith('cancelled')) {
                    setActiveRide(null);
                    localStorage.removeItem('activeRideId');
                } else {
                    setActiveRide({ id: docSnap.id, ...docSnap.data() } as RideData);
                }
            }
        });
        return () => unsubscribe();
    }, [db, activeRide?.id]);
    
     // Check for an active ride on initial load
    useEffect(() => {
        const activeRideId = localStorage.getItem('activeRideId');
        if(activeRideId && db) {
            const rideRef = doc(db, 'rides', activeRideId);
            getDoc(rideRef).then(docSnap => {
                if(docSnap.exists() && !['completed', 'cancelled_by_driver', 'cancelled_by_rider'].includes(docSnap.data().status)) {
                    setActiveRide({ id: docSnap.id, ...docSnap.data()} as RideData);
                }
            })
        }
    }, [db]);


    const handleOnlineStatusChange = async (checked: boolean) => {
        if (!partnerData || !db) return;
        setIsOnline(checked);
        const partnerRef = doc(db, 'partners', partnerData.id);
        try {
            await updateDoc(partnerRef, { 
                isOnline: checked,
                status: checked ? 'online' : 'offline',
                lastSeen: serverTimestamp() 
            });
            if (checked) liveMapRef.current?.locate();
            toast({ title: checked ? "You are now Online" : "You've gone Offline" });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not update your status.' });
            setIsOnline(!checked);
        }
    }
    
    const handleAcceptJob = async () => {
        if (!jobRequest || !partnerData || !db) return;
        if(requestTimerRef.current) clearInterval(requestTimerRef.current);
        
        const jobRef = doc(db, 'rides', jobRequest.id);
        try {
            await updateDoc(jobRef, { status: 'accepted', driverId: partnerData.id, driverName: partnerData.name, driverDetails: { name: partnerData.name, vehicle: `${partnerData.vehicleBrand} ${partnerData.vehicleName}`, rating: partnerData.rating, photoUrl: partnerData.photoUrl, phone: partnerData.phone, location: partnerData.currentLocation } });
            setAcceptedJob({ id: jobRequest.id, ...jobRequest });
            setJobRequest(null);
            localStorage.setItem('activeRideId', jobRequest.id);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not accept job. It might have been taken.' });
            setJobRequest(null);
        }
    }
    
    const handleDeclineJob = async (isTimeout = false) => {
        if (!jobRequest || !partnerData || !db) return;
        if(requestTimerRef.current) clearInterval(requestTimerRef.current);

        const jobRef = doc(db, 'rides', jobRequest.id);
        await updateDoc(jobRef, { rejectedBy: arrayUnion(partnerData.id) });
        
        if (!isTimeout) toast({ title: "Job Declined" });
        else toast({ variant: 'destructive', title: "Request Timed Out" });
        setJobRequest(null);
    }
    
    const resetAfterRide = () => {
        setActiveRide(null);
        localStorage.removeItem('activeRideId');
    }

    return (
        <div className="w-full h-full relative">
            <LiveMap
                ref={liveMapRef}
                onLocationFound={(address, coords) => {
                    if (partnerData && db) {
                        const partnerRef = doc(db, 'partners', partnerData.id);
                        updateDoc(partnerRef, { currentLocation: new GeoPoint(coords.lat, coords.lon) });
                    }
                }}
            />
            
            <div className="absolute top-4 right-4 z-10">
                <Card className="p-2 bg-background/80 backdrop-blur-sm flex items-center gap-2 shadow-lg">
                    <div className="flex items-center space-x-2">
                        <Switch id="online-status" checked={isOnline} onCheckedChange={handleOnlineStatusChange} className="data-[state=checked]:bg-green-500" />
                        <Label htmlFor="online-status" className="font-bold text-lg">{isOnline ? 'ONLINE' : 'OFFLINE'}</Label>
                    </div>
                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => liveMapRef.current?.locate()}>
                        <LocateFixed className="w-5 h-5"/>
                    </Button>
               </Card>
            </div>
            
             <AnimatePresence>
                {!activeRide && (
                    <motion.div
                        key="dashboard-card"
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                        className="absolute bottom-0 left-0 right-0 z-10"
                    >
                        <Card className="w-full max-w-2xl mx-auto rounded-t-2xl rounded-b-none shadow-2xl p-4">
                            {isOnline ? (
                                <div className="text-center py-8">
                                    <SearchingIndicator partnerType="path" />
                                    <h3 className="text-2xl font-bold mt-4">You are Online</h3>
                                    <p className="text-muted-foreground">Waiting for nearby ride requests...</p>
                                </div>
                            ) : (
                                <>
                                 <CardHeader>
                                    <CardTitle>Welcome Back, {partnerData?.name || 'Partner'}!</CardTitle>
                                    <CardDescription>You are currently offline. Go online to start receiving rides.</CardDescription>
                                </CardHeader>
                                <CardContent className="grid grid-cols-3 gap-2">
                                    <StatCard title="Today's Rides" value={partnerData?.jobsToday?.toString() || '0'} icon={History} />
                                    <StatCard title="Today's Earnings" value={`₹${partnerData?.todaysEarnings?.toLocaleString() || '0'}`} icon={IndianRupee} />
                                    <StatCard title="Rating" value={partnerData?.rating?.toString() || 'N/A'} icon={Star} />
                                </CardContent>
                                </>
                            )}
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
            
            <AnimatePresence>
                {activeRide && (
                     <motion.div
                        key="ride-status-card"
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                        className="absolute bottom-0 left-0 right-0 z-10 p-4"
                    >
                         <RideStatus ride={activeRide} onCancel={resetAfterRide} onDone={resetAfterRide} />
                    </motion.div>
                )}
            </AnimatePresence>

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
                        <div><Label>Pickup</Label><p className="font-semibold">{jobRequest?.pickup?.address}</p></div>
                        <div><Label>Drop</Label><p className="font-semibold">{jobRequest?.destination?.address}</p></div>
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
