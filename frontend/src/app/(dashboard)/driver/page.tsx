
'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  doc,
  updateDoc,
  runTransaction,
  arrayUnion,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore'
import { useFirebase } from '@/lib/firebase/client-provider'
import type { RideData } from '@/lib/types'
  
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Star, History, IndianRupee, Power, Route, MapPin, Car } from 'lucide-react'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { useDriver } from './layout'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import SearchingIndicator from '@/components/ui/searching-indicator'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import dynamic from 'next/dynamic'

import { useDriverLocation } from '@/features/driver/hooks/useDriverLocation'
import { RidePopup } from '@/features/driver/components/RidePopup'
import { Separator } from '@/components/ui/separator'

const ActiveRideView = dynamic(() => import('@/features/driver/components/ActiveRideView'), {
    ssr: false,
    loading: () => <div className="p-4"><Skeleton className="h-96 w-full" /></div>,
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
)

export default function DriverDashboardPage() {
  const [isEarningsVisible, setIsEarningsVisible] = useState(false);
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
  const [pin, setPin] = useState('');
  const { partnerData, isLoading: isDriverLoading } = useDriver();
  const { db } = useFirebase();

  const [jobRequest, setJobRequest] = useState<RideData | null>(null);
  const [activeRide, setActiveRide] = useState<RideData | null>(null);

  useDriverLocation();

  const [recentRides, setRecentRides] = useState<RideData[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [selectedRide, setSelectedRide] = useState<RideData | null>(null);

  const [currentTime, setCurrentTime] = useState(new Date());
  const notificationSoundRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  /** =========================
   *  REAL-TIME RIDE LISTENER
   *  ========================= */
  useEffect(() => {
    if (!db || !partnerData?.id || !partnerData?.isOnline || !partnerData?.vehicleType) return;

    const vehicleTypeBase = (partnerData.vehicleType || "").split(" ")[0].trim();
    if(!vehicleTypeBase) return;


    const ridesQ = query(collection(db, 'rides'), where('status', '==', 'searching'));

    const unsub = onSnapshot(ridesQ, (snapshot) => {
      const normalize = (s: string) => (s || '').toLowerCase().replace(/[\s\-\(\)]/g, '');
      const driverType = normalize(partnerData.vehicleType);
      const matches: RideData[] = [];

      snapshot.forEach((d) => {
        const ride = { id: d.id, ...d.data() } as RideData;
        const rideType = normalize(ride.rideType || '');

        // respect 'rejectedBy' and vehicle type match
        if (!ride.rejectedBy?.includes(partnerData.id!) && rideType.includes(driverType)) {
          matches.push(ride);
        }
      });

      if (matches.length > 0 && !activeRide) {
        const next = matches[0];
        setJobRequest(next);
        notificationSoundRef.current?.play().catch(() => {});

        // Driver -> pickup ETA/distance via OSRM
        const driverLoc = partnerData.currentLocation as any; // expected Firestore GeoPoint
        const pickupLoc = next?.pickup?.location as any;

        if (driverLoc && pickupLoc) {
          const url = `https://router.project-osrm.org/route/v1/driving/${driverLoc.longitude},${driverLoc.latitude};${pickupLoc.longitude},${pickupLoc.latitude}?overview=false`;
          fetch(url)
            .then((res) => res.json())
            .then((data) => {
              const route = data?.routes?.[0];
              if (!route) return;
              setJobRequest((prev) =>
                prev
                  ? {
                      ...prev,
                      distance: Number((route.distance / 1000).toFixed(1)), // meters -> km
                      eta: Math.max(1, Math.round(route.duration / 60)), // seconds -> minutes
                    }
                  : prev
              );
            })
            .catch((err) => console.log('OSRM error:', err));
        }
      }
    });

    return () => unsub();
  }, [db, partnerData, activeRide]);

  /** =================================================
   *  Check/attach active ride on mount & keep updated
   *  ================================================= */
  useEffect(() => {
    if (!db) return;
    const activeRideId = typeof window !== 'undefined' ? localStorage.getItem('activeRideId') : null;
    if (!activeRideId) return;

    const unsub = onSnapshot(doc(db, 'rides', activeRideId), (docSnap) => {
      if (docSnap.exists()) {
        const rideData = { id: docSnap.id, ...docSnap.data() } as RideData;
        setActiveRide(rideData);
      } else {
        localStorage.removeItem('activeRideId');
        setActiveRide(null);
      }
    });

    return () => unsub();
  }, [db]);

  /** =========================
   *  Recent rides list
   *  ========================= */
  useEffect(() => {
    if (!db || !partnerData?.id) return;

    setIsHistoryLoading(true);
    const ridesQ = query(
      collection(db, 'rides'),
      where('driverId', '==', partnerData.id),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    const unsub = onSnapshot(ridesQ, (snapshot) => {
      setRecentRides(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as RideData)));
      setIsHistoryLoading(false);
    });

    return () => unsub();
  }, [db, partnerData?.id]);

  /** =========================
   *  Availability toggle
   *  ========================= */
  const handleAvailabilityChange = async (checked: boolean) => {
    if (!partnerData || !db) return;
    try {
      await updateDoc(doc(db, 'pathPartners', partnerData.id), { isOnline: checked });
      toast(checked ? 'You are now ONLINE' : 'You are OFFLINE', {
        description: checked
          ? 'You will start receiving ride requests.'
          : "You won't receive new requests.",
      });
    } catch {
      toast.error('Error', { description: 'Could not update your status.' });
    }
  };

  /** =========================
   *  Accept / Decline
   *  ========================= */
  const handleAcceptJob = async () => {
    if (!jobRequest || !partnerData || !db) return;

    const jobRef = doc(db, 'rides', jobRequest.id);
    const partnerRef = doc(db, 'pathPartners', partnerData.id);

    try {
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(jobRef);
        if (!snap.exists() || snap.data().status !== 'searching') {
          throw new Error('This ride has already been accepted.');
        }

        tx.update(jobRef, {
          status: 'accepted',
          driverId: partnerData.id,
          driverName: partnerData.name,
          driverDetails: {
            name: partnerData.name,
            vehicle: `${partnerData.vehicleBrand || ''} ${partnerData.vehicleName || ''}`.trim(),
            vehicleType: partnerData.vehicleType || 'cab',
            rating: partnerData.rating ?? 5.0,
            photoUrl: partnerData.photoUrl || '',
            phone: partnerData.phone || '',
          },
          vehicleNumber: partnerData.vehicleNumber,
          acceptedAt: serverTimestamp(),
        });

        tx.update(partnerRef, { liveStatus: 'on_trip' });
      });

      setActiveRide({ ...jobRequest, status: 'accepted' } as RideData);
      localStorage.setItem('activeRideId', jobRequest.id);
      setJobRequest(null);
      toast.success('Ride Accepted!');
    } catch (err: any) {
      toast.error('Could not accept job', { description: err?.message || '' });
      setJobRequest(null);
    }
  };

  const handleDeclineJob = useCallback(
    async (isTimeout = false) => {
      if (!jobRequest || !partnerData?.id || !db) return;
      try {
        await updateDoc(doc(db, 'rides', jobRequest.id), {
          rejectedBy: arrayUnion(partnerData.id),
        });
      } catch {}
      setJobRequest(null);
      toast(isTimeout ? 'Request Timed Out' : 'Job Declined');
    },
    [jobRequest, partnerData?.id, db]
  );
  
  const handleAcceptWithCleanup = () => {
    handleAcceptJob();
  };
  const handleDeclineWithCleanup = (isTimeout = false) => {
    handleDeclineJob(isTimeout);
  };

  /** =========================
   *  PIN for earnings
   *  ========================= */
  const handlePinSubmit = () => {
    const storedPin = typeof window !== 'undefined' ? localStorage.getItem('curocity-user-pin') : null;
    if (!storedPin) {
      toast.error('PIN Not Set', { description: 'Please set a UPI PIN from your wallet first.' });
      setIsPinDialogOpen(false);
      return;
    }
    if (pin === storedPin) {
      setIsEarningsVisible(true);
      setIsPinDialogOpen(false);
      setPin('');
      toast.success('Earnings Revealed');
      setTimeout(() => setIsEarningsVisible(false), 30000);
    } else {
      toast.error('Invalid PIN');
      setPin('');
    }
  };

  const isOnline = partnerData?.isOnline ?? false;

  return (
    <div className="space-y-6">
      <audio ref={notificationSoundRef} src="/notification.mp3" preload="auto" />

      {activeRide ? (
        <ActiveRideView activeRide={activeRide} setActiveRide={setActiveRide} />
      ) : (
        <>
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-xl md:text-2xl">Your Dashboard</CardTitle>
                  <CardDescription className="text-xs">
                    {format(currentTime, 'EEEE, d MMMM')}
                  </CardDescription>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg md:text-2xl font-mono">
                    {format(currentTime, 'h:mm a')}
                  </p>
                  <div className="flex items-center space-x-2 justify-end">
                    <Switch id="online-status" checked={isOnline} onCheckedChange={handleAvailabilityChange} />
                    <Label
                      htmlFor="online-status"
                      className={cn(
                        'font-semibold text-xs',
                        isOnline ? 'text-green-600' : 'text-muted-foreground'
                      )}
                    >
                      {isOnline ? 'ONLINE' : 'OFFLINE'}
                    </Label>
                  </div>
                </div>
              </div>
            </CardHeader>

            {isOnline && (
              <CardContent className="text-center py-8 md:py-12">
                <SearchingIndicator partnerType="path" className="w-24 h-24 md:w-32 md:h-32" />
                <h3 className="text-xl md:text-3xl font-bold mt-4">Waiting for Rides...</h3>
                <p className="text-muted-foreground text-sm">You are online and ready to accept jobs.</p>
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
                <StatCard
                  title="Today's Earnings"
                  value={isEarningsVisible ? `₹${(partnerData?.todaysEarnings || 0).toLocaleString()}` : '₹ ****'}
                  icon={IndianRupee}
                  isLoading={isDriverLoading}
                  onValueClick={() => !isEarningsVisible && setIsPinDialogOpen(true)}
                />
                <StatCard
                  title="Today's Rides"
                  value={partnerData?.jobsToday?.toString() || '0'}
                  icon={History}
                  isLoading={isDriverLoading}
                />
                <StatCard
                  title="Acceptance Rate"
                  value={`${partnerData?.acceptanceRate || '95'}%`}
                  icon={Power}
                  isLoading={isDriverLoading}
                />
                <StatCard
                  title="Rating"
                  value={partnerData?.rating?.toString() || '4.9'}
                  icon={Star}
                  isLoading={isDriverLoading}
                />
              </div>
            </TabsContent>

            <TabsContent value="history" className="mt-4 flex-1 space-y-2 max-h-48 overflow-y-auto">
              {isHistoryLoading ? (
                Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
              ) : recentRides.length > 0 ? (
                recentRides.map((ride) => (
                  <Card
                    key={ride.id}
                    className="cursor-pointer hover:bg-muted"
                    onClick={() => setSelectedRide(ride)}
                  >
                    <CardContent className="p-2 flex items-center justify-between">
                      <div className="text-sm">
                        <p className="font-semibold line-clamp-1">{ride.destination?.address || 'N/A'}</p>
                        <p className="text-xs text-muted-foreground">
                          {ride.createdAt ? new Date((ride.createdAt as any).seconds * 1000).toLocaleString() : 'N/A'}
                        </p>
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

      <RidePopup jobRequest={jobRequest} onAccept={handleAcceptWithCleanup} onDecline={handleDeclineWithCleanup} />

      <Dialog open={selectedRide !== null} onOpenChange={(isOpen) => !isOpen && setSelectedRide(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ride Details</DialogTitle>
            {selectedRide && (
              <DialogDescription>
                {/* @ts-ignore Firestore TS */}
                {selectedRide.createdAt ? format(new Date((selectedRide.createdAt as any).seconds * 1000), 'PPP, p') : ''}
              </DialogDescription>
            )}
          </DialogHeader>

          {selectedRide && (
            <div className="space-y-4 py-4 text-sm">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 mt-1 text-green-500" />
                <p>
                  <span className="font-semibold text-muted-foreground">FROM: </span>
                  {selectedRide.pickup?.address}
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Route className="w-4 h-4 mt-1 text-red-500" />
                <p>
                  <span className="font-semibold text-muted-foreground">TO: </span>
                  {selectedRide.destination?.address}
                </p>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Rider</span>
                <span className="font-semibold">{selectedRide.riderName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Status</span>
                <span className="font-semibold">{selectedRide.status}</span>
              </div>
              <div className="flex justify-between items-center text-lg">
                <span className="text-muted-foreground">Fare</span>
                <span className="font-bold text-primary">₹{selectedRide.fare}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isPinDialogOpen} onOpenChange={setIsPinDialogOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Enter PIN to View</DialogTitle>
            <DialogDescription>
              For your privacy, please enter your PIN to see today's earnings.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center gap-4 py-4">
            <Label htmlFor="pin-input" className="sr-only">
              Enter PIN
            </Label>
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
            <Button type="button" className="w-full" onClick={handlePinSubmit}>
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
