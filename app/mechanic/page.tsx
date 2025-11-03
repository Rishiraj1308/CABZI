
'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Star, History, IndianRupee, Power, KeyRound, Clock, MapPin, Route, Navigation, CheckCircle, Sparkles, Eye, Wrench, Phone } from 'lucide-react'
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
  limit,
  addDoc
} from 'firebase/firestore'
import { useFirebase } from '@/firebase/client-provider'
import dynamic from 'next/dynamic'
import type { JobRequest } from '@/lib/types'
import { Skeleton } from '@/components/ui/skeleton'
import { usePartnerData } from './layout'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import SearchingIndicator from '@/components/ui/searching-indicator'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { motion, AnimatePresence } from 'framer-motion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { onMessage } from 'firebase/messaging'
import { format } from 'date-fns'

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

export default function ResQDashboard() {
  const [jobRequest, setJobRequest] = useState<JobRequest | null>(null);
  const [acceptedJob, setAcceptedJob] = useState<JobRequest | null>(null);
  const [requestTimeout, setRequestTimeout] = useState(15)
  const requestTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [isEarningsVisible, setIsEarningsVisible] = useState(false)
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false)
  const [pin, setPin] = useState('')
  const notificationSoundRef = useRef<HTMLAudioElement | null>(null)
  const { partnerData, isLoading: isPartnerDataLoading } = usePartnerData()
  const { db, messaging } = useFirebase()
  const { toast } = useToast()
  
  const [recentJobs, setRecentJobs] = useState<JobRequest[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  
  const [enteredOtp, setEnteredOtp] = useState('');
  
  // State for the clock
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    notificationSoundRef.current = new Audio('/sounds/notification.mp3');
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  
  const isOnline = partnerData?.isOnline ?? false;
  
  const handleDeclineJob = useCallback(async (isTimeout = false) => {
    if (!jobRequest || !partnerData?.id || !db) return
    if (requestTimerRef.current) clearInterval(requestTimerRef.current)
    
    const jobRef = doc(db, 'garageRequests', jobRequest.id);
    await updateDoc(jobRef, {
        rejectedBy: arrayUnion(partnerData.id)
    });

    setJobRequest(null);
    if (!isTimeout) toast({ title: "Job Declined" })
    else toast({ variant: 'destructive', title: "Request Timed Out" })
  }, [jobRequest, partnerData?.id, db, toast]);
  
  const resetAfterJob = useCallback(() => {
    setAcceptedJob(null);
    localStorage.removeItem('activeJobId');
    if (partnerData?.id && db) {
        updateDoc(doc(db, 'mechanics', partnerData.id), { status: 'online' });
    }
  }, [partnerData, db]);

  const handleAvailabilityChange = async (checked: boolean) => {
    if (!partnerData || !db) return;
    const mechanicRef = doc(db, 'mechanics', partnerData.id);
    try {
      await updateDoc(mechanicRef, { isOnline: checked, status: checked ? 'online' : 'offline' });
      toast({
        title: checked ? "You are now ONLINE" : "You are OFFLINE",
        description: checked ? "You will start receiving job requests." : "You won't receive new requests.",
      });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update your status.' });
    }
  };
  
  // Listen for FCM messages
  useEffect(() => {
    if (messaging && isOnline && !jobRequest && !acceptedJob) {
        const unsubscribe = onMessage(messaging, (payload) => {
            console.log('Foreground message received in ResQ Dashboard. ', payload);
            const { type, requestId, ...jobData } = payload.data || {};
            
            if (type === 'new_garage_request' && requestId) {
                const newJob: JobRequest = {
                    id: requestId,
                    userName: jobData.userName,
                    userPhone: jobData.userPhone,
                    issue: jobData.issue,
                    location: JSON.parse(jobData.location || '{}'),
                    status: jobData.status,
                    otp: jobData.otp,
                    createdAt: new Timestamp(parseInt(jobData.createdAt) / 1000, 0),
                    distance: parseFloat(jobData.distance),
                    eta: parseFloat(jobData.eta),
                } as JobRequest
                
                setJobRequest(newJob);
                notificationSoundRef.current?.play().catch(e => console.error("Audio play failed:", e));
            }
        });
        return () => unsubscribe();
    }
  }, [messaging, isOnline, jobRequest, acceptedJob]);

   // Countdown timer for job request
  useEffect(() => {
    if (jobRequest) {
        setRequestTimeout(15);
        requestTimerRef.current = setInterval(() => {
            setRequestTimeout(prev => {
                if (prev <= 1) {
                    if(requestTimerRef.current) clearInterval(requestTimerRef.current);
                    handleDeclineJob(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }
    return () => {
        if (requestTimerRef.current) clearInterval(requestTimerRef.current);
    };
  }, [jobRequest, handleDeclineJob]);

  const handleAcceptJob = async () => {
    if (!jobRequest || !partnerData || !db) return;
    if (requestTimerRef.current) clearInterval(requestTimerRef.current);
  
    const jobRef = doc(db, 'garageRequests', jobRequest.id);
    const partnerRef = doc(db, 'mechanics', partnerData.id);
  
    try {
      await runTransaction(db, async (transaction) => {
        const jobDoc = await transaction.get(jobRef);
        if (!jobDoc.exists()) throw new Error("Job not found.");
        
        if (jobDoc.data().status !== 'pending') {
          throw new Error("This job has already been accepted.");
        }
  
        transaction.update(jobRef, {
          status: 'accepted',
          mechanicId: partnerData.id,
          mechanicName: partnerData.name,
          mechanicPhone: partnerData.phone,
        });
        transaction.update(partnerRef, { status: 'on_job' });
      });
  
      setAcceptedJob({ ...jobRequest, status: 'accepted' });
      setJobRequest(null);
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

  const renderActiveJob = () => { return null } // Placeholder

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
                            <StatCard title="Today's Earnings" value={isEarningsVisible ? `₹${(partnerData?.todaysEarnings || 0).toLocaleString()}` : '₹ ****'} icon={IndianRupee} isLoading={isPartnerDataLoading} onValueClick={() => !isEarningsVisible && setIsPinDialogOpen(true)} />
                            <StatCard title="Today's Jobs" value={partnerData?.jobsToday?.toString() || '0'} icon={History} isLoading={isPartnerDataLoading} />
                            <StatCard title="Acceptance Rate" value={`${partnerData?.acceptanceRate || '95'}%`} icon={Power} isLoading={isPartnerDataLoading} />
                            <StatCard title="Rating" value={partnerData?.rating?.toString() || '4.8'} icon={Star} isLoading={isPartnerDataLoading} />
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
                   <p className="text-sm text-muted-foreground capitalize flex items-center gap-1"><Car className="w-4 h-4"/> Driver</p>
                 </div>
               </div>
                <div className="space-y-2 text-sm">
                   <div className="flex items-start gap-2">
                       <MapPin className="w-4 h-4 mt-1 text-green-500 flex-shrink-0" />
                       <p><span className="font-semibold">LOCATION:</span> {jobRequest.location.latitude.toFixed(4)}, {jobRequest.location.longitude.toFixed(4)}</p>
                   </div>
                   <div className="flex items-start gap-2">
                       <Wrench className="w-4 h-4 mt-1 text-red-500 flex-shrink-0" />
                       <p><span className="font-semibold">ISSUE:</span> {jobRequest.issue}</p>
                   </div>
               </div>
               <div className="grid grid-cols-2 gap-2 text-center mt-3">
                 <div className="p-2 bg-muted rounded-md">
                     <p className="text-xs text-muted-foreground">To User</p>
                     <p className="font-bold text-lg">
                       {jobRequest.distance ? `~${jobRequest.distance.toFixed(1)} km` : '~ km'}
                     </p>
                 </div>
                 <div className="p-2 bg-muted rounded-md">
                     <p className="text-xs text-muted-foreground">Est. Arrival</p>
                     <p className="font-bold text-lg">
                       {jobRequest.eta ? `~${Math.ceil(jobRequest.eta)} min` : '~ min'}
                     </p>
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
            <Button type="button" className="w-full" onClick={() => {}}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
