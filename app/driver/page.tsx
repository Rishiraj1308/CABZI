
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
  AlertDialogTrigger,
  AlertDialogCancel,
  AlertDialogAction,
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start h-full">
        <div className="lg:col-span-2">
           <Card className="h-[75vh]">
                <CardContent className="p-0 h-full">
                     <LiveMap 
                        onLocationFound={(address, coords) => {
                            if (db && partnerData) {
                                updateDoc(doc(db, 'partners', partnerData.id), {
                                    currentLocation: new GeoPoint(coords.lat, coords.lon)
                                });
                            }
                        }}
                        driverLocation={partnerData?.currentLocation ? { lat: partnerData.currentLocation.latitude, lon: partnerData.currentLocation.longitude } : undefined}
                        isTripInProgress={activeRide?.status === 'in-progress'}
                     />
                </CardContent>
            </Card>
        </div>
        
        <div className="lg:col-span-1 space-y-6">
            <Card className="shadow-lg">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Your Dashboard</CardTitle>
                        <div className="flex items-center space-x-2">
                            <Switch id="online-status" checked={isOnline} />
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
        </div>

        <AlertDialog open={!!jobRequest}>
          <AlertDialogContent>
            {jobRequest ? (
             <>
              <AlertDialogHeader>
                  <AlertDialogTitle>New Ride Request!</AlertDialogTitle>
                  <AlertDialogDescription>A new ride is available. Please review and respond quickly.</AlertDialogDescription>
              </AlertDialogHeader>
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
                   driverLocation={partnerData?.currentLocation ? { lat: partnerData.currentLocation.latitude, lon: partnerData.currentLocation.longitude } : undefined}
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
            ) : (
                <div className="p-8 text-center">Loading request...</div>
            )}
          <AlertDialogFooter className="grid grid-cols-2 gap-2">
            <Button variant="destructive" onClick={() => handleDeclineJob()}>Decline</Button>
            <Button>Accept Ride</Button>
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

    