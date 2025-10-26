
'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useFirebase } from '@/firebase/client-provider'
import { getDoc, doc, onSnapshot, query, collection, where, updateDoc, GeoPoint, serverTimestamp, addDoc } from 'firebase/firestore'
import type { GarageRequest, ClientSession } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import RideStatus from '@/components/ride-status'
import { Wrench, Zap, Fuel, Car, MoreHorizontal, LifeBuoy, Phone, Share2, Siren } from 'lucide-react'
import { runTransaction } from 'firebase/firestore'
import SearchingIndicator from '@/components/ui/searching-indicator'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog'


const commonIssues = [
    { id: 'flat_tyre', label: 'Flat Tyre', icon: Wrench },
    { id: 'battery_jumpstart', label: 'Jump Start', icon: Zap },
    { id: 'towing_required', label: 'Towing', icon: Car },
    { id: 'fuel_delivery', label: 'Fuel Refill', icon: Fuel },
    { id: 'minor_repair', label: 'Minor Repair', icon: Wrench },
    { id: 'other', label: 'Other', icon: MoreHorizontal },
]

export default function ResQPage() {
  const [session, setSession] = useState<ClientSession | null>(null);
  const [activeGarageRequest, setActiveGarageRequest] = useState<GarageRequest | null>(null);
  const [currentUserLocation, setCurrentUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locationAddress, setLocationAddress] = useState('Locating...');
  const [selectedIssue, setSelectedIssue] = useState('');

  const { user, db } = useFirebase();
  const { toast } = useToast();

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

  useEffect(() => {
    if (user && db) {
      const userDocRef = doc(db, 'users', user.uid);
      getDoc(userDocRef).then((docSnap) => {
        if (docSnap.exists()) {
          const userData = docSnap.data();
          setSession({
            userId: user.uid,
            name: userData.name,
            phone: userData.phone,
            gender: userData.gender,
          });
        }
      });
    }
  }, [user, db]);

  const resetFlow = useCallback(() => {
    setActiveGarageRequest(null);
    localStorage.removeItem('activeGarageRequestId');
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                setCurrentUserLocation({ lat: latitude, lon: longitude });
                const address = await getAddressFromCoords(latitude, longitude);
                setLocationAddress(address);
            },
            () => {
                setLocationAddress('Location access denied. Please enable it in your browser settings.');
                toast({ variant: 'destructive', title: 'Location Access Denied' });
            }
        );
    }
  }, [getAddressFromCoords, toast]);

  useEffect(() => {
    if (!db || !session?.userId) return;

    const q = query(
      collection(db, "garageRequests"),
      where("driverId", "==", session.userId),
      where("status", "not-in", ["completed", "cancelled_by_driver", "cancelled_by_mechanic"])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const requestDoc = snapshot.docs[0];
        const requestData = { id: requestDoc.id, ...requestDoc.data() };
        
        if (activeGarageRequest?.status !== 'accepted' && requestData.status === 'accepted') {
            toast({ title: "ResQ Partner Assigned!", description: `${requestData.mechanicName} is on the way.` });
        }
        if (activeGarageRequest?.status !== 'bill_sent' && requestData.status === 'bill_sent') {
            toast({
                title: "Job Card Ready for Approval",
                description: `Please review and approve the job card from ${requestData.mechanicName}.`,
                duration: 9000
            });
        }
        
        setActiveGarageRequest(requestData as GarageRequest);
        localStorage.setItem('activeGarageRequestId', requestDoc.id);
      } else {
        resetFlow();
      }
    });

    return () => unsubscribe();
  }, [db, session?.userId, activeGarageRequest?.status, toast, resetFlow]);
  
  const handleGaragePayment = async (paymentMode: 'cash' | 'wallet') => {
    if (!db || !activeGarageRequest || !user || !activeGarageRequest.mechanicId) return;

    const driverRef = doc(db, 'users', user.uid);
    const garageRequestRef = doc(db, 'garageRequests', activeGarageRequest.id);
    const mechanicRef = doc(db, 'mechanics', activeGarageRequest.mechanicId);

    try {
        await runTransaction(db, async (transaction) => {
            if (paymentMode === 'wallet') {
                toast({ variant: 'destructive', title: 'Wallet Payment Coming Soon', description: 'Please use cash payment for now.'});
                throw new Error("Wallet payment not implemented yet.");
            }
            
            transaction.update(garageRequestRef, { status: 'completed', paymentMode });
        });

        toast({
            title: `Payment via ${paymentMode} confirmed`,
            description: `Thank you for using Curocity ResQ.`,
            className: "bg-green-600 text-white border-green-600"
        });
        resetFlow();
    } catch (error: any) {
        console.error("Garage payment failed:", error);
        toast({
            variant: 'destructive',
            title: 'Payment Failed',
            description: error.message || 'There was an issue processing the payment.'
        });
    }
  }

  const handleRequestMechanic = async () => {
    if (!db || !session || !currentUserLocation || !selectedIssue) {
        toast({ variant: "destructive", title: "Error", description: "Could not get your location or user details." });
        return;
    }
    const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
    const requestData = {
        driverId: session.userId,
        driverName: session.name,
        driverPhone: session.phone,
        issue: selectedIssue,
        location: new GeoPoint(currentUserLocation.lat, currentUserLocation.lon),
        status: 'pending' as const,
        otp: generatedOtp,
        createdAt: serverTimestamp(),
    };
    const requestDocRef = await addDoc(collection(db, 'garageRequests'), requestData);
    
    setActiveGarageRequest({ id: requestDocRef.id, ...requestData, status: 'pending' });
    localStorage.setItem('activeGarageRequestId', requestDocRef.id);
    toast({ title: "Request Sent!", description: "We are finding a nearby ResQ partner for you." });
  }

  const handleCancelServiceRequest = async () => {
    if (!db || !activeGarageRequest) return;
    const requestRef = doc(db, 'garageRequests', activeGarageRequest.id);
    try {
      await updateDoc(requestRef, { status: 'cancelled_by_driver' });
      toast({ variant: 'destructive', title: 'Service Request Cancelled' });
      resetFlow();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not cancel the request.' });
    }
  };

  const renderInitialView = () => (
     <Card className="max-w-xl mx-auto mt-8 bg-background/90 backdrop-blur-sm">
        <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-2 border-4 border-amber-500/20">
                <Wrench className="w-8 h-8 text-amber-500"/>
            </div>
          <CardTitle className="text-2xl">Roadside Assistance</CardTitle>
          <CardDescription>Vehicle trouble? Get quick help for tyre, battery, towing & more.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <motion.div 
                className="grid grid-cols-3 gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { staggerChildren: 0.05 } }}
            >
                {commonIssues.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    whileHover={{ y: -4, transition: { type: 'spring', stiffness: 300 } }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <button
                        onClick={() => setSelectedIssue(item.label)}
                        className={cn(
                            'flex flex-col w-full h-24 items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500',
                            selectedIssue === item.label ? 'bg-amber-500/10 border-amber-500/50 shadow-md' : 'bg-muted/50 border-muted hover:border-amber-500/30'
                        )}>
                        <item.icon className="w-8 h-8 text-amber-600"/>
                        <div className="text-xs text-foreground font-medium">{item.label}</div>
                    </button>
                  </motion.div>
                ))}
            </motion.div>
            <div className="flex items-center justify-between p-3 border rounded-lg bg-muted">
              <div>
                  <div className="text-xs text-muted-foreground">Location</div>
                  <div className="text-sm font-semibold truncate">{locationAddress}</div>
              </div>
              <div className="text-right">
                  <div className="text-xs text-muted-foreground">ETA</div>
                  <div className="text-sm font-semibold">~ 10-15 mins</div>
              </div>
          </div>
        </CardContent>
        <CardFooter className="grid grid-cols-1 gap-2">
            <Button
                size="lg"
                disabled={!selectedIssue}
                onClick={handleRequestMechanic}
                className={cn("w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold", selectedIssue && "btn-glow")}>
                Request Help Now
            </Button>
        </CardFooter>
      </Card>
  )

  const renderActiveRequest = () => {
    if(!activeGarageRequest) return null;

    if (activeGarageRequest.status === 'pending') {
        return (
            <Card className="max-w-xl mx-auto mt-8">
                <CardContent className="py-10 text-center">
                    <SearchingIndicator partnerType="resq" />
                    <h3 className="text-2xl font-bold mt-4">Finding a Mechanic...</h3>
                    <p className="text-muted-foreground">Contacting nearby ResQ partners for your issue: <span className="font-semibold">{activeGarageRequest.issue}</span></p>
                </CardContent>
                <CardFooter>
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button variant="link" size="sm" className="w-full text-muted-foreground">Cancel Request</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will cancel your current request for roadside assistance.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Go Back</AlertDialogCancel>
                                <AlertDialogAction onClick={handleCancelServiceRequest} className="bg-destructive hover:bg-destructive/80">Yes, Cancel</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardFooter>
            </Card>
        )
    }
    
    return (
      <div className="max-w-xl mx-auto mt-8">
        <RideStatus 
            ride={activeGarageRequest} 
            isGarageRequest 
            onCancel={handleCancelServiceRequest} 
            onDone={resetFlow} 
            onPayment={handleGaragePayment}
        />
      </div>
    )
  }

  return (
    <div className="h-full w-full relative flex flex-col p-4 md:p-6 bg-muted/40">
        <div className="flex-1">
          {activeGarageRequest ? renderActiveRequest() : renderInitialView()}
        </div>
    </div>
  );
}
