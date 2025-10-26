'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useFirebase } from '@/firebase/client-provider'
import { getDoc, doc, onSnapshot, query, collection, where, updateDoc, GeoPoint, serverTimestamp, addDoc } from 'firebase/firestore'
import type { GarageRequest, ClientSession } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import RideStatus from '@/components/ride-status'
import { Wrench, Zap, Fuel, Car, MoreHorizontal, LifeBuoy, Phone, Shield, LocateFixed, MessageSquare, Siren } from 'lucide-react'
import { runTransaction } from 'firebase/firestore'
import SearchingIndicator from '@/components/ui/searching-indicator'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog'


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
  
  const fetchLocation = useCallback(() => {
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
    fetchLocation();
  }, [fetchLocation]);


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
    setSelectedIssue('');
  }, []);

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
        driverId: session.userId, // Use user's ID as the requester
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
     <Card className="max-w-xl mx-auto mt-8 bg-white/80 dark:bg-background/80 backdrop-blur-md shadow-xl shadow-orange-100 dark:shadow-orange-500/10 rounded-3xl">
        <CardHeader className="p-8">
            <div className="flex justify-between items-start">
                <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-2 border-4 border-amber-500/20">
                    <Wrench className="w-8 h-8 text-amber-500"/>
                </div>
                <div className="text-right">
                    <div className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        ETA
                    </div>
                    <div className="text-sm font-semibold">~10-15 mins</div>
                </div>
            </div>
          <CardTitle className="text-center text-2xl font-bold text-gray-800 dark:text-gray-200 leading-snug">Roadside Assistance</CardTitle>
          <CardDescription className="text-center text-sm text-gray-500 dark:text-gray-400 mt-1 leading-snug">Vehicle trouble? Get quick help for tyre, battery, towing & more.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-8">
            <div className="grid grid-cols-3 gap-6 mt-6">
                {commonIssues.map((item) => (
                    <motion.div
                      key={item.id}
                      onClick={() => setSelectedIssue(item.label)}
                      className={cn(
                        "flex flex-col items-center justify-center p-6 bg-orange-50 dark:bg-orange-900/20 rounded-2xl hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-all cursor-pointer shadow-sm hover:shadow-md",
                        selectedIssue === item.label && "ring-2 ring-orange-500 bg-orange-100 dark:bg-orange-900/30"
                      )}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                        <item.icon className="text-orange-500 w-8 h-8 mb-3" />
                        <span className="font-medium text-gray-800 dark:text-gray-200 text-center text-sm">{item.label}</span>
                    </motion.div>
                ))}
            </div>
        </CardContent>
        <CardFooter className="p-8">
            <Button
                size="lg"
                disabled={!selectedIssue}
                onClick={handleRequestMechanic}
                className={cn(
                    "w-full font-semibold rounded-full h-12 text-lg bg-gradient-to-r from-orange-500 to-yellow-400 text-white transition-all duration-300",
                    "hover:shadow-lg hover:shadow-yellow-500/50",
                    "disabled:from-gray-400 disabled:to-gray-300 disabled:shadow-none disabled:cursor-not-allowed",
                    selectedIssue && "btn-glow"
                )}>
                Request Assistance
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
    <div className="h-full w-full relative flex flex-col p-4 md:p-6 items-center justify-center">
        <div className="w-full">
          {activeGarageRequest ? renderActiveRequest() : renderInitialView()}
        </div>
        <div className="fixed bottom-6 right-6 z-20 flex flex-col gap-3">
             <Dialog>
                <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-14 w-14 rounded-full shadow-2xl bg-background/80 backdrop-blur-md">
                        <MessageSquare className="w-6 h-6"/>
                        <span className="sr-only">Help</span>
                    </Button>
                </DialogTrigger>
                 <DialogContent>
                    <DialogHeader><DialogTitle>Live Support</DialogTitle><DialogDescription>This feature is coming soon.</DialogDescription></DialogHeader>
                </DialogContent>
            </Dialog>
            <Dialog>
                <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-14 w-14 rounded-full shadow-2xl bg-background/80 backdrop-blur-md">
                        <Shield className="w-6 h-6"/>
                        <span className="sr-only">Safety Toolkit</span>
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader><DialogTitle>Safety Toolkit</DialogTitle></DialogHeader>
                    <div className="py-4 space-y-2">
                        <Button variant="outline" className="w-full justify-start gap-2" onClick={() => toast({title: "Coming Soon!"})}><MessageSquare className="w-4 h-4"/> Share Live Location</Button>
                        <Button variant="outline" className="w-full justify-start gap-2"><a href="tel:1800-XXX-XXXX"><Phone className="w-4 h-4"/> Contact Support</a></Button>
                        <Button variant="destructive" className="w-full justify-start gap-2"><a href="tel:112"><Siren className="w-4 h-4"/> Emergency SOS</a></Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    </div>
  );
}
