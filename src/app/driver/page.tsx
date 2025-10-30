
'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Star, History, IndianRupee, Power, AlertTriangle, Sparkles, Eye } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from '@/hooks/use-toast'
import { doc, updateDoc, GeoPoint, serverTimestamp, onSnapshot, collection, query, where, Timestamp } from 'firebase/firestore'
import { useFirebase, useMessaging } from '@/firebase/client-provider'
import { onMessage } from 'firebase/messaging'
import dynamic from 'next/dynamic'
import type { JobRequest, RideData } from '@/lib/types'
import { AnimatePresence, motion } from 'framer-motion'
import RideStatus from '@/components/ride-status'
import SearchingIndicator from '@/components/ui/searching-indicator'
import { Skeleton } from '@/components/ui/skeleton'
import { useDriver } from './layout'
import Image from 'next/image'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

const LiveMap = dynamic(() => import('@/components/live-map'), { 
    ssr: false,
    loading: () => <div className="w-full h-full bg-muted flex items-center justify-center"><p>Loading Map...</p></div>
});

const StatCard = ({ title, value, icon: Icon, isLoading, onValueClick }: { title: string, value: string, icon: React.ElementType, isLoading?: boolean, onValueClick?: () => void }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
             {isLoading ? (
                <Skeleton className="h-8 w-20" />
            ) : (
                 <div className="text-2xl font-bold cursor-pointer" onClick={onValueClick}>
                    {value}
                </div>
            )}
        </CardContent>
    </Card>
);

export default function DriverDashboardPage() {
    const [availableJobs, setAvailableJobs] = useState<JobRequest[]>([]);
    const [activeRide, setActiveRide] = useState<RideData | null>(null);
    const [requestTimeout, setRequestTimeout] = useState(15);
    const requestTimerRef = useRef<NodeJS.Timeout | null>(null);
    const [isEarningsVisible, setIsEarningsVisible] = useState(false);
    const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
    const [pin, setPin] = useState('');
    const earningsTimerRef = useRef<NodeJS.Timeout | null>(null);
    const notificationSoundRef = useRef<HTMLAudioElement | null>(null);
    
    const { partnerData, isLoading: isDriverLoading } = useDriver(); 

    const { db } = useFirebase();
    const messaging = useMessaging();
    const { toast } = useToast();
    const liveMapRef = useRef<any>(null);

    const isOnline = partnerData?.isOnline || false;
    const jobRequest = availableJobs.length > 0 ? availableJobs[0] : null;

    useEffect(() => {
        if (typeof window !== 'undefined') {
            notificationSoundRef.current = new Audio('/sounds/notification.mp3');
        }
    }, []);

    // Listen for new ride requests via FCM
    useEffect(() => {
        if (!messaging || !isOnline || activeRide || !partnerData?.id) {
            return;
        }

        const unsubscribe = onMessage(messaging, (payload) => {
            console.log('FCM Message received in driver dashboard.', payload);
            const { type, rideId, ...jobData } = payload.data || {};

            if(type === 'new_ride_request' && rideId) {
                // Critical Fix: Parse the JSON stringified location data
                const newJobRequest: JobRequest = {
                    id: rideId,
                    ...jobData,
                    pickup: { address: jobData.pickupAddress, location: JSON.parse(jobData.pickupLocation || '{}') },
                    destination: { address: jobData.destinationAddress, location: JSON.parse(jobData.destinationLocation || '{}') },
                    fare: parseFloat(jobData.fare),
                    createdAt: new Timestamp(parseInt(jobData.createdAt) / 1000, 0),
                } as JobRequest;
                
                // Add to the front of the queue if not already present
                setAvailableJobs(prevJobs => {
                    if (prevJobs.some(job => job.id === newJobRequest.id)) {
                        return prevJobs;
                    }
                    return [newJobRequest, ...prevJobs];
                });

                notificationSoundRef.current?.play().catch(e => console.error("Audio play failed:", e));
            }
        });

        return () => unsubscribe();
    }, [messaging, isOnline, partnerData, activeRide]);

    useEffect(() => {
        // This effect is responsible for managing the countdown timer for the oldest job request.
        let timer: NodeJS.Timeout | null = null;
        if (jobRequest) {
            setRequestTimeout(15); // Reset timer for the new job
            timer = setInterval(() => {
                setRequestTimeout(prev => {
                    if (prev <= 1) {
                        if (timer) clearInterval(timer);
                        handleDeclineJob(true); // Automatically decline the current jobRequest
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            requestTimerRef.current = timer;
        } else {
            setRequestTimeout(15);
            if (requestTimerRef.current) {
                clearInterval(requestTimerRef.current);
            }
        }
    
        return () => {
            if (timer) clearInterval(timer);
        };
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [jobRequest]);


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

     const handlePinSubmit = () => {
      const storedPin = localStorage.getItem('curocity-user-pin');
      if (!storedPin) {
          toast({ variant: 'destructive', title: 'PIN Not Set', description: 'Please set a UPI PIN from your wallet first.' });
          return;
      }
      if (pin === storedPin) {
          setIsEarningsVisible(true);
          setIsPinDialogOpen(false);
          setPin('');
          toast({ title: 'Earnings Revealed', description: 'Your earnings for today are now visible.' });

          if (earningsTimerRef.current) clearTimeout(earningsTimerRef.current);
          earningsTimerRef.current = setTimeout(() => {
              setIsEarningsVisible(false);
          }, 10000);
      } else {
          toast({ variant: 'destructive', title: 'Invalid PIN', description: 'Please enter the correct 4-digit PIN.' });
      }
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
                        </div>
                    </div>
                </CardHeader>
                {isOnline && (
                     <CardContent className="text-center py-12">
                        <SearchingIndicator partnerType="path" className="w-32 h-32" />
                        <h3 className="text-3xl font-bold mt-4">Waiting for Rides...</h3>
                        <p className="text-muted-foreground">Your location is being shared to get nearby requests.</p>
                     </CardContent>
                )}
            </Card>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                 <StatCard 
                    title="Today's Earnings" 
                    value={isEarningsVisible ? `₹${(partnerData?.todaysEarnings || 0).toLocaleString()}` : '₹ ****'} 
                    icon={IndianRupee} 
                    isLoading={isDriverLoading}
                    onValueClick={() => !isEarningsVisible && setIsPinDialogOpen(true)}
                />
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
            <Dialog open={isPinDialogOpen} onOpenChange={setIsPinDialogOpen}>
                <DialogContent className="max-w-xs">
                    <DialogHeader>
                        <DialogTitle>Enter PIN to View</DialogTitle>
                        <DialogDescription>For your privacy, please enter your PIN to see today's earnings.</DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col items-center justify-center gap-4 py-4">
                        <Label htmlFor="pin-input" className="sr-only">Enter PIN</Label>
                        <Input 
                            id="pin-input" 
                            type="password" 
                            inputMode="numeric" 
                            maxLength={4}
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            className="text-center text-2xl font-bold tracking-[1em] w-40" 
                            placeholder="••••"
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" className="w-full" onClick={handlePinSubmit}>Submit</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

    