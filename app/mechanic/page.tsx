
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
  AlertDialog, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import dynamic from 'next/dynamic';
import {
  doc, updateDoc, runTransaction, arrayUnion
} from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import SearchingIndicator from '@/components/ui/searching-indicator';
import { useFirebase } from '@/firebase/client-provider';
import { format } from 'date-fns';
import type { JobRequest } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { usePartnerData } from './layout';
import { Switch } from '@/components/ui/switch';
import { IndianRupee, History, Power, Phone } from 'lucide-react';
import { collection, query, where, onSnapshot, limit, orderBy } from 'firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


const LiveMap = dynamic(() => import('@/components/live-map'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-muted flex items-center justify-center">
      <p>Loading Map...</p>
    </div>
  ),
});

const getLat = (loc: any) => loc?.latitude ?? loc?._lat;
const getLng = (loc: any) => loc?.longitude ?? loc?._long;

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
  const earningsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const requestTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { toast } = useToast();
  const { db } = useFirebase();
  const { partner: mechanicData, isLoading: isPartnerDataLoading, handleAvailabilityChange, requests } =
    usePartnerData();

  const isOnline = mechanicData?.isOnline ?? false;
  
  // PIN lock state
  const [isEarningsVisible, setIsEarningsVisible] = useState(false);
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [recentJobs, setRecentJobs] = useState<JobRequest[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);

  useEffect(() => {
    notificationSoundRef.current = new Audio('/sounds/notification.mp3');
    setIsMounted(true);
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  
  useEffect(() => {
    if (!mechanicData?.id || !db) return;
    setIsHistoryLoading(true);
    const q = query(
      collection(db, "garageRequests"),
      where("mechanicId", "==", mechanicData.id),
      orderBy("createdAt", "desc"),
      limit(5)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const jobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JobRequest));
      setRecentJobs(jobs);
      setIsHistoryLoading(false);
    });
    return () => unsub();
  }, [mechanicData?.id, db]);


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
  
  const resetAfterJob = useCallback(() => {
    setAcceptedJob(null);
    localStorage.removeItem('activeJobId');
    if (mechanicData?.id && db) {
        updateDoc(doc(db, 'mechanics', mechanicData.id), { status: 'online' });
    }
  }, [mechanicData, db]);

  
  useEffect(() => {
    if (requests.length > 0 && !jobRequest && !acceptedJob) {
        const nextRequest = requests.find((r: any) => !processedRequestIds.has(r.id));
        if (nextRequest) {
          if (nextRequest.location) {
            try {
              if (typeof nextRequest.location === "string") {
                nextRequest.location = JSON.parse(nextRequest.location);
              }
            } catch (e) {
                console.error("Failed to parse location string:", e);
            }
          }
            setJobRequest(nextRequest as JobRequest);
            notificationSoundRef.current?.play().catch(() => {});
        }
    }
  }, [requests, jobRequest, acceptedJob, processedRequestIds, mechanicData]);

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
              riderLocation={
                typeof uLat === 'number' && typeof uLng === 'number'
                  ? { lat: uLat, lon: uLng }
                  : undefined
              }
              driverLocation={
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
                    <Button variant="ghost" size="icon" onClick={() => removeBillItem(i)} disabled={billItems.length === 1}>
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

          if (earningsTimerRef.current) clearTimeout(earningsTimerRef.current);
          earningsTimerRef.current = setTimeout(() => {
              setIsEarningsVisible(false);
          }, 10000);
      } else {
          toast({ variant: 'destructive', title: 'Invalid PIN', description: 'Please enter the correct 4-digit PIN.' });
          setPin('');
      }
  }

  useEffect(() => {
    return () => {
        if (earningsTimerRef.current) {
            clearTimeout(earningsTimerRef.current);
        }
    };
  }, []);

  if (isPartnerDataLoading || !isMounted) {
    return (
      <div className="flex items-center justify-center h-full">
        <Skeleton className="w-full h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
        {acceptedJob ? renderActiveJob() : (
            <>
                <Card className="shadow-lg">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle>Your Dashboard</CardTitle>
                                <CardDescription className="text-xs">{format(currentTime, 'EEEE, d MMMM yyyy')}</CardDescription>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-2xl font-mono">{format(currentTime, 'h:mm:ss a')}</p>
                                 <div className="flex items-center space-x-2 justify-end mt-1">
                                    <Switch id="online-status" checked={isOnline} onCheckedChange={handleAvailabilityChange} />
                                    <Label htmlFor="online-status" className={cn('font-semibold', isOnline ? 'text-green-600' : 'text-muted-foreground')}>
                                        {isOnline ? "ONLINE" : "OFFLINE"}
                                    </Label>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    {isOnline ? (
                        <CardContent className="text-center py-12">
                            <SearchingIndicator partnerType="resq" className="w-32 h-32" />
                            <h3 className="text-3xl font-bold mt-4">Waiting for Jobs...</h3>
                            <p className="text-muted-foreground">You are online and ready to accept jobs.</p>
                        </CardContent>
                    ) : (
                        <CardContent className="text-center py-12">
                            <CardTitle>You Are Offline</CardTitle>
                            <CardDescription>Go online to receive service requests.</CardDescription>
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
                            <StatCard title="Today's Earnings" value={isEarningsVisible ? `₹${(mechanicData?.todaysEarnings || 0).toLocaleString()}` : '₹ ****'} icon={IndianRupee} isLoading={isPartnerDataLoading} onValueClick={() => !isEarningsVisible && setIsPinDialogOpen(true)} />
                            <StatCard title="Today's Jobs" value={mechanicData?.jobsToday?.toString() || '0'} icon={History} isLoading={isPartnerDataLoading} />
                            <StatCard title="Acceptance Rate" value={`${mechanicData?.acceptanceRate || '95'}%`} icon={Power} isLoading={isPartnerDataLoading} />
                            <StatCard title="Rating" value={mechanicData?.rating?.toString() || '4.8'} icon={Star} isLoading={isPartnerDataLoading} />
                        </div>
                    </TabsContent>
                    <TabsContent value="history" className="mt-4 flex-1 space-y-2 max-h-48 overflow-y-auto">
                        {isHistoryLoading ? (
                            Array.from({length: 2}).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
                        ) : recentJobs.length > 0 ? (
                            recentJobs.map(job => (
                                <Card key={job.id}>
                                    <CardContent className="p-2 flex items-center justify-between">
                                        <div className="text-sm">
                                            <p className="font-semibold line-clamp-1">{job.issue}</p>
                                            <p className="text-xs text-muted-foreground">{job.createdAt ? new Date(job.createdAt.seconds * 1000).toLocaleString() : 'N/A'}</p>
                                        </div>
                                        <p className="font-bold text-lg">₹{(job as any).totalAmount || 0}</p>
                                    </CardContent>
                                </Card>
                            ))
                        ) : (
                            <div className="text-center py-10 text-muted-foreground">No recent jobs found.</div>
                        )}
                    </TabsContent>
                </Tabs>
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
              <div className="absolute top-4 right-4 w-12 h-12 flex items-center justify-center rounded-full border-4 border-primary text-primary font-bold text-2xl">
                {requestTimeout}
              </div>
              <div className="flex items-center gap-4">
                <Avatar className="w-12 h-12"><AvatarImage src={'https://placehold.co/100x100.png'} alt={jobRequest.userName} data-ai-hint="user portrait" /><AvatarFallback>{jobRequest?.userName?.[0] || 'U'}</AvatarFallback></Avatar>
                 <div>
                   <p className="font-bold">{jobRequest?.userName}</p>
                    <Button variant="link" size="sm" className="h-auto p-0" asChild>
                        <a href={`tel:${jobRequest.userPhone}`}><Phone className="w-3 h-3 mr-1"/>Call User</a>
                    </Button>
                 </div>
               </div>
                <div className="space-y-2 text-sm">
                   {jobRequest.locationAddress && (
                    <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 mt-1 text-green-500 flex-shrink-0" />
                        <p><span className="font-semibold">LOCATION:</span> {jobRequest.locationAddress}</p>
                    </div>
                   )}
                   <div className="flex items-start gap-2">
                       <Wrench className="w-4 h-4 mt-1 text-red-500 flex-shrink-0" />
                       <p><span className="font-semibold">ISSUE:</span> {jobRequest.issue}</p>
                   </div>
               </div>
               <div className="h-40 w-full rounded-md overflow-hidden my-3 border">
                <LiveMap
                  riderLocation={userLocation}
                  driverLocation={mechanicLiveLocation}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 text-center mt-3">
                <div className="p-2 bg-muted rounded-md">
                  <p className="text-xs text-muted-foreground">To User</p>
                  <p className="font-bold text-lg">{jobRequest.distance ? `~${jobRequest.distance.toFixed(1)} km` : '~ km'}</p>
                </div>
                <div className="p-2 bg-muted rounded-md">
                  <p className="text-xs text-muted-foreground">ETA</p>
                  <p className="font-bold text-lg">{jobRequest.eta ? `~${Math.ceil(jobRequest.eta)} min` : '~ min'}</p>
                </div>
              </div>
            </>
          )}
          <AlertDialogFooter className="grid grid-cols-2 gap-2">
            <Button variant="destructive" onClick={() => handleDeclineJob()}>Decline</Button>
            <Button onClick={handleAcceptJob}>Accept Job</Button>
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
  )
}
