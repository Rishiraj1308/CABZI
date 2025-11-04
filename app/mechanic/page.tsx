'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Star, CheckCircle, Navigation, Trash2, PlusCircle, MapPin, Wrench
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import dynamic from 'next/dynamic';
import {
  doc, updateDoc, runTransaction, arrayUnion
} from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import BrandLogo from '@/components/brand-logo';
import SearchingIndicator from '@/components/ui/searching-indicator';
import { useFirebase } from '@/firebase/client-provider';
import { format } from 'date-fns';
import type { JobRequest } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { usePartnerData } from './layout';
import { Switch } from '@/components/ui/switch';

// Lazy components
const LiveMap = dynamic(() => import('@/components/live-map'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-muted flex items-center justify-center">
      <p>Loading Map...</p>
    </div>
  ),
});

// ---------- helpers ----------
const getLat = (loc: any) => loc?.latitude ?? loc?._lat ?? null;
const getLng = (loc: any) => loc?.longitude ?? loc?._long ?? null;

// Haversine (km)
const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function ResQDashboard() {
  const [isMounted, setIsMounted] = useState(false);
  const [jobRequest, setJobRequest] = useState<JobRequest | null>(null);
  const [acceptedJob, setAcceptedJob] = useState<JobRequest | null>(null);
  const [jobStatus, setJobStatus] = useState<
    'navigating' | 'arrived' | 'in_progress' | 'billing' | 'payment' | 'completed' | null
  >(null);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [billItems, setBillItems] = useState<{ description: string; amount: string }[]>([
    { description: '', amount: '' },
  ]);
  const [requestTimeout, setRequestTimeout] = useState(15);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [processedRequestIds, setProcessedRequestIds] = useState<Set<string>>(new Set());
  const [currentTime, setCurrentTime] = useState(new Date());

  const notificationSoundRef = useRef<HTMLAudioElement | null>(null);
  const requestTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { toast } = useToast();
  const { db } = useFirebase();
  const { partner: mechanicData, isLoading: isPartnerDataLoading, handleAvailabilityChange, requests } =
    usePartnerData();

  const isOnline = mechanicData?.isOnline ?? false;

  useEffect(() => {
    notificationSoundRef.current = new Audio('/sounds/notification.mp3');
    setIsMounted(true);
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Pick next pending request and enrich
  useEffect(() => {
    if (requests.length > 0 && !jobRequest && !acceptedJob) {
      const next = requests.find((r: any) => !processedRequestIds.has(r.id));
      if (!next) return;

      // If backend sent stringified GeoPoint (via FCM), parse; Firestore listener gives object already.
      try {
        if (typeof next.location === 'string') next.location = JSON.parse(next.location);
      } catch {}

      // Fallback calculate distance/eta on client if not present in doc yet
      if (mechanicData?.currentLocation && next.location) {
        const mLat = mechanicData.currentLocation.latitude;
        const mLng = mechanicData.currentLocation.longitude;
        const uLat = getLat(next.location);
        const uLng = getLng(next.location);
        if (typeof uLat === 'number' && typeof uLng === 'number') {
          const dKm = haversineKm(mLat, mLng, uLat, uLng);
          const eta = (dKm / 20) * 60; // 20 km/h avg
          next.distance ??= dKm;
          next.eta ??= eta;
        }
      }

      setJobRequest({ ...next });
      notificationSoundRef.current?.play().catch(() => {});
    }
  }, [requests, jobRequest, acceptedJob, processedRequestIds, mechanicData]);

  // Decline / timeout
  const handleDeclineJob = useCallback(
    async (isTimeout = false) => {
      if (!jobRequest || !mechanicData?.id || !db) return;
      if (requestTimerRef.current) clearInterval(requestTimerRef.current);

      setProcessedRequestIds((prev) => new Set(prev).add(jobRequest.id));
      await updateDoc(doc(db, 'garageRequests', jobRequest.id), {
        rejectedBy: arrayUnion(mechanicData.id),
      });
      setJobRequest(null);
      toast({
        variant: isTimeout ? 'destructive' : 'default',
        title: isTimeout ? 'Request Timed Out' : 'Job Declined',
      });
    },
    [jobRequest, mechanicData, db, toast]
  );

  // Popup countdown
  useEffect(() => {
    if (!jobRequest) return;
    setRequestTimeout(15);
    const t = setInterval(() => {
      setRequestTimeout((p) => {
        if (p <= 1) {
          clearInterval(t);
          handleDeclineJob(true);
          return 0;
        }
        return p - 1;
      });
    }, 1000);
    requestTimerRef.current = t;
    return () => clearInterval(t);
  }, [jobRequest, handleDeclineJob]);

  // Accept job
  const handleAcceptJob = async () => {
    if (!jobRequest || !mechanicData || !db) return;
    if (requestTimerRef.current) clearInterval(requestTimerRef.current);

    const jobRef = doc(db, 'garageRequests', jobRequest.id);
    try {
      await runTransaction(db, async (trx) => {
        const snap = await trx.get(jobRef);
        if (!snap.exists()) throw new Error('Request not found');
        if (snap.data().status !== 'pending') throw new Error('Already accepted');

        trx.update(jobRef, {
          status: 'accepted',
          mechanicId: mechanicData.id,
          mechanicName: mechanicData.name,
          mechanicPhone: mechanicData.phone,
        });
        trx.update(doc(db, 'mechanics', mechanicData.id), { status: 'on_job' });
      });

      setAcceptedJob({ ...jobRequest, status: 'accepted' } as JobRequest);
      setJobRequest(null);
      setJobStatus('navigating');
      toast({ title: 'Job Accepted', description: 'Navigate to the user.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
      setJobRequest(null);
    }
  };

  // OTP verify
  const handleVerifyOtp = async () => {
    if (!acceptedJob || !db) return;
    if (enteredOtp === acceptedJob.otp) {
      await updateDoc(doc(db, 'garageRequests', acceptedJob.id), { status: 'in_progress' });
      setJobStatus('in_progress');
      toast({ title: 'OTP Verified', description: 'Start the service now.' });
    } else {
      toast({ variant: 'destructive', title: 'Incorrect OTP', description: 'Try again.' });
    }
  };

  // Billing helpers
  const handleBillItemChange = (
    index: number,
    field: 'description' | 'amount',
    value: string
  ) => {
    const next = [...billItems];
    next[index][field] = value;
    setBillItems(next);
  };
  const addBillItem = () => setBillItems((b) => [...b, { description: '', amount: '' }]);
  const removeBillItem = (i: number) =>
    setBillItems((b) => (b.length === 1 ? b : b.filter((_, x) => x !== i)));
  const totalAmount = billItems.reduce((s, it) => s + (parseFloat(it.amount) || 0), 0);

  const completeJob = async () => {
    if (!acceptedJob || !db) return;
    const cleaned = billItems
      .map((x) => ({ description: x.description.trim(), amount: parseFloat(x.amount) }))
      .filter((x) => x.description && !Number.isNaN(x.amount));

    if (cleaned.length === 0) {
      toast({ variant: 'destructive', title: 'Add at least one bill item' });
      return;
    }

    await updateDoc(doc(db, 'garageRequests', acceptedJob.id), {
      status: 'bill_sent',
      billItems: cleaned,
      totalAmount,
      invoiceId: `INV-${Date.now()}`,
    });
    setJobStatus('payment');
    toast({ title: 'Job Card sent', description: 'Waiting for user approval' });
  };

  // ---- UI blocks ----
  const renderActiveJob = () => {
    if (!acceptedJob) return null;
    const uLat = getLat(acceptedJob.location);
    const uLng = getLng(acceptedJob.location);

    return (
      <Card className="shadow-lg animate-fade-in w-full">
        <CardHeader>
          <CardTitle>Ongoing Job</CardTitle>
          <CardDescription>
            User: {acceptedJob.userName} — Issue: {acceptedJob.issue}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Map strip */}
          <div className="h-44 w-full rounded-md overflow-hidden border">
            <LiveMap
              userLocation={
                typeof uLat === 'number' && typeof uLng === 'number'
                  ? { lat: uLat, lon: uLng }
                  : undefined
              }
              mechanicLocation={
                mechanicData?.currentLocation
                  ? {
                      lat: mechanicData.currentLocation.latitude,
                      lon: mechanicData.currentLocation.longitude,
                    }
                  : undefined
              }
            />
          </div>

          {jobStatus === 'navigating' && (
            <div className="grid grid-cols-1 gap-2">
              <Button className="w-full" onClick={() => setJobStatus('arrived')}>
                Arrived at Location
              </Button>
              {typeof uLat === 'number' && typeof uLng === 'number' && (
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() =>
                    window.open(
                      `https://www.google.com/maps/dir/?api=1&destination=${uLat},${uLng}`,
                      '_blank'
                    )
                  }
                >
                  <Navigation className="mr-2 h-4 w-4" /> Navigate with Google Maps
                </Button>
              )}
            </div>
          )}

          {jobStatus === 'arrived' && (
            <div className="space-y-4">
              <Label>Enter OTP from user</Label>
              <Input
                className="text-center text-xl tracking-[0.5em]"
                maxLength={4}
                value={enteredOtp}
                onChange={(e) => setEnteredOtp(e.target.value)}
              />
              <Button className="w-full" onClick={handleVerifyOtp}>
                Verify OTP & Start Service
              </Button>
            </div>
          )}

          {jobStatus === 'in_progress' && (
            <div className="text-center p-4 bg-muted rounded-lg space-y-4">
              <p className="font-semibold">Service Ongoing...</p>
              <Button className="w-full" onClick={() => setJobStatus('billing')}>
                Complete Service & Generate Bill
              </Button>
            </div>
          )}

          {jobStatus === 'billing' && (
            <div className="space-y-4">
              <Label className="text-lg font-semibold">Generate Job Card</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {billItems.map((it, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input
                      placeholder="Service Description"
                      value={it.description}
                      onChange={(e) => handleBillItemChange(i, 'description', e.target.value)}
                    />
                    <Input
                      type="number"
                      placeholder="Amount"
                      className="w-28"
                      value={it.amount}
                      onChange={(e) => handleBillItemChange(i, 'amount', e.target.value)}
                    />
                    <Button variant="ghost" size="icon" onClick={() => removeBillItem(i)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full" onClick={addBillItem}>
                <PlusCircle className="w-4 h-4 mr-2" /> Add More
              </Button>
              <div className="flex justify-between pt-2 border-t font-bold text-lg">
                <span>Total Amount:</span>
                <span>₹{totalAmount.toFixed(2)}</span>
              </div>
              <Button className="w-full" onClick={completeJob}>
                Submit Job Card
              </Button>
            </div>
          )}

          {jobStatus === 'payment' && (
            <div className="p-4 bg-muted rounded-lg text-center space-y-3">
              <p className="text-sm text-muted-foreground">Waiting for User Payment...</p>
              <p className="text-3xl font-bold">₹{totalAmount.toFixed(2)}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (isPartnerDataLoading || !isMounted) {
    return (
      <div className="flex items-center justify-center h-full">
        <Skeleton className="w-full h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {acceptedJob ? (
        renderActiveJob()
      ) : (
        <>
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Your Dashboard</CardTitle>
                  <CardDescription className="text-xs">
                    {format(currentTime, 'EEEE, d MMM yyyy')}
                  </CardDescription>
                </div>
                <div className="text-right">
                  <p className="font-bold text-2xl font-mono">{format(currentTime, 'h:mm:ss a')}</p>
                  <div className="flex items-center gap-2 justify-end mt-1">
                    <Switch
                      id="online-status"
                      checked={isOnline}
                      onCheckedChange={handleAvailabilityChange}
                    />
                    <Label
                      htmlFor="online-status"
                      className={cn('font-semibold', isOnline ? 'text-green-600' : 'text-muted-foreground')}
                    >
                      {isOnline ? 'ONLINE' : 'OFFLINE'}
                    </Label>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="text-center py-12">
              {isOnline ? (
                <>
                  <SearchingIndicator partnerType="resq" className="w-32 h-32" />
                  <h3 className="text-3xl font-bold mt-4">Waiting for Jobs...</h3>
                </>
              ) : (
                <>
                  <CardTitle>You Are Offline</CardTitle>
                  <CardDescription>Go online to receive jobs.</CardDescription>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* New Service Request Popup */}
      <AlertDialog open={!!jobRequest}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>New Service Request!</AlertDialogTitle>
            <AlertDialogDescription>Review and accept within {requestTimeout} seconds.</AlertDialogDescription>
          </AlertDialogHeader>

          {jobRequest && (
            <>
              {/* countdown */}
              <div className="absolute top-4 right-4 w-12 h-12 flex items-center justify-center rounded-full border-4 border-primary text-primary font-bold text-2xl">
                {requestTimeout}
              </div>

              {/* user header */}
              <div className="flex items-center gap-4">
                <Avatar className="w-12 h-12">
                  <AvatarImage src="https://placehold.co/100x100" />
                  <AvatarFallback>{jobRequest.userName?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-bold">{jobRequest.userName}</p>
                </div>
              </div>

              {/* info */}
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-1 text-green-500" />
                  <p>
                    <span className="font-semibold">LOCATION:</span>{' '}
                    {jobRequest.locationAddress || 'Calculating…'}
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Wrench className="w-4 h-4 mt-1 text-red-500" />
                  <p>
                    <span className="font-semibold">ISSUE:</span> {jobRequest.issue}
                  </p>
                </div>
              </div>

              {/* map */}
              <div className="h-40 w-full rounded-md overflow-hidden my-3 border">
                <LiveMap
                  userLocation={
                    typeof getLat(jobRequest.location) === 'number' &&
                    typeof getLng(jobRequest.location) === 'number'
                      ? {
                          lat: getLat(jobRequest.location) as number,
                          lon: getLng(jobRequest.location) as number,
                        }
                      : undefined
                  }
                  mechanicLocation={
                    mechanicData?.currentLocation
                      ? {
                          lat: mechanicData.currentLocation.latitude,
                          lon: mechanicData.currentLocation.longitude,
                        }
                      : undefined
                  }
                />
              </div>

              {/* distance + eta */}
              <div className="grid grid-cols-2 gap-2 text-center mt-3">
                <div className="p-2 bg-muted rounded-md">
                  <p className="text-xs text-muted-foreground">To User</p>
                  <p className="font-bold text-lg">
                    {typeof jobRequest.distance === 'number'
                      ? `~${jobRequest.distance.toFixed(1)} km`
                      : '~ km'}
                  </p>
                </div>
                <div className="p-2 bg-muted rounded-md">
                  <p className="text-xs text-muted-foreground">ETA</p>
                  <p className="font-bold text-lg">
                    {typeof jobRequest.eta === 'number' ? `~${Math.ceil(jobRequest.eta)} min` : '~ min'}
                  </p>
                </div>
              </div>
            </>
          )}

          <AlertDialogFooter className="grid grid-cols-2 gap-2">
            <Button variant="destructive" onClick={() => handleDeclineJob()}>
              Decline
            </Button>
            <Button onClick={handleAcceptJob}>Accept Job</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
