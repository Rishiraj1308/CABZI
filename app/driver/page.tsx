
'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Star, History, IndianRupee, Power, KeyRound, Clock, MapPin, Route, Navigation, CheckCircle, Sparkles, Eye } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from '@/hooks/use-toast'
import {
  doc,
  updateDoc,
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
  GeoPoint,
  serverTimestamp,
  getDoc,
  runTransaction,
  arrayUnion,
  orderBy,
  limit
} from 'firebase/firestore'
import { useFirebase } from '@/firebase/client-provider'
import dynamic from 'next/dynamic'
import type { JobRequest, RideData } from '@/lib/types'
import { Skeleton } from '@/components/ui/skeleton'
import { useDriver } from './layout'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import SearchingIndicator from '@/components/ui/searching-indicator'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { motion, AnimatePresence } from 'framer-motion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Phone } from 'lucide-react'

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
  const [jobRequest, setJobRequest] = useState<JobRequest | null>(null);
  const [activeRide, setActiveRide] = useState<RideData | null>(null)
  const [requestTimeout, setRequestTimeout] = useState(15)
  const requestTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [isEarningsVisible, setIsEarningsVisible] = useState(false)
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false)
  const [pin, setPin] = useState('')
  const notificationSoundRef = useRef<HTMLAudioElement | null>(null)
  const { partnerData, isLoading: isDriverLoading } = useDriver()
  const { db } = useFirebase()
  const { toast } = useToast()
  
  const [recentRides, setRecentRides] = useState<RideData[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  
  const [enteredOtp, setEnteredOtp] = useState('');
  
  const handleDeclineJob = useCallback(async (isTimeout = false) => {
    if (!jobRequest || !partnerData?.id || !db) return
    if (requestTimerRef.current) clearInterval(requestTimerRef.current)
    
    const jobRef = doc(db, 'rides', jobRequest.id);
    await updateDoc(jobRef, {
        rejectedBy: arrayUnion(partnerData.id)
    });

    setJobRequest(null);
    if (!isTimeout) toast({ title: "Job Declined" })
    else toast({ variant: 'destructive', title: "Request Timed Out" })
  }, [jobRequest, partnerData?.id, db, toast]);
  
  const isOnline = partnerData?.isOnline ?? false;
  
  const resetAfterRide = useCallback(() => {
    setActiveRide(null);
    localStorage.removeItem('activeRideId');
    if (partnerData?.id && db) {
        updateDoc(doc(db, 'partners', partnerData.id), { status: 'online' });
    }
  }, [partnerData, db]);

  const handleAvailabilityChange = async (checked: boolean) => {
    if (!partnerData || !db) return;
    const partnerRef = doc(db, 'partners', partnerData.id);
    try {
      await updateDoc(partnerRef, { isOnline: checked, status: checked ? 'online' : 'offline' });
      toast({
        title: checked ? "You are now ONLINE" : "You are OFFLINE",
        description: checked ? "You will start receiving ride requests." : "You won't receive new requests.",
      });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update your status.' });
    }
  };
  
  // This effect listens for updates on the active ride.
  useEffect(() => {
    if (!db || !activeRide?.id) return;

    const unsub = onSnapshot(doc(db, 'rides', activeRide.id), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (['completed', 'cancelled_by_rider', 'cancelled_by_driver'].includes(data.status)) {
                toast({
                    variant: data.status === 'completed' ? 'default' : 'destructive',
                    title: data.status === 'completed' ? 'Ride Completed' : 'Ride Cancelled',
                });
                resetAfterRide(); // This will now reset the state
            } else {
                setActiveRide({ id: docSnap.id, ...data } as RideData);
            }
        } else {
            resetAfterRide();
        }
    });

    return () => unsub(); // Cleanup on component unmount or when activeRide.id changes
  }, [db, activeRide?.id, toast, resetAfterRide]);

  const handlePinSubmit = () => {
    const storedPin = localStorage.getItem('curocity-user-pin');
    if (!storedPin) {
        toast({ variant: 'destructive', title: 'PIN Not Set', description: 'Please set a UPI PIN from your wallet first.' });
        setIsPinDialogOpen(false);
        return;
    }
    if (pin === storedPin) {
        setIsEarningsVisible(true);
        setIsPinDialogOpen(false);
        setPin('');
        toast({ title: 'Earnings Revealed', description: 'Your earnings for today are now visible.' });
        setTimeout(() => setIsEarningsVisible(false), 10000); // Hide after 10 seconds
    } else {
        toast({ variant: 'destructive', title: 'Invalid PIN', description: 'Please enter the correct 4-digit PIN.' });
        setPin('');
    }
  };

  const handleAcceptJob = async () => {
    if (!jobRequest || !partnerData || !db) return;
    if (requestTimerRef.current) clearInterval(requestTimerRef.current);
  
    const jobRef = doc(db, 'rides', jobRequest.id);
    const partnerRef = doc(db, 'partners', partnerData.id);
  
    try {
      await runTransaction(db, async (transaction) => {
        const jobDoc = await transaction.get(jobRef);
        if (!jobDoc.exists()) throw new Error("Ride not found.");
        const jobData = jobDoc.data();
  
        if (jobData.status !== 'searching') {
          throw new Error("This ride has already been accepted by another driver.");
        }
  
        const updateData: any = {
          status: 'accepted',
          driverId: partnerData.id,
          driverName: partnerData.name,
          driverDetails: {
            name: partnerData.name,
            vehicle: `${partnerData.vehicleBrand || ''} ${partnerData.vehicleName || ''}`.trim(),
            rating: partnerData.rating ?? 5.0,
            photoUrl: partnerData.photoUrl || '',
            phone: partnerData.phone || '',
          },
          acceptedAt: serverTimestamp(),
          driverEta: jobRequest.eta, // Use eta from jobRequest
          driverDistance: jobRequest.distance, // Use distance from jobRequest
        };
  
        Object.keys(updateData).forEach((key) => {
          if (updateData[key] === undefined || updateData[key] === null) {
            delete updateData[key];
          }
        });
  
        transaction.update(jobRef, updateData);
        transaction.update(partnerRef, { status: 'on_trip' });
      });
  
      setJobRequest(null);
      setActiveRide({ ...jobRequest, status: 'accepted' } as RideData);
      localStorage.setItem('activeRideId', jobRequest.id);
  
      toast({
        title: 'Ride Accepted!',
        description: 'Get ready to navigate to the pickup location.',
      });
    } catch (err: any) {
      console.error("Error accepting job:", err);
      toast({
        variant: 'destructive',
        title: 'Could not accept job',
        description: err.message || 'It might have been taken by another driver.',
      });
      setJobRequest(null);
    }
  };  

  const renderActiveRide = () => {
        if (!activeRide) return null;
        
        const isNavigatingToRider = ['accepted', 'arrived'].includes(activeRide.status);
        const destinationLocation = isNavigatingToRider ? activeRide.pickup.location : activeRide.destination.location;
        const navigateUrl = destinationLocation ? `https://www.google.com/maps/dir/?api=1&destination=${destinationLocation.latitude},${destinationLocation.longitude}` : '#';

        return (
            <Card className="shadow-lg animate-fade-in w-full">
                <CardHeader>
                    <CardTitle className="capitalize">{activeRide.status.replace('_', ' ')}</CardTitle>
                    <CardDescription>Rider: {activeRide.riderName}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="h-48 w-full rounded-md overflow-hidden border">
                         <LiveMap 
                             driverLocation={partnerData?.currentLocation ? { lat: partnerData.currentLocation.latitude, lon: partnerData.currentLocation.longitude } : undefined}
                             riderLocation={activeRide.pickup.location ? { lat: activeRide.pickup.location.latitude, lon: activeRide.pickup.location.longitude } : undefined}
                             destinationLocation={activeRide.destination.location ? { lat: activeRide.destination.location.latitude, lon: activeRide.destination.location.longitude } : undefined}
                             isTripInProgress={activeRide.status === 'in-progress'}
                          />
                     </div>
                     {activeRide.status === 'arrived' && (
                        <div className="space-y-2">
                           <Label htmlFor="otp">Enter Rider's OTP</Label>
                           <div className="flex gap-2">
                              <Input id="otp" value={enteredOtp} onChange={(e) => setEnteredOtp(e.target.value)} placeholder="4-Digit OTP" maxLength={4}/>
                              <Button><CheckCircle className="w-4 h-4 mr-2"/>Verify & Start</Button>
                           </div>
                        </div>
                     )}
                     <Button asChild size="lg" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                         <a href={navigateUrl} target="_blank" rel="noopener noreferrer">
                             <Navigation className="mr-2 h-5 w-5"/>
                             Navigate to {isNavigatingToRider ? 'Pickup' : 'Destination'}
                         </a>
                     </Button>
                </CardContent>
                <CardFooter>
                    {activeRide.status === 'accepted' && (
                        <Button className="w-full" size="lg">Arrived at Pickup</Button>
                    )}
                    {activeRide.status === 'in-progress' && (
                        <Button className="w-full bg-destructive hover:bg-destructive/80" size="lg">End Trip</Button>
                    )}
                </CardFooter>
            </Card>
        );
    }

  return (
    <div className="space-y-6">
        {activeRide ? renderActiveRide() : (
            <>
                <Card className="shadow-lg">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>Your Dashboard</CardTitle>
                            <div className="flex items-center space-x-2">
                                <Switch id="online-status" checked={isOnline} onCheckedChange={handleAvailabilityChange} />
                                <Label htmlFor="online-status" className={cn("font-semibold", isOnline ? "text-green-600" : "text-muted-foreground")}>
                                    {isOnline ? "ONLINE" : "OFFLINE"}
                                </Label>
                            </div>
                        </div>
                    </CardHeader>
                    {isOnline ? (
                        <CardContent className="text-center py-12">
                            <SearchingIndicator partnerType="path" className="w-32 h-32" />
                            <h3 className="text-3xl font-bold mt-4">Waiting for Rides...</h3>
                            <p className="text-muted-foreground">You are online and ready to accept jobs.</p>
                        </CardContent>
                    ) : (
                        <CardContent className="text-center py-12">
                            <CardTitle>You are Offline</CardTitle>
                            <CardDescription>Go online to receive ride requests.</CardDescription>
                        </CardContent>
                    )}
                </Card>
                <Tabs defaultValue="stats" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="stats">Today's Stats</TabsTrigger>
                        <TabsTrigger value="history">Recent Activity</TabsTrigger>
                    </TabsList>
                    <TabsContent value="stats" className="mt-4">
                        <div className="grid gap-4 grid-cols-2 lg:grid-cols-2">
                            <StatCard title="Today's Earnings" value={isEarningsVisible ? `₹${(partnerData?.todaysEarnings || 0).toLocaleString()}` : '₹ ****'} icon={IndianRupee} isLoading={isDriverLoading} onValueClick={() => !isEarningsVisible && setIsPinDialogOpen(true)} />
                            <StatCard title="Today's Rides" value={partnerData?.jobsToday?.toString() || '0'} icon={History} isLoading={isDriverLoading} />
                            <StatCard title="Acceptance Rate" value={`${partnerData?.acceptanceRate || '95'}%`} icon={Power} isLoading={isDriverLoading} />
                            <StatCard title="Rating" value={partnerData?.rating?.toString() || '4.9'} icon={Star} isLoading={isDriverLoading} />
                        </div>
                    </TabsContent>
                    <TabsContent value="history" className="mt-4 flex-1 space-y-2 max-h-48 overflow-y-auto">
                        {isHistoryLoading ? (
                            Array.from({length: 2}).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
                        ) : recentRides.length > 0 ? (
                            recentRides.map(ride => (
                                <Card key={ride.id}>
                                    <CardContent className="p-2 flex items-center justify-between">
                                        <div className="text-sm">
                                            <p className="font-semibold line-clamp-1">{ride.destination?.address || 'N/A'}</p>
                                            <p className="text-xs text-muted-foreground">{ride.createdAt ? new Date(ride.createdAt.seconds * 1000).toLocaleString() : 'N/A'}</p>
                                        </div>
                                        <p className="font-bold text-lg">₹{ride.fare}</p>
                                    </CardContent>
                                </Card>
                            ))
                        ) : (
                            <div className="text-center py-10 text-muted-foreground">No recent rides found.</div>
                        )}
                    </TabsContent>
                </Tabs>
            </>
        )}

      <AlertDialog open={!!jobRequest}>
        <AlertDialogContent>
          <AlertDialogHeader>
              <AlertDialogTitle>New Ride Request!</AlertDialogTitle>
              <AlertDialogDescription>A new ride is available. Please review and respond quickly.</AlertDialogDescription>
          </AlertDialogHeader>
          {jobRequest && (
            <>
              <div className="absolute top-4 right-4 w-12 h-12 flex items-center justify-center rounded-full border-4 border-primary text-primary font-bold text-2xl">
                {requestTimeout}
              </div>
               <div className="flex items-center gap-4">
                  <Avatar className="w-12 h-12"><AvatarImage src={'https://placehold.co/100x100.png'} alt={jobRequest.riderName} data-ai-hint="rider portrait" /><AvatarFallback>{jobRequest?.riderName?.[0] || 'R'}</AvatarFallback></Avatar>
                 <div>
                   <p className="font-bold">{jobRequest?.riderName}</p>
                   <p className="text-sm text-muted-foreground capitalize">{jobRequest?.riderGender}</p>
                 </div>
                 <Badge variant="outline">{jobRequest.rideType}</Badge>
               </div>
                <div className="space-y-2 text-sm">
                   <div className="flex items-start gap-2">
                       <MapPin className="w-4 h-4 mt-1 text-green-500 flex-shrink-0" />
                       <p><span className="font-semibold">FROM:</span> {jobRequest.pickupAddress}</p>
                   </div>
                   <div className="flex items-start gap-2">
                       <Route className="w-4 h-4 mt-1 text-red-500 flex-shrink-0" />
                       <p><span className="font-semibold">TO:</span> {jobRequest.destinationAddress}</p>
                   </div>
               </div>
               
               <div className="h-40 w-full rounded-md overflow-hidden border">
                 <LiveMap
                   driverLocation={driverLocation}
                   riderLocation={jobRequest.pickup?.location ? { lat: jobRequest.pickup.location.latitude, lon: jobRequest.pickup.location.longitude } : undefined}
                   destinationLocation={jobRequest.destination?.location ? { lat: jobRequest.destination.location.latitude, lon: jobRequest.destination.location.longitude } : undefined}
                   isTripInProgress={false}
                   zoom={11}
                 />
               </div>
               <div className="grid grid-cols-3 gap-2 text-center mt-3">
                 <div className="p-2 bg-muted rounded-md">
                     <p className="text-xs text-muted-foreground">Est. Fare</p>
                     <p className="font-bold text-lg text-green-600">
                       ₹{jobRequest.fare}
                     </p>
                 </div>
                 <div className="p-2 bg-muted rounded-md">
                     <p className="text-xs text-muted-foreground">To Pickup</p>
                     <p className="font-bold text-lg">
                       {jobRequest.distance ? `~${jobRequest.distance.toFixed(1)} km` : '~km'}
                     </p>
                 </div>
                 <div className="p-2 bg-muted rounded-md">
                     <p className="text-xs text-muted-foreground">Est. Arrival</p>
                     <p className="font-bold text-lg">
                       {jobRequest.eta ? `~${Math.ceil(jobRequest.eta)} min` : '~min'}
                     </p>
                 </div>
               </div>
            </>
          )}
          <AlertDialogFooter className="grid grid-cols-2 gap-2">
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
            <Input id="pin-input" type="password" inputMode="numeric" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value)} className="text-center text-2xl font-bold tracking-[1em] w-40" placeholder="••••" autoFocus />
          </div>
          <DialogFooter>
            <Button type="button" className="w-full" onClick={handlePinSubmit}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
