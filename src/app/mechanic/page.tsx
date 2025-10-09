
'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Star, CheckCircle, Car, Route, Shield, LifeBuoy, Phone, Sparkles, KeyRound, Clock, Pin, User as UserIcon, QrCode, Send, ScanLine, Wallet, BarChart, Settings, Power, CircleDot, CreditCard, Bot, ChevronsUpDown, AlertCircle, Hand, History, IndianRupee, Eye, Navigation, LocateFixed, HeartHandshake, MessageSquare, Wrench, Ambulance, FileText, PlusCircle, Trash2 } from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, } from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import dynamic from 'next/dynamic'
import { db } from '@/lib/firebase'
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc, serverTimestamp, GeoPoint, limit, runTransaction, addDoc, arrayUnion, orderBy, Timestamp } from 'firebase/firestore'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import BrandLogo from '@/components/brand-logo'
import Lottie from 'lottie-react'
import lottieFindingDriver from '@/components/ui/lottie-finding-driver.json'


const LiveMap = dynamic(() => import('@/components/live-map'), { 
    ssr: false,
    loading: () => <div className="w-full h-full bg-muted flex items-center justify-center"><p>Loading Map...</p></div>
});

const QrScanner = dynamic(() => import('@/components/ui/qr-scanner'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center w-full h-full bg-muted"><p>Loading Scanner...</p></div>
})


interface JobRequest {
    id: string;
    driverName: string;
    issue: string;
    distance?: number;
    location: GeoPoint;
    otp: string;
    rejectedBy?: string[];
    billedTo?: string;
    invoiceId?: string;
    billDate?: any;
    createdAt: Timestamp;
}

interface MechanicData {
    id: string;
    name: string;
    phone: string;
    services: string[];
    isAvailable: boolean;
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


export default function ResQDashboard() {
  const [isMounted, setIsMounted] = useState(false);
  const [mechanicData, setMechanicData] = useState<MechanicData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAvailable, setIsAvailable] = useState(false);
  const [jobRequest, setJobRequest] = useState<JobRequest | null>(null);
  const [acceptedJob, setAcceptedJob] = useState<JobRequest | null>(null);
  const [jobStatus, setJobStatus] = useState<'navigating' | 'arrived' | 'in_progress' | 'payment' | 'completed' | null>(null);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [billItems, setBillItems] = useState<BillItem[]>([{ description: '', amount: '' }]);
  const [requestTimeout, setRequestTimeout] = useState(15);
  const [routeGeometry, setRouteGeometry] = useState<any>(null); // State for the route
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  
  const notificationSoundRef = useRef<HTMLAudioElement | null>(null);
  const earningsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const requestTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const { toast } = useToast();
  
  // PIN lock state
  const [isEarningsVisible, setIsEarningsVisible] = useState(false);
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');

  useEffect(() => {
    notificationSoundRef.current = new Audio('/sounds/notification.mp3');
    setIsMounted(true);
    const session = localStorage.getItem('cabzi-resq-session');
    if (!session || !db) {
        setIsLoading(false);
        return;
    }
    const { phone } = JSON.parse(session);
    const mechanicsRef = collection(db, "mechanics");
    const q = query(mechanicsRef, where("phone", "==", phone));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            const data = doc.data();
            setMechanicData({ 
              id: doc.id, 
              ...data,
              rating: data.rating || 4.8,
              acceptanceRate: data.acceptanceRate || 95,
              jobsToday: data.jobsToday || 0,
              todaysEarnings: data.todaysEarnings || 0,
              qrCodeUrl: data.qrCodeUrl || `https://placehold.co/300x300.png?text=CabziUPI`,
              upiId: data.upiId || `${data.phone}@cabzi`,
            } as MechanicData);
            setIsAvailable(data.isAvailable);
        }
        setIsLoading(false);
    });

     // Check for active job on load
    const checkActiveJob = async () => {
      const jobId = localStorage.getItem('activeJobId');
      if (jobId) {
        const jobRef = doc(db, 'garageRequests', jobId);
        const jobSnap = await getDoc(jobRef);
        if (jobSnap.exists() && ['accepted', 'in_progress', 'bill_sent'].includes(jobSnap.data().status)) {
            const jobData = { id: jobSnap.id, ...jobSnap.data() } as JobRequest;
            setAcceptedJob(jobData);

            let currentStatus = 'navigating';
            if(jobSnap.data().status === 'in_progress') currentStatus = 'in_progress';
            if(jobSnap.data().status === 'bill_sent') currentStatus = 'payment';
            setJobStatus(currentStatus as any);
        } else {
            localStorage.removeItem('activeJobId');
        }
      }
    };
    checkActiveJob();

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

   // Effect for the request countdown timer
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobRequest]);
  
    // Listen for new garage requests when available. DEPRECATED but kept as fallback.
    useEffect(() => {
        if (!isAvailable || !db || !mechanicData || acceptedJob || jobRequest) return;

        const q = query(
            collection(db, "garageRequests"),
            where("status", "==", "pending")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JobRequest));
            const validRequests = requests.filter(req => !req.rejectedBy?.includes(mechanicData.id));

            if (validRequests.length > 0 && !jobRequest) {
                const closestRequest = validRequests[0]; 
                closestRequest.distance = 5.3;
                setJobRequest(closestRequest);
                notificationSoundRef.current?.play().catch(e => console.error("Audio play failed:", e));
            }
        });

        return () => unsubscribe();
    }, [isAvailable, mechanicData, acceptedJob, jobRequest]);

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
            toast({ variant: 'destructive', title: 'Routing Error', description: 'Could not fetch the route to the driver.' });
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
  }, [acceptedJob, db, jobStatus, toast]);

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


  const handleAvailabilityChange = async (checked: boolean) => {
    if (!mechanicData || !db) return;
    setIsAvailable(checked);
    const mechanicRef = doc(db, 'mechanics', mechanicData.id);
    try {
        await updateDoc(mechanicRef, { isAvailable: checked });
        toast({
            title: checked ? "You are now Available" : "You are now Offline",
            description: checked ? "Waiting for nearby service requests." : "You will not receive new job requests.",
        });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not update your status.' });
        setIsAvailable(!checked); // Revert on failure
    }
  }

  const handleAcceptJob = async () => {
    if (!jobRequest || !mechanicData || !db) return;
     if (requestTimerRef.current) {
         clearInterval(requestTimerRef.current);
         requestTimerRef.current = null;
     }

    const jobRef = doc(db, 'garageRequests', jobRequest.id);
    try {
        await updateDoc(jobRef, {
            status: 'accepted',
            mechanicId: mechanicData.id,
            mechanicName: mechanicData.name,
            phone: mechanicData.phone,
        });
        localStorage.setItem('activeJobId', jobRequest.id);
        setAcceptedJob(jobRequest);
        setJobRequest(null);
        setJobStatus('navigating');
        toast({ title: 'Job Accepted!', description: `Navigate to ${jobRequest.driverName}'s location.` });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not accept the job. It may have been taken.' });
    }
  }

  const handleDeclineJob = async (isTimeout = false) => {
    if (!jobRequest || !mechanicData || !db) return;

    if (requestTimerRef.current) {
        clearInterval(requestTimerRef.current);
        requestTimerRef.current = null;
    }
    
    const jobRef = doc(db, 'garageRequests', jobRequest.id);
    await updateDoc(jobRef, { rejectedBy: arrayUnion(mechanicData.id) });

    if (!isTimeout) {
        toast({ title: "Job Declined", description: "You will be shown the next available job." });
    } else {
        toast({ variant: 'destructive', title: "Request Timed Out", description: "Looking for next available job." });
    }
    setJobRequest(null);
  }

  const handleVerifyOtp = async () => {
      if (enteredOtp === acceptedJob?.otp && acceptedJob) {
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
  }

  const addBillItem = () => {
    setBillItems([...billItems, { description: '', amount: '' }]);
  }
  
  const removeBillItem = (index: number) => {
      const newItems = billItems.filter((_, i) => i !== index);
      setBillItems(newItems);
  }
  
  const totalAmount = billItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

  const completeJob = async () => {
      if (!acceptedJob || !db || !mechanicData) return;
      
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
              billedTo: acceptedJob.driverName
          });
          
          setJobStatus('payment'); // Local state update for UI
          toast({ title: "Bill Sent!", description: `The bill has been sent to the driver for payment.` });
          
      } catch (error) {
          console.error("Error sending bill:", error);
          toast({ variant: 'destructive', title: 'Error', description: 'Could not send the bill to the driver.' });
      }
  }

   const handlePinSubmit = () => {
      const storedPin = localStorage.getItem('cabzi-user-pin');
      if (!storedPin) {
          toast({ variant: 'destructive', title: 'PIN Not Set', description: 'Please set a UPI PIN from your wallet first.' });
          return;
      }
      if (enteredPin === storedPin) {
          setIsEarningsVisible(true);
          setIsPinDialogOpen(false);
          setEnteredPin('');
          toast({ title: 'Earnings Revealed', description: 'Your earnings for today are now visible.' });

          if (earningsTimerRef.current) clearTimeout(earningsTimerRef.current);
          earningsTimerRef.current = setTimeout(() => {
              setIsEarningsVisible(false);
          }, 10000);
      } else {
          toast({ variant: 'destructive', title: 'Invalid PIN', description: 'Please enter the correct 4-digit PIN.' });
      }
  }

  useEffect(() => {
    return () => {
        if (earningsTimerRef.current) {
            clearTimeout(earningsTimerRef.current);
        }
    };
  }, []);
  
  const mechanicLiveLocation = mechanicData?.currentLocation 
    ? { lat: mechanicData.currentLocation.latitude, lon: mechanicData.currentLocation.longitude }
    : undefined;
    
  const driverLocation = acceptedJob
    ? { lat: acceptedJob.location.latitude, lon: acceptedJob.location.longitude }
    : undefined;

  if (isLoading || !isMounted) {
    return <div className="flex items-center justify-center h-full"><Skeleton className="w-full h-96" /></div>
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-background">
      <div className="flex-1 relative">
           <LiveMap 
              riderLocation={driverLocation} // The "Rider" in this context is the stranded driver
              driverLocation={mechanicLiveLocation} // The "Driver" is the mechanic themself
              routeGeometry={routeGeometry}
              onLocationFound={(addr, coords) => {
                if (db && mechanicData) {
                    updateDoc(doc(db, 'mechanics', mechanicData.id), {
                        currentLocation: new GeoPoint(coords.lat, coords.lon)
                    });
                }
              }}
          />
          <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
              <Card className="p-2 bg-background/80 backdrop-blur-sm flex items-center gap-2">
                  <div className="flex items-center space-x-2">
                      <Switch id="online-status" checked={isAvailable} onCheckedChange={handleAvailabilityChange} className="data-[state=checked]:bg-green-500" />
                      <Label htmlFor="online-status" className={cn("font-medium", isAvailable ? 'text-primary' : 'text-muted-foreground')}>{isAvailable ? 'Available' : 'Unavailable'}</Label>
                  </div>
               </Card>
           </div>
      </div>

       <div className="h-1/2 bg-muted/30 rounded-t-2xl shadow-2xl -mt-4 z-10 p-4 flex flex-col gap-4 overflow-y-auto">
        {jobRequest && !acceptedJob && (
            <AlertDialog open={!!jobRequest}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2"><Wrench className="w-8 h-8 text-primary" /> New Service Request!</AlertDialogTitle>
                        <AlertDialogDescription>A nearby driver needs assistance.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-3 py-4">
                        <div><Label>Driver</Label><p className="font-semibold">{jobRequest.driverName}</p></div>
                        <div><Label>Distance</Label><p className="font-semibold">{jobRequest.distance} km away</p></div>
                        <div><Label>Issue</Label><p className="font-semibold">{jobRequest.issue}</p></div>
                    </div>
                    <AlertDialogFooter className="grid grid-cols-2">
                        <Button variant="destructive" onClick={() => handleDeclineJob()}>Decline ({requestTimeout}s)</Button>
                        <Button onClick={handleAcceptJob}>Accept Job</Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        )}

        {acceptedJob ? (
            <Card className="animate-fade-in">
                <CardHeader>
                    <CardTitle>Ongoing Job</CardTitle>
                    <CardDescription>Driver: {acceptedJob.driverName} - Issue: {acceptedJob.issue}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {jobStatus === 'navigating' && (
                        <div className="grid grid-cols-1 gap-2">
                            <Button className="w-full" size="lg" onClick={() => setJobStatus('arrived')}>Arrived at Location</Button>
                            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" size="lg" onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${acceptedJob.location.latitude},${acceptedJob.location.longitude}`, '_blank')}>
                                <Navigation className="mr-2 h-4 h-4" />
                                Navigate with Google Maps
                            </Button>
                        </div>
                    )}
                    {jobStatus === 'arrived' && (
                        <div className="space-y-4">
                            <Label>Enter OTP from driver to start service</Label>
                            <Input className="text-center text-xl tracking-[0.5em]" maxLength={4} value={enteredOtp} onChange={(e) => setEnteredOtp(e.target.value)} />
                            <Button className="w-full" onClick={handleVerifyOtp}>Verify & Start Service</Button>
                        </div>
                    )}
                    {jobStatus === 'in_progress' && (
                        <div className="text-center space-y-4 p-4 bg-muted rounded-lg">
                            <p className="font-semibold">Service Ongoing...</p>
                            <Button className="w-full" size="lg" onClick={() => setJobStatus('payment')}>Complete Service & Generate Bill</Button>
                        </div>
                    )}
                    {jobStatus === 'payment' && (
                        <div className="space-y-4">
                            <Label className="text-lg font-semibold">Generate Bill</Label>
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
                            <Button className="w-full" size="lg" onClick={completeJob}>Generate & Send Bill</Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        ) : (
            <>
                 <div className="grid grid-cols-4 gap-2 text-center">
                    <Card><CardContent className="p-2"><div className="text-xs text-muted-foreground">Jobs Today</div><div className="font-bold text-lg flex items-center justify-center gap-1"><History className="w-4 h-4 text-muted-foreground"/>{mechanicData?.jobsToday || 0}</div></CardContent></Card>
                    <Card><CardContent className="p-2"><div className="text-xs text-muted-foreground">Rating</div><div className="font-bold text-lg flex items-center justify-center gap-1"><Star className="w-4 h-4 text-muted-foreground"/>{mechanicData?.rating || '4.8'}</div></CardContent></Card>
                    <Card><CardContent className="p-2"><div className="text-xs text-muted-foreground">Acceptance</div><div className="font-bold text-lg flex items-center justify-center gap-1"><CheckCircle className="w-4 h-4 text-muted-foreground"/>{mechanicData?.acceptanceRate || '95'}%</div></CardContent></Card>
                     <Card>
                        <CardContent className="p-2">
                             <div className="text-xs text-muted-foreground">Earnings</div>
                             {isEarningsVisible ? (
                                 <div className="font-bold text-lg flex items-center justify-center gap-1">
                                     <IndianRupee className="w-4 h-4 text-muted-foreground"/>{(mechanicData?.todaysEarnings || 0).toLocaleString()}
                                 </div>
                             ) : (
                                 <Button variant="ghost" size="sm" className="w-full h-auto py-0.5" onClick={() => setIsPinDialogOpen(true)}>
                                     <span className="font-bold text-lg">₹ ****</span>
                                     <Eye className="w-4 h-4 ml-2 text-muted-foreground"/>
                                 </Button>
                             )}
                        </CardContent>
                    </Card>
                </div>
                 <Tabs defaultValue="payments" className="flex-1 flex flex-col">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="payments">Quick Payments</TabsTrigger>
                        <TabsTrigger value="coach">AI Coach</TabsTrigger>
                    </TabsList>
                    <TabsContent value="payments" className="mt-4 flex-1">
                        <div className="grid grid-cols-3 gap-2">
                            <Button variant="outline" className="flex-col h-20"><Send className="w-6 h-6 mb-1 text-primary" /><span className="text-xs">Pay UPI</span></Button>
                             <Dialog><DialogTrigger asChild><Button variant="outline" className="flex-col h-20"><QrCode className="w-6 h-6 mb-1 text-primary"/><span className="text-xs">My QR</span></Button></DialogTrigger>
                             <DialogContent className="max-w-xs"><DialogHeader><DialogTitle className="text-center">My Cabzi UPI QR Code</DialogTitle></DialogHeader><div className="flex flex-col items-center gap-4 py-4"><div className="p-4 bg-white rounded-lg border"><Image src={mechanicData?.qrCodeUrl || ''} alt="UPI QR Code" width={200} height={200} data-ai-hint="qr code"/></div><p className="font-semibold text-lg text-center">{mechanicData?.upiId || '...'}</p></div></DialogContent></Dialog>
                             <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}><DialogTrigger asChild><Button variant="outline" className="flex-col h-20"><ScanLine className="w-6 h-6 mb-1 text-primary"/><span className="text-xs">Scan & Pay</span></Button></DialogTrigger>
                                <DialogContent>
                                    <DialogHeader><DialogTitle>Scan UPI QR Code</DialogTitle><DialogDescription>Point your camera at a UPI QR code.</DialogDescription></DialogHeader>
                                    {isScannerOpen && (
                                    <div className="relative w-full aspect-square bg-muted rounded-lg overflow-hidden mt-4">
                                        <QrScanner onResult={handleScanResult} />
                                        {hasCameraPermission === false && (
                                            <Alert variant="destructive" className="absolute bottom-4 left-4 right-4">
                                                <AlertCircle className="h-4 w-4" /><AlertTitle>Camera Permission Denied</AlertTitle>
                                                <AlertDescription>Please allow camera access in your browser settings.</AlertDescription>
                                            </Alert>
                                        )}
                                    </div>
                                    )}
                                </DialogContent>
                             </Dialog>
                        </div>
                    </TabsContent>
                    <TabsContent value="coach" className="mt-4 flex-1">
                         <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground border-none h-full flex items-center">
                            <CardContent className="p-4"><div className="flex gap-3 items-center"><Sparkles className="w-8 h-8 text-yellow-300 flex-shrink-0" />
                                <div><p className="font-bold">AI Earnings Coach</p><p className="text-sm text-primary-foreground/90">Focus on battery jump-starts in the evening. It's a high-demand service in your area!</p></div>
                            </div></CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </>
        )}
      </div>
        <Dialog open={isPinDialogOpen} onOpenChange={setIsPinDialogOpen}>
            <DialogContent className="max-w-xs">
                <DialogHeader>
                    <DialogTitle>Enter PIN to View</DialogTitle>
                    <DialogDescription>For your privacy, please enter your PIN to see today's earnings.</DialogDescription>
                </DialogHeader>
                 <div className="flex flex-col items-center justify-center gap-4 py-4">
                    <Label htmlFor="pin-input-earnings" className="sr-only">Enter PIN</Label>
                    <Input 
                        id="pin-input-earnings" 
                        type="password" 
                        inputMode="numeric" 
                        maxLength={4}
                        value={enteredPin}
                        onChange={(e) => setEnteredPin(e.target.value)}
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
  )
}
