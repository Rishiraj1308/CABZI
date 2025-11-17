
'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { doc, updateDoc, onSnapshot, GeoPoint, serverTimestamp, runTransaction } from 'firebase/firestore'
import { useFirebase } from '@/lib/firebase/client-provider'
import type { GarageRequest, ClientSession } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Star, History, IndianRupee, Wrench, KeyRound, Clock, MapPin, Navigation, CheckCircle, Eye, Sparkles } from 'lucide-react'
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { toast } from 'sonner'
import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import SearchingIndicator from '@/components/ui/searching-indicator'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Phone } from 'lucide-react'
import { format } from 'date-fns'

const LiveMap = dynamic(() => import('@/features/user/components/ride/LiveMap'), { ssr: false })

const StatCard = ({ title, value, icon: Icon, isLoading }: { title: string, value: string, icon: React.ElementType, isLoading?: boolean }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      {isLoading ? <Skeleton className="h-8 w-20" /> : <div className="text-2xl font-bold">{value}</div>}
    </CardContent>
  </Card>
);

export default function MechanicDashboardPage() {
    const [jobRequest, setJobRequest] = useState<GarageRequest | null>(null);
    const [activeJob, setActiveJob] = useState<GarageRequest | null>(null);
    const requestTimerRef = useRef<NodeJS.Timeout | null>(null);
    const notificationSoundRef = useRef<HTMLAudioElement | null>(null);
    const { db, messaging } = useFirebase();
    const [session, setSession] = useState<ClientSession | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [enteredOtp, setEnteredOtp] = useState('');
    const [billItems, setBillItems] = useState<{ description: string, amount: number }[]>([]);
    const [newItemDesc, setNewItemDesc] = useState('');
    const [newItemAmount, setNewItemAmount] = useState('');
    
    useEffect(() => {
        const sessionData = localStorage.getItem('curocity-resq-session');
        if (sessionData) setSession(JSON.parse(sessionData));
        setIsLoading(false);
    }, []);

    // Effect for listening to incoming job requests via FCM
    useEffect(() => {
        if (!messaging) return;
        const { onMessage } = require("firebase/messaging");

        const unsubscribe = onMessage(messaging, (payload: any) => {
            if (payload.data?.type === 'new_garage_request') {
                setJobRequest(payload.data);
                if (notificationSoundRef.current) {
                    notificationSoundRef.current.play().catch(e => console.log("Audio play failed:", e));
                }
            }
        });

        return () => unsubscribe();
    }, [messaging]);

    // Live Location Tracking
    useEffect(() => {
        let watchId: number | null = null;
        
        if (session?.partnerId && db && session.isOnline) {
            watchId = navigator.geolocation.watchPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    updateDoc(doc(db, 'mechanics', session.partnerId!), {
                        currentLocation: new GeoPoint(latitude, longitude),
                        lastSeen: serverTimestamp()
                    });
                },
                (error) => {
                    console.error("Geolocation watch error:", error);
                    if (error.code === error.PERMISSION_DENIED) {
                        toast.error("Location Access Denied");
                        handleAvailabilityChange(false);
                    }
                },
                { enableHighAccuracy: true }
            );
        }

        return () => {
            if (watchId !== null) navigator.geolocation.clearWatch(watchId);
        };
    }, [session?.isOnline, session?.partnerId, db]);
    
    const handleAvailabilityChange = async (checked: boolean) => {
      if (!session?.partnerId || !db) return;
      const partnerRef = doc(db, 'mechanics', session.partnerId);
      try {
        await updateDoc(partnerRef, { isOnline: checked, lastSeen: serverTimestamp() });
        setSession(prev => prev ? ({...prev, isOnline: checked}) : null);
        toast(checked ? "You are now ONLINE" : "You are OFFLINE");
      } catch (error) {
        toast.error('Could not update your status.');
      }
    };

    const resetAfterJob = useCallback(() => {
      setActiveJob(null);
      localStorage.removeItem('activeGarageJobId');
      setBillItems([]);
    }, []);

    // Listen for updates on the active job
    useEffect(() => {
      if (!db || !activeJob?.id) return;
      const unsub = onSnapshot(doc(db, 'garageRequests', activeJob.id), (docSnap) => {
          if (docSnap.exists()) {
              const jobData = { id: docSnap.id, ...docSnap.data() } as GarageRequest;
              setActiveJob(jobData);
              if (jobData.status === 'completed' || jobData.status === 'cancelled_by_user') {
                  toast.info(jobData.status === 'completed' ? 'Job Completed & Paid' : 'Job Cancelled by User');
                  resetAfterJob();
              }
          } else {
              resetAfterJob();
          }
      });
      return () => unsub();
    }, [db, activeJob?.id, resetAfterJob]);

    const handleAcceptJob = async () => {
        if (!jobRequest || !session?.partnerId || !db) return;
        
        const jobRef = doc(db, 'garageRequests', jobRequest.id);
        const partnerRef = doc(db, 'mechanics', session.partnerId);

        try {
            await runTransaction(db, async (transaction) => {
                const jobDoc = await transaction.get(jobRef);
                if (!jobDoc.exists() || jobDoc.data().status !== 'pending') throw new Error("Job already taken.");
                
                transaction.update(jobRef, {
                    status: 'accepted',
                    mechanicId: session.partnerId,
                    mechanicName: session.name,
                    mechanicPhone: session.phone,
                });
                transaction.update(partnerRef, { status: 'on_trip' });
            });

            setActiveJob({ ...jobRequest, status: 'accepted' } as GarageRequest);
            localStorage.setItem('activeGarageJobId', jobRequest.id);
            setJobRequest(null);
            toast.success('Job Accepted!');
        } catch (err: any) {
            toast.error('Could not accept job', { description: err.message });
            setJobRequest(null);
        }
    };

    const handleDeclineJob = async () => {
        if (!jobRequest || !session?.partnerId || !db) return;
        await updateDoc(doc(db, 'garageRequests', jobRequest.id), {
            rejectedBy: serverTimestamp() // Simplified
        });
        setJobRequest(null);
        toast("Job Declined");
    };

    const handleVerifyOtp = async () => {
        if (enteredOtp !== activeJob?.otp) {
            toast.error('Invalid OTP');
            return;
        }
        await updateDoc(doc(db, 'garageRequests', activeJob.id), { status: 'in_progress' });
    };

    const handleSendBill = async () => {
        if (billItems.length === 0) {
            toast.error("Bill is empty");
            return;
        }
        const totalAmount = billItems.reduce((sum, item) => sum + item.amount, 0);
        await updateDoc(doc(db, 'garageRequests', activeJob!.id), {
            status: 'bill_sent',
            billItems,
            totalAmount,
        });
        toast.success("Bill sent to customer for approval.");
    };

    if (isLoading) return <div className="p-4"><Skeleton className="h-64 w-full" /></div>;

    const isOnline = session?.isOnline ?? false;
    const totalAmount = billItems.reduce((sum, item) => sum + item.amount, 0);

    const renderActiveJob = () => {
        if (!activeJob) return null;
        
        const navigateUrl = activeJob.location ? `https://www.google.com/maps/dir/?api=1&destination=${activeJob.location.latitude},${activeJob.location.longitude}` : '#';

        return (
            <Card className="shadow-lg animate-fade-in w-full">
                <CardHeader>
                    <CardTitle className="capitalize">Job Status: {activeJob.status.replace('_', ' ')}</CardTitle>
                    <CardDescription>For: {activeJob.userName}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {activeJob.status !== 'in_progress' && (
                        <div className="h-48 w-full rounded-md overflow-hidden border">
                           <LiveMap riderLocation={{ lat: activeJob.location.latitude, lon: activeJob.location.longitude }}/>
                        </div>
                    )}
                    {activeJob.status === 'accepted' && (
                        <Button asChild size="lg" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                            <a href={navigateUrl} target="_blank" rel="noopener noreferrer"><Navigation className="mr-2 h-5 w-5"/>Navigate to Customer</a>
                        </Button>
                    )}
                    {activeJob.status === 'arrived' && (
                        <div className="space-y-2">
                           <Label htmlFor="otp">Enter Customer's OTP</Label>
                           <div className="flex gap-2">
                              <Input id="otp" value={enteredOtp} onChange={(e) => setEnteredOtp(e.target.value)} placeholder="4-Digit OTP" maxLength={4}/>
                              <Button onClick={handleVerifyOtp}><CheckCircle className="w-4 h-4 mr-2"/>Verify & Start</Button>
                           </div>
                        </div>
                    )}
                    {activeJob.status === 'in_progress' && (
                        <div>
                            <Label>Create Digital Job Card</Label>
                            <div className="mt-2 space-y-2 max-h-40 overflow-y-auto pr-2 border rounded-md p-2">
                                {billItems.map((item, index) => (
                                    <div key={index} className="flex justify-between items-center text-sm p-1 bg-muted rounded">
                                        <span>{item.description}</span>
                                        <span>₹{item.amount}</span>
                                    </div>
                                ))}
                                {billItems.length === 0 && <p className="text-xs text-center text-muted-foreground">Add items to the bill.</p>}
                            </div>
                             <div className="flex justify-end font-bold mt-2">Total: ₹{totalAmount}</div>
                             <div className="flex gap-2 mt-4">
                                <Input placeholder="Item description" value={newItemDesc} onChange={e => setNewItemDesc(e.target.value)} />
                                <Input type="number" placeholder="Amount" value={newItemAmount} onChange={e => setNewItemAmount(e.target.value)} className="w-28" />
                                <Button onClick={() => { setBillItems([...billItems, { description: newItemDesc, amount: Number(newItemAmount) }]); setNewItemDesc(''); setNewItemAmount(''); }}>Add</Button>
                             </div>
                        </div>
                    )}
                    {activeJob.status === 'bill_sent' && (
                         <div className="text-center py-4">
                            <Clock className="w-10 h-10 mx-auto text-muted-foreground animate-pulse"/>
                            <p className="font-semibold mt-2">Waiting for customer to approve the bill.</p>
                         </div>
                    )}
                </CardContent>
                <CardFooter>
                    {activeJob.status === 'accepted' && (
                        <Button className="w-full" size="lg" onClick={() => updateDoc(db, 'garageRequests', activeJob.id, { status: 'arrived' })}>Arrived at Location</Button>
                    )}
                    {activeJob.status === 'in_progress' && (
                        <Button className="w-full bg-green-600 hover:bg-green-700" size="lg" onClick={handleSendBill}>Send Bill to Customer</Button>
                    )}
                </CardFooter>
            </Card>
        );
    }

    return (
      <div className="space-y-6">
          <audio ref={notificationSoundRef} src="/notification.mp3" preload="auto" />
          {activeJob ? renderActiveJob() : (
              <>
                  <Card className="shadow-lg">
                      <CardHeader>
                          <div className="flex justify-between items-center">
                              <CardTitle className="text-2xl">ResQ Dashboard</CardTitle>
                              <div className="flex items-center space-x-2">
                                  <Switch id="online-status" checked={isOnline} onCheckedChange={handleAvailabilityChange} />
                                  <Label htmlFor="online-status" className={cn("font-semibold", isOnline ? "text-green-600" : "text-muted-foreground")}>{isOnline ? "ONLINE" : "OFFLINE"}</Label>
                              </div>
                          </div>
                      </CardHeader>
                      {isOnline ? (
                          <CardContent className="text-center py-12">
                              <SearchingIndicator partnerType="resq" />
                              <h3 className="text-3xl font-bold mt-4">Waiting for Jobs...</h3>
                              <p className="text-muted-foreground text-sm">You are online and ready to accept service requests.</p>
                          </CardContent>
                      ) : (
                           <CardContent className="text-center py-12">
                              <CardTitle>You are Offline</CardTitle>
                              <CardDescription>Go online to receive service requests.</CardDescription>
                          </CardContent>
                      )}
                  </Card>
                  <div className="grid gap-4 grid-cols-2">
                     <StatCard title="Today's Jobs" value={"0"} icon={History} isLoading={isLoading} />
                     <StatCard title="Today's Earnings" value={"₹0"} icon={IndianRupee} isLoading={isLoading} />
                  </div>
              </>
          )}

        <AlertDialog open={!!jobRequest}>
          <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>New Service Request!</AlertDialogTitle>
            </AlertDialogHeader>
            {jobRequest && (
              <>
                <div className="flex items-center gap-4">
                    <Avatar className="w-12 h-12"><AvatarFallback>{jobRequest.userName?.[0] || 'U'}</AvatarFallback></Avatar>
                    <div><p className="font-bold">{jobRequest.userName}</p><p className="text-sm text-muted-foreground">{jobRequest.issue}</p></div>
                </div>
                 <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2"><MapPin className="w-4 h-4 mt-1 text-green-500 flex-shrink-0" /><p>{jobRequest.locationAddress}</p></div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center mt-3">
                  <div className="p-2 bg-muted rounded-md"><p className="text-xs text-muted-foreground">To Customer</p><p className="font-bold text-lg">~{parseFloat(jobRequest.distance).toFixed(1)} km</p></div>
                  <div className="p-2 bg-muted rounded-md"><p className="text-xs text-muted-foreground">Est. Arrival</p><p className="font-bold text-lg">~{Math.ceil(parseFloat(jobRequest.eta))} min</p></div>
                </div>
              </>
            )}
            <AlertDialogFooter className="grid grid-cols-2 gap-2">
              <Button variant="destructive" onClick={handleDeclineJob}>Decline</Button>
              <Button onClick={handleAcceptJob}>Accept Job</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }
