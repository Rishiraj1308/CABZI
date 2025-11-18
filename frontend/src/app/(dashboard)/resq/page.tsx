
'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useFirebase } from '@/lib/firebase/client-provider'
import { getDoc, doc, onSnapshot, query, collection, where, updateDoc, GeoPoint, serverTimestamp, addDoc, runTransaction } from 'firebase/firestore'
import type { GarageRequest, ClientSession } from '@/lib/types'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Wrench, Zap, Fuel, Car, MoreHorizontal, ArrowLeft, MapPin, History, AlertTriangle, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useLanguage } from '@/hooks/use-language'
import dynamic from 'next/dynamic'

const LiveMap = dynamic(() => import('@/features/user/components/ride/LiveMap'), {
    ssr: false,
    loading: () => <div className="h-full w-full bg-muted animate-pulse" />
});

const commonIssues = [
    { id: 'flat_tyre', label: 'Flat Tyre / Puncture', icon: Car },
    { id: 'battery_jumpstart', label: 'Battery Jump-Start', icon: Zap },
    { id: 'engine_trouble', label: 'Minor Engine Trouble', icon: Wrench },
    { id: 'fuel_delivery', label: 'Emergency Fuel Delivery', icon: Fuel },
    { id: 'towing_required', label: 'Towing Required', icon: Car },
    { id: 'other', label: 'Other Issue', icon: AlertTriangle },
]

const recentServices = [
    { issue: 'Flat Tyre', location: 'Cyber Hub, Gurgaon' },
    { issue: 'Battery Jump-Start', location: 'MG Road, New Delhi' },
]


export default function ResQPage() {
  const [session, setSession] = useState<ClientSession | null>(null);
  const [activeGarageRequest, setActiveGarageRequest] = useState<GarageRequest | null>(null);
  const [currentUserLocation, setCurrentUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locationAddress, setLocationAddress] = useState('Locating...');
  const [selectedIssue, setSelectedIssue] = useState('');
  const [locationError, setLocationError] = useState(false);

  const { user, db } = useFirebase();
  const router = useRouter();

  const getAddressFromCoords = useCallback(async (lat: number, lon: number) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
      const data = await response.json();
      return data.display_name || 'Unknown Location';
    } catch (error) {
      console.error("Error fetching address:", error);
      return 'Could not fetch address';
    }
  }, []);
  
  const fetchLocation = useCallback(() => {
     setLocationError(false);
     setLocationAddress('Locating...');
     if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                setCurrentUserLocation({ lat: latitude, lon: longitude });
                const address = await getAddressFromCoords(latitude, longitude);
                setLocationAddress(address);
            },
            () => {
                setLocationAddress('Location access denied. Please enable it in browser settings.');
                setLocationError(true);
                toast.error('Location Access Denied');
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    } else {
        setLocationAddress('Geolocation is not supported by this browser.');
        setLocationError(true);
    }
  }, [getAddressFromCoords]);


  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);


  useEffect(() => {
    if (user && db) {
      const sessionData = localStorage.getItem('curocity-session');
      if (sessionData) {
          setSession(JSON.parse(sessionData));
      }
    }
  }, [user, db]);

  const resetFlow = useCallback(() => {
    setActiveGarageRequest(null);
    localStorage.removeItem('activeGarageRequestId');
    setSelectedIssue('');
  }, []);

  useEffect(() => {
    if (!db || !session?.userId) return;

    const q = query(
      collection(db, "garageRequests"),
      where("userId", "==", session.userId),
      where("status", "not-in", ["completed", "cancelled_by_driver", "cancelled_by_mechanic", "cancelled_by_user"])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const requestDoc = snapshot.docs[0];
        const requestData = { id: requestDoc.id, ...requestDoc.data() };
        
        setActiveGarageRequest(prev => {
            if (prev?.status !== 'accepted' && requestData.status === 'accepted') {
                toast.success("ResQ Partner Assigned!", {description: `${(requestData as GarageRequest).mechanicName} is on the way.`});
            }
            if (prev?.status !== 'bill_sent' && requestData.status === 'bill_sent') {
                toast.info("Job Card Ready for Approval", {
                    description: `Please review and approve the job card from ${(requestData as GarageRequest).mechanicName}.`,
                    duration: 9000
                });
            }
            return requestData as GarageRequest;
        });

        localStorage.setItem('activeGarageRequestId', requestDoc.id);
      } else {
        resetFlow();
      }
    });

    return () => unsubscribe();
  }, [db, session?.userId, resetFlow]);
  
  const handleGaragePayment = async (paymentMode: 'cash' | 'wallet') => {
    if (!db || !activeGarageRequest || !user || !activeGarageRequest.mechanicId) return;

    const garageRequestRef = doc(db, 'garageRequests', activeGarageRequest.id);

    try {
        await runTransaction(db, async (transaction) => {
            if (paymentMode === 'wallet') {
                toast.error('Wallet Payment Coming Soon', {description: 'Please use cash payment for now.'});
                throw new Error("Wallet payment not implemented yet.");
            }
            
            transaction.update(garageRequestRef, { status: 'completed', paymentMode });
        });

        toast.success(`Payment via ${paymentMode} confirmed`, {
            description: `Thank you for using Curocity ResQ.`,
        });
        resetFlow();
    } catch (error: any) {
        console.error("Garage payment failed:", error);
        toast.error('Payment Failed',
           { description: error.message || 'There was an issue processing the payment.'});
    }
  }

  const handleRequestMechanic = async () => {
    if (!db || !session || !currentUserLocation || !selectedIssue) {
        toast.error("Error", { description: "Could not get your location or user details." });
        return;
    }
    const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
    const requestData = {
        userId: session.userId,
        userName: session.name,
        userPhone: session.phone,
        issue: selectedIssue,
        location: new GeoPoint(currentUserLocation.lat, currentUserLocation.lon),
        status: 'pending' as const,
        otp: generatedOtp,
        createdAt: serverTimestamp(),
    };
    try {
        const requestDocRef = await addDoc(collection(db, 'garageRequests'), requestData);
        
        setActiveGarageRequest({ id: requestDocRef.id, ...requestData } as unknown as GarageRequest);
        localStorage.setItem('activeGarageRequestId', requestDocRef.id);
    } catch (error) {
        toast.error('Request Failed', { description: 'Could not create service request.' });
    }
  }

  const handleCancelServiceRequest = async () => {
    if (!db || !activeGarageRequest) return;
    const requestRef = doc(db, 'garageRequests', activeGarageRequest.id);
    try {
      await updateDoc(requestRef, { status: 'cancelled_by_user' });
      toast.error('Service Request Cancelled');
      resetFlow();
    } catch (error) {
      toast.error( 'Error', { description: 'Could not cancel the request.' });
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };
  const itemVariants = {
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
  };

  if (activeGarageRequest) {
    return (
        <div className="h-full w-full flex items-center justify-center p-4">
            <RideStatus 
                ride={activeGarageRequest} 
                isGarageRequest 
                onCancel={handleCancelServiceRequest} 
                onDone={resetFlow} 
            />
        </div>
    )
  }

  return (
    <motion.div 
        className="p-4 md:p-6"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
    >
      <Card className="bg-card/70 backdrop-blur-sm">
        <CardHeader className="text-center">
            <div className="mx-auto bg-amber-500/10 p-4 rounded-full w-fit border border-amber-500/20">
              <Wrench className="w-10 h-10 text-amber-500"/>
            </div>
            <CardTitle className="text-3xl font-bold pt-2">Roadside ResQ</CardTitle>
            <CardDescription>Stuck on the road? Tell us what's wrong and we'll find help nearby.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="p-3 flex items-center gap-3 bg-muted rounded-lg">
                <MapPin className={cn("w-5 h-5 flex-shrink-0", locationError ? "text-destructive" : "text-primary")} />
                <p className="font-semibold text-base text-muted-foreground truncate">{locationAddress}</p>
                {locationError && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fetchLocation}><RefreshCw className="w-4 h-4" /></Button>}
            </div>
            
            <div className="space-y-3">
                <h3 className="font-bold text-lg">What's the issue?</h3>
                 <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {commonIssues.map((item, i) => (
                      <motion.div
                        key={item.id}
                        variants={itemVariants}
                        transition={{ delay: i * 0.05 }}
                      >
                        <button
                        onClick={() => setSelectedIssue(item.label)}
                        className={cn(
                            "group flex flex-col items-center justify-center p-4 bg-background rounded-xl border-2 border-transparent hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer h-full w-full",
                            "hover:border-amber-500/50",
                            selectedIssue === item.label && "ring-2 ring-primary border-primary"
                        )}
                        >
                            <item.icon className="text-primary w-8 h-8 mb-2 transition-all" />
                            <span className="font-semibold text-center text-sm">{item.label}</span>
                        </button>
                      </motion.div>
                    ))}
                </div>
            </div>

            <motion.div variants={itemVariants} className="space-y-2 pt-4">
                <h3 className="font-bold text-lg">Recent Requests</h3>
                {recentServices.map((service, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 rounded-lg hover:bg-card cursor-pointer transition-colors">
                        <div className="p-3 bg-card rounded-full border">
                            <History className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                            <p className="font-semibold">{service.issue}</p>
                            <p className="text-sm text-muted-foreground">{service.location}</p>
                        </div>
                    </div>
                ))}
            </motion.div>

        </CardContent>
         <CardFooter className="p-4 border-t">
            <Button
                size="lg"
                disabled={!selectedIssue || !currentUserLocation}
                onClick={handleRequestMechanic}
                className="w-full font-semibold h-12 text-lg bg-accent text-accent-foreground hover:bg-accent/90"
            >
                Find a Mechanic
            </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
