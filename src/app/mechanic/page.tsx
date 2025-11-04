
'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Star, CheckCircle, Car, Route, Shield, LifeBuoy, Phone, Sparkles, KeyRound, Clock, Pin, User as UserIcon, Send, ScanLine, Wallet, BarChart, Settings, Power, CircleDot, CreditCard, Bot, ChevronsUpDown, AlertCircle, Hand, History, IndianRupee, Eye, Navigation, LocateFixed, HeartHandshake, MessageSquare, Wrench, Ambulance, FileText, PlusCircle, Trash2, MapPin } from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, } from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import dynamic from 'next/dynamic'
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc, serverTimestamp, GeoPoint, limit, runTransaction, addDoc, arrayUnion, orderBy, Timestamp, FieldValue } from 'firebase/firestore'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import BrandLogo from '@/components/brand-logo'
import SearchingIndicator from '@/components/ui/searching-indicator'
import { useFirebase } from '@/firebase/client-provider'
import { onMessage } from 'firebase/messaging'
import { format } from 'date-fns'
import type { JobRequest } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { usePartnerData } from './layout'
import { Switch } from '@/components/ui/switch'

const LiveMap = dynamic(() => import('@/components/live-map'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-muted flex items-center justify-center"><p>Loading Map...</p></div>
})

const QrScanner = dynamic(() => import('@/components/ui/qr-scanner'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center w-full h-full bg-muted"><p>Loading Scanner...</p></div>
})


interface MechanicData {
    id: string;
    name: string;
    phone: string;
    services: string[];
    isOnline: boolean;
    currentLocation?: GeoPoint;
    qrCodeUrl?: string;
    upiId?: string;
    rating?: number;
    acceptanceRate?: number;
    jobsToday?: number;
    todaysEarnings?: number;
}

interface BillItem {
    description: string;
    amount: string;
}

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
  const [jobStatus, setJobStatus] = useState<'navigating' | 'arrived' | 'in_progress' | 'billing' | 'payment' | 'completed' | null>(null);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [billItems, setBillItems] = useState<BillItem[]>([{ description: '', amount: '' }]);
  const [requestTimeout, setRequestTimeout] = useState(15);
  const [routeGeometry, setRouteGeometry] = useState<any>(null); // State for the route
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [processedRequestIds, setProcessedRequestIds] = useState<Set<string>>(new Set());

  
  const notificationSoundRef = useRef<HTMLAudioElement | null>(null);
  const earningsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const requestTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const { toast } = useToast();
  const { messaging, db } = useFirebase();
  const { partner: mechanicData, isLoading: isPartnerDataLoading, handleAvailabilityChange, requests } = usePartnerData();
  
  // PIN lock state
  const [isEarningsVisible, setIsEarningsVisible] = useState(false);
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [recentJobs, setRecentJobs] = useState<JobRequest[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);

  const isOnline = mechanicData?.isOnline ?? false;


  useEffect(() => {
    notificationSoundRef.current = new Audio('/sounds/notification.mp3');
    setIsMounted(true);
    
    const timer = setInterval(() => {
        setCurrentTime(new Date());
    }, 1000);

    return () => {
        clearInterval(timer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
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


  const handleDeclineJob = useCallback(async (isTimeout = false) => {
    if (!jobRequest || !mechanicData?.id || !db) return
    if (requestTimerRef.current) clearInterval(requestTimerRef.current)
    setProcessedRequestIds(prev => new Set(prev).add(jobRequest.id));
    
    const jobRef = doc(db, 'garageRequests', jobRequest.id);
    await updateDoc(jobRef, {
        rejectedBy: arrayUnion(mechanicData.id)
    });

    setJobRequest(null);
    if (!isTimeout) toast({ title: "Job Declined" })
    else toast({ variant: 'destructive', title: "Request Timed Out" })
  }, [jobRequest, mechanicData?.id, db, toast]);
  
  const resetAfterJob = useCallback(() => {
    setAcceptedJob(null);
    localStorage.removeItem('activeJobId');
    if (mechanicData?.id && db) {
        updateDoc(doc(db, 'mechanics', mechanicData.id), { status: 'online' });
    }
  }, [mechanicData, db]);

  
  useEffect(() => {
    if (requests.length > 0 && !jobRequest && !acceptedJob) {
        const nextRequest = requests.find(req => !processedRequestIds.has(req.id));
        if (nextRequest) {
            // Safely parse location if it's a string
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
            notificationSoundRef.current?.play().catch(e => console.error("Audio play failed:", e));
        }
    }
  }, [requests, jobRequest, acceptedJob, processedRequestIds]);


   // Countdown timer for job request
   useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (jobRequest) {
        setRequestTimeout(15);
        timer = setInterval(() => {
            setRequestTimeout(prev => {
                if (prev <= 1) {
                    if (timer) clearInterval(timer);
                    handleDeclineJob(true); // Automatically decline
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        requestTimerRef.current = timer;
    }

    return () => {
        if (timer) clearInterval(timer);
    };
  }, [jobRequest, handleDeclineJob]);
  
  const handleAcceptJob = async () => {
    if (!jobRequest || !mechanicData || !db) return;
     if (requestTimerRef.current) {
         clearInterval(requestTimerRef.current);
         requestTimerRef.current = null;
     }
  
    const jobRef = doc(db, 'garageRequests', jobRequest.id);
    const partnerRef = doc(db, 'mechanics', mechanicData.id);
  
    try {
      await runTransaction(db, async (transaction) => {
        const jobDoc = await transaction.get(jobRef);
        if (!jobDoc.exists()) throw new Error("Job not found.");
        
        if (jobDoc.data().status !== 'pending') {
          throw new Error("This job has already been accepted.");
        }
  
        transaction.update(jobRef, {
          status: 'accepted',
          mechanicId: mechanicData.id,
          mechanicName: mechanicData.name,
          mechanicPhone: mechanicData.phone,
        });
        transaction.update(partnerRef, { status: 'on_job' });
      });
  
      setAcceptedJob({ ...jobRequest, status: 'accepted' });
      setJobRequest(null);
      setProcessedRequestIds(prev => new Set(prev).add(jobRequest.id));
      localStorage.setItem('activeJobId', jobRequest.id);
  
      toast({
        title: 'Job Accepted!',
        description: `Navigate to ${jobRequest.userName}'s location.`,
      });
    } catch (err: any) {
      console.error("Error accepting job:", err);
      toast({
        variant: 'destructive',
        title: 'Could not accept job',
        description: err.message || 'It might have been taken by another mechanic.',
      });
      setJobRequest(null);
    }
  };  

  // Effect to fetch route when a job is accepted
  useEffect(() => {
    const fetchRoute = async () => {
        if (!acceptedJob || !mechanicData?.currentLocation) return;
        
        const startCoords = {
            lat: mechanicData.currentLocation.latitude,
            lon: mechanicData.currentLocation.longitude,
        };
        const endCoords = {
            lat: acceptedJob.location.latitude,
            lon: acceptedJob.location.longitude,
        };

        try {
            const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startCoords.lon},${startCoords.lat};${endCoords.lon},${endCoords.lat}?overview=full&geometries=geojson`;
            const response = await fetch(osrmUrl);
            const data = await response.json();
            if (data.code === 'Ok' && data.routes?.[0]) {
                setRouteGeometry(data.routes[0].geometry);
            }
        } catch (error) {
            console.error("Failed to fetch route:", error);
            toast({ variant: 'destructive', title: 'Routing Error', description: 'Could not fetch the route to the user.' });
        }
    };
    
    fetchRoute();
  }, [acceptedJob, mechanicData?.currentLocation, toast]);
  
  useEffect(() => {
    if (isScannerOpen) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(() => setHasCameraPermission(true))
        .catch(() => {
            setHasCameraPermission(false);
            toast({
                variant: 'destructive',
                title: 'Camera Access Denied',
                description: 'Please enable camera permissions in your browser settings to use the scanner.',
            });
        })
    }
  }, [isScannerOpen, toast]);

    // Listen for job status changes (e.g., payment completion)
  useEffect(() => {
    if (!acceptedJob?.id || !db) return;

    const jobRef = doc(db, 'garageRequests', acceptedJob.id);
    const unsubscribe = onSnapshot(jobRef, (docSnap) => {
        if (docSnap.exists()) {
            const jobData = docSnap.data();
            if (jobData.status === 'completed' && jobStatus !== 'completed') {
                toast({
                    title: 'Payment Received!',
                    description: `Payment of ₹${jobData.totalAmount.toFixed(2)} has been credited to your wallet.`,
                    className: 'bg-green-600 text-white border-green-600'
                });
                setAcceptedJob(null);
                setJobStatus(null);
                setBillItems([{ description: '', amount: '' }]);
                setEnteredOtp('');
                setRouteGeometry(null);
                localStorage.removeItem('activeJobId');
            }
        }
    });

    return () => unsubscribe();
  }, [acceptedJob, jobStatus, toast, db]);

  const handleScanResult = (result: any, error: any) => {
      if (!!result) {
        setIsScannerOpen(false);
        const textResult = result?.getText();
        toast({
            title: "QR Scanned (Mechanic)",
            description: `This will soon auto-fill the payment form with: ${textResult}`
        });
    }

    if (!!error) {
       if (error.name !== "NotFoundException") {
         console.info(error);
       }
    }
  }

  const handleVerifyOtp = async () => {
      if (enteredOtp === acceptedJob?.otp && acceptedJob && db) {
          const jobRef = doc(db, 'garageRequests', acceptedJob.id);
          await updateDoc(jobRef, { status: 'in_progress' });
          localStorage.setItem('activeJobId', acceptedJob.id);
          setJobStatus('in_progress');
          toast({ title: "OTP Verified!", description: "You can now start the service." });
      } else {
          toast({ variant: 'destructive', title: "Invalid OTP", description: "Please ask the driver for the correct OTP." });
      }
  }
  
  const handleBillItemChange = (index: number, field: 'description' | 'amount', value: string) => {
    const newItems = [...billItems];
    newItems[index][field] = value;
    setBillItems(newItems);
  };

  const addBillItem = () => {
    setBillItems([...billItems, { description: '', amount: '' }]);
  };
  
  const removeBillItem = (index: number) => {
      const newItems = billItems.filter((_, i) => i !== index);
      setBillItems(newItems);
  }
  
  const totalAmount = billItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

  const completeJob = async () => {
      if (!acceptedJob || !mechanicData || !db) return;
      
      const filledItems = billItems.filter(item => item.description && item.amount);
      if(filledItems.length === 0) {
          toast({ variant: 'destructive', title: 'Empty Bill', description: 'Please add at least one service item to the bill.' });
          return;
      }
      
      const jobRef = doc(db, 'garageRequests', acceptedJob.id);
      
      try {
           const invoiceId = `INV-CZ-${Date.now()}`;
          await updateDoc(jobRef, { 
              status: 'bill_sent',
              billItems: filledItems.map(item => ({ description: item.description, amount: parseFloat(item.amount) })),
              totalAmount: totalAmount,
              invoiceId: invoiceId,
              billDate: serverTimestamp(),
              billedTo: acceptedJob.userName
          });
          
          setJobStatus('payment'); // Local state update for UI
          toast({ title: "Job Card Sent for Approval!", description: `The bill has been sent to the user.` });
          
      } catch (error) {
          console.error("Error sending bill:", error);
          toast({ variant: 'destructive', title: 'Error', description: 'Could not send the bill to the user.' });
      }
  }


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
  
  const getLat = (loc: any) => loc?.latitude ?? loc?._lat;
  const getLng = (loc: any) => loc?.longitude ?? loc?._long;

  const mechanicLiveLocation = mechanicData?.currentLocation 
    ? { lat: getLat(mechanicData.currentLocation), lon: getLng(mechanicData.currentLocation) }
    : undefined;
    
  const userLocation = acceptedJob
    ? { lat: getLat(acceptedJob.location), lon: getLng(acceptedJob.location) }
    : undefined;

  
  const renderActiveJob = () => {
    if (!acceptedJob) return null;
    
    return (
        <Card className="shadow-lg animate-fade-in w-full">
            <CardHeader>
                <CardTitle>Ongoing Job</CardTitle>
                <CardDescription>User: {acceptedJob.userName} - Issue: {acceptedJob.issue}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {jobStatus === 'navigating' && (
                    <div className="grid grid-cols-1 gap-2">
                        <Button className="w-full" size="lg" onClick={() => setJobStatus('arrived')}>Arrived at Location</Button>
                        <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" size="lg" onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${getLat(acceptedJob.location)},${getLng(acceptedJob.location)}`, '_blank')}>
                            <Navigation className="mr-2 h-4 h-4" />
                            Navigate with Google Maps
                        </Button>
                    </div>
                )}
                {jobStatus === 'arrived' && (
                    <div className="space-y-4">
                        <Label>Enter OTP from user to start service</Label>
                        <Input className="text-center text-xl tracking-[0.5em]" maxLength={4} value={enteredOtp} onChange={(e) => setEnteredOtp(e.target.value)} />
                        <Button className="w-full" onClick={handleVerifyOtp}>Verify & Start Service</Button>
                    </div>
                )}
                {jobStatus === 'in_progress' && (
                    <div className="text-center p-4 bg-muted rounded-lg space-y-4">
                        <p className="font-semibold">Service Ongoing...</p>
                        <Button className="w-full" size="lg" onClick={() => setJobStatus('billing')}>Complete Service & Generate Bill</Button>
                    </div>
                )}
                 {jobStatus === 'billing' && (
                    <div className="space-y-4">
                        <Label className="text-lg font-semibold">Generate Job Card</Label>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                            {billItems.map((item, index) => (
                                <div key={index} className="flex gap-2 items-center">
                                    <Input
                                        placeholder="Service / Item Description"
                                        value={item.description}
                                        onChange={(e) => handleBillItemChange(index, 'description', e.target.value)}
                                    />
                                    <Input
                                        type="number"
                                        placeholder="Amount"
                                        className="w-28"
                                        value={item.amount}
                                        onChange={(e) => handleBillItemChange(index, 'amount', e.target.value)}
                                    />
                                    <Button variant="ghost" size="icon" onClick={() => removeBillItem(index)} disabled={billItems.length === 1}>
                                        <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                        <Button variant="outline" size="sm" onClick={addBillItem} className="w-full">
                            <PlusCircle className="w-4 h-4 mr-2" /> Add Line Item
                        </Button>
                         <div className="flex justify-between items-center font-bold text-lg pt-2 border-t">
                            <span>Total Amount:</span>
                            <span>₹{totalAmount.toFixed(2)}</span>
                        </div>
                        <Button className="w-full" size="lg" onClick={completeJob}>Submit Job Card for Approval</Button>
                    </div>
                )}
                {jobStatus === 'payment' && (
                     <div className="text-center space-y-4 p-4 bg-muted rounded-lg">
                        <p className="font-semibold">Waiting for Payment</p>
                        <p className="text-sm text-muted-foreground">The bill has been sent to the user for approval and payment.</p>
                        <p className="text-3xl font-bold">₹{totalAmount.toFixed(2)}</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
  }
  
  if (isPartnerDataLoading || !isMounted) {
    return <div className="flex items-center justify-center h-full"><Skeleton className="w-full h-96" /></div>
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
                                 <div className="flex items-center space-x-2 justify-end">
                                    <Switch id="online-status" checked={isOnline} onCheckedChange={handleAvailabilityChange} />
                                    <Label htmlFor="online-status" className={cn("font-semibold", isOnline ? "text-green-600" : "text-muted-foreground")}>
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
                            <CardTitle>You are Offline</CardTitle>
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

      <AlertDialog open={!!jobRequest}>
        <AlertDialogContent>
          <AlertDialogHeader>
              <AlertDialogTitle>New Service Request!</AlertDialogTitle>
              <AlertDialogDescription>A new job is available. Please review and respond quickly.</AlertDialogDescription>
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
                  <p className="text-xs text-muted-foreground">Est. Arrival</p>
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

    
