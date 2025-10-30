
'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Star, History, IndianRupee, Power, AlertTriangle, Sparkles, Eye, MapPin, Route } from 'lucide-react'
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
} from 'firebase/firestore'
import { useFirebase } from '@/firebase/client-provider'
import dynamic from 'next/dynamic'
import type { JobRequest, RideData } from '@/lib/types'
import { Skeleton } from '@/components/ui/skeleton'
import { useDriver } from './layout'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import SearchingIndicator from '@/components/ui/searching-indicator'
import RideStatus from '@/components/ride-status'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

const LiveMap = dynamic(() => import('@/components/live-map'), { ssr: false })

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
)

export default function DriverDashboardPage() {
  const [availableJobs, setAvailableJobs] = useState<JobRequest[]>([])
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

  const isOnline = partnerData?.isOnline || false
  const jobRequest = availableJobs.length > 0 ? availableJobs[0] : null

  // 🔔 Setup sound
  useEffect(() => {
    if (typeof window !== 'undefined') {
      notificationSoundRef.current = new Audio('/sounds/notification.mp3')
      const unlockSound = () => {
        if (notificationSoundRef.current?.paused) {
          notificationSoundRef.current.play().then(() => {
            notificationSoundRef.current?.pause();
            if (notificationSoundRef.current) notificationSoundRef.current.currentTime = 0;
          }).catch(e => console.warn("Audio unlock failed, will try again."));
        }
        window.removeEventListener('click', unlockSound, true);
      };
      window.addEventListener('click', unlockSound, true);
      
      return () => {
        window.removeEventListener('click', unlockSound, true);
      };
    }
  }, []);

  const handleAvailabilityChange = async (checked: boolean) => {
    if (!partnerData || !db) return;
    const partnerRef = doc(db, 'partners', partnerData.id);
    try {
      await updateDoc(partnerRef, { isOnline: checked });
      toast({
        title: checked ? "You are now ONLINE" : "You are OFFLINE",
        description: checked ? "You will start receiving ride requests." : "You won't receive new requests.",
      });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update your status.' });
    }
  };

  // 🔥 Firestore listener for ride requests
  useEffect(() => {
    if (!db || !isOnline || activeRide) {
      setAvailableJobs([]);
      return;
    }
  
    console.log("🚀 Firestore listener started...");
  
    const q = query(collection(db, "rides"), where("status", "==", "searching"));
    const unsub = onSnapshot(q, (snapshot) => {
        console.log("📡 Listener update:", snapshot.size);
        
        const newJobs: JobRequest[] = [];
        snapshot.forEach((doc) => {
            const rideData = doc.data();
            console.log("📄 Ride detected:", rideData);
            newJobs.push({
                id: doc.id,
                ...rideData
            } as JobRequest);
        });

        // This logic ensures sound plays only when the list goes from empty to non-empty
        if (newJobs.length > 0 && availableJobs.length === 0) {
            console.log("🚨 New ride request!");
            notificationSoundRef.current?.play().catch(e => console.warn("Sound blocked:", e));
        }

        setAvailableJobs(newJobs);
    });

    return () => {
        console.log("🧹 Listener cleaned up");
        unsub();
    };
  }, [db, isOnline, activeRide]);

  // Timer for request
  useEffect(() => {
    if (jobRequest) {
      setRequestTimeout(15)
      requestTimerRef.current = setInterval(() => {
        setRequestTimeout((prev) => {
          if (prev <= 1) {
            if (requestTimerRef.current) clearInterval(requestTimerRef.current)
            handleDeclineJob(true)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      setRequestTimeout(15)
      if (requestTimerRef.current) clearInterval(requestTimerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobRequest])

  const handleDeclineJob = (isTimeout = false) => {
    if (!jobRequest) return
    if (requestTimerRef.current) clearInterval(requestTimerRef.current)
    setAvailableJobs((prev) => prev.filter((j) => j.id !== jobRequest.id))
    if (!isTimeout) toast({ title: "Job Declined" })
    else toast({ variant: 'destructive', title: "Request Timed Out" })
  }

  const resetAfterRide = () => {
    setActiveRide(null)
    localStorage.removeItem('activeRideId')
  }

  const handlePinSubmit = () => {
    const storedPin = localStorage.getItem('curocity-user-pin')
    if (!storedPin) {
      toast({ variant: 'destructive', title: 'PIN Not Set', description: 'Please set a UPI PIN from your wallet first.' })
      return
    }
    if (pin === storedPin) {
      setIsEarningsVisible(true)
      setIsPinDialogOpen(false)
      setPin('')
      toast({ title: 'Earnings Revealed', description: 'Your earnings for today are now visible.' })
      setTimeout(() => setIsEarningsVisible(false), 10000)
    } else {
      toast({ variant: 'destructive', title: 'Invalid PIN', description: 'Please enter the correct 4-digit PIN.' })
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
            <p className="text-muted-foreground">Your location is being shared to get nearby requests.</p>
          </CardContent>
        ) : (
          <CardContent className="text-center py-12">
             <CardDescription>You are currently offline. Go online to receive ride requests.</CardDescription>
          </CardContent>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Today's Earnings" value={isEarningsVisible ? `₹${(partnerData?.todaysEarnings || 0).toLocaleString()}` : '₹ ****'} icon={IndianRupee} isLoading={isDriverLoading} onValueClick={() => !isEarningsVisible && setIsPinDialogOpen(true)} />
        <StatCard title="Today's Rides" value={partnerData?.jobsToday?.toString() || '0'} icon={History} isLoading={isDriverLoading} />
        <StatCard title="Acceptance Rate" value={`${partnerData?.acceptanceRate || '95'}%`} icon={Power} isLoading={isDriverLoading} />
        <StatCard title="Rating" value={partnerData?.rating?.toString() || '4.9'} icon={Star} isLoading={isDriverLoading} />
      </div>

      <Card className="bg-gradient-to-r from-primary to-primary/90 text-primary-foreground border-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Sparkles className="text-yellow-300" /> AI Earnings Coach</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Focus on the Cyber Hub area between 5 PM - 8 PM. High demand is expected, and you could earn up to 30% more.</p>
        </CardContent>
      </Card>

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
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-xl font-bold">
                  {jobRequest?.riderName?.[0] || 'R'}
                </div>
                <div>
                  <p className="font-bold">{jobRequest?.riderName}</p>
                  <p className="text-sm text-muted-foreground capitalize">{jobRequest?.riderGender}</p>
                </div>
                <Badge variant="outline" className="ml-auto">{jobRequest?.rideType}</Badge>
              </div>

               <div className="space-y-2 text-sm">
                   <div className="flex items-start gap-2">
                       <MapPin className="w-4 h-4 mt-1 text-green-500 flex-shrink-0" />
                       <p><span className="font-semibold">Pickup:</span> {jobRequest.pickup?.address}</p>
                   </div>
                   <div className="flex items-start gap-2">
                       <MapPin className="w-4 h-4 mt-1 text-red-500 flex-shrink-0" />
                       <p><span className="font-semibold">Drop:</span> {jobRequest.destination?.address}</p>
                   </div>
               </div>
              
              <div className="h-40 w-full rounded-md overflow-hidden border">
                <LiveMap
                  riderLocation={jobRequest.pickup?.location}
                  destinationLocation={jobRequest.destination?.location}
                  zoom={11}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-muted rounded-md">
                  <p className="text-xs text-muted-foreground">Est. Fare</p>
                  <p className="font-bold text-lg text-green-600">₹{jobRequest.fare}</p>
                </div>
                 <div className="p-2 bg-muted rounded-md">
                  <p className="text-xs text-muted-foreground">To Pickup</p>
                  <p className="font-bold text-lg">{jobRequest.driverDistance ? `${jobRequest.driverDistance.toFixed(1)} km` : 'N/A'}</p>
                </div>
                <div className="p-2 bg-muted rounded-md">
                  <p className="text-xs text-muted-foreground">Est. Arrival</p>
                  <p className="font-bold text-lg">{jobRequest.driverEta ? `${Math.ceil(jobRequest.driverEta)} min` : 'N/A'}</p>
                </div>
              </div>
            </>
          )}
          <AlertDialogFooter className="grid grid-cols-2 gap-2">
            <Button variant="destructive" onClick={() => handleDeclineJob()}>Decline</Button>
            <Button onClick={() => {
              if (!jobRequest || !partnerData || !db) return;
              if (requestTimerRef.current) clearInterval(requestTimerRef.current);
              const jobRef = doc(db, 'rides', jobRequest.id);
              updateDoc(jobRef, {
                status: 'accepted',
                driverId: partnerData.id,
                driverName: partnerData.name,
                driverDetails: {
                  name: partnerData.name,
                  vehicle: `${partnerData.vehicleBrand} ${partnerData.vehicleName}`,
                  rating: partnerData.rating,
                  photoUrl: partnerData.photoUrl,
                  phone: partnerData.phone,
                },
              }).then(() => {
                setAvailableJobs((prev) => prev.filter((j) => j.id !== jobRequest.id));
                setActiveRide({ id: jobRequest.id, ...jobRequest } as RideData);
                localStorage.setItem('activeRideId', jobRequest.id);
              }).catch((err) => {
                console.error("❌ Error accepting job:", err);
                toast({ variant: 'destructive', title: 'Error', description: 'Could not accept job. It might have been taken.' });
              });
            }}>Accept Ride</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PIN Dialog */}
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
