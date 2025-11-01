'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useFirebase } from '@/firebase/client-provider'
import { getDoc, doc, onSnapshot, query, collection, where, updateDoc, GeoPoint, serverTimestamp, addDoc, runTransaction } from 'firebase/firestore'
import type { GarageRequest, ClientSession } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import RideStatus from '@/components/ride-status'
import { Wrench, Zap, Fuel, Car, MoreHorizontal, ArrowLeft, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import Image from 'next/image'

const commonIssues = [
    { id: 'flat_tyre', label: 'Flat Tyre', icon: Wrench },
    { id: 'battery_jumpstart', label: 'Jump Start', icon: Zap },
    { id: 'towing_required', label: 'Towing', icon: Car },
    { id: 'fuel_delivery', label: 'Fuel Refill', icon: Fuel },
    { id: 'minor_repair', label: 'Minor Repair', icon: Wrench },
    { id: 'other', label: 'Other', icon: MoreHorizontal },
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

  const { user, db } = useFirebase();
  const { toast } = useToast();
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

    const garageRequestRef = doc(db, 'garageRequests', activeGarageRequest.id);

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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const itemVariants = {
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0 }
  };

  if (activeGarageRequest) {
    return (
        <div className="h-full w-full flex items-center justify-center p-4">
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
    <motion.div 
        className="min-h-screen w-full flex flex-col bg-muted/30 overflow-hidden"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
    >
        <header className="bg-gradient-to-br from-amber-500 via-amber-400 to-amber-300 text-white p-4 relative">
            <div className="container mx-auto">
                <motion.div variants={itemVariants}>
                    <Button variant="ghost" size="icon" className="hover:bg-white/10" onClick={() => router.push('/user')}>
                        <ArrowLeft className="w-5 h-5"/>
                    </Button>
                </motion.div>
                <motion.div variants={itemVariants} className="pt-8 pb-20 text-left">
                    <h1 className="text-4xl font-bold">Roadside ResQ assistance</h1>
                    <p className="opacity-90 mt-1 max-w-md">Stuck on the road? We&apos;re here to help.</p>
                </motion.div>
            </div>
        </header>

       <div className="flex-1 container mx-auto p-4 space-y-6 relative z-10 -mt-16">
            <motion.div 
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, type: 'spring' }}
            >
                <Card className="shadow-lg">
                    <CardContent className="p-3 flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500 ring-2 ring-green-500/30 ml-2"/>
                        <p className="font-semibold text-base text-muted-foreground">{locationAddress}</p>
                    </CardContent>
                </Card>
            </motion.div>
            
            <motion.div variants={itemVariants}>
                <h3 className="font-bold text-lg">What&apos;s the issue?</h3>
                 <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                    {commonIssues.map((item) => (
                        <div
                        key={item.id}
                        onClick={() => setSelectedIssue(item.label)}
                        className={cn(
                            "group flex flex-col items-center justify-center p-4 bg-card rounded-xl border-2 border-transparent hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer",
                            selectedIssue === item.label && "ring-2 ring-primary border-primary"
                        )}
                        >
                            <item.icon className="text-primary w-8 h-8 mb-2 transition-all" />
                            <span className="font-semibold text-center text-sm">{item.label}</span>
                        </div>
                    ))}
                </div>
            </motion.div>

            <motion.div variants={itemVariants}>
                 <h3 className="font-bold text-lg pt-4">Recent Requests</h3>
                 <div className="space-y-2 mt-2">
                    {recentServices.map((service, index) => (
                        <div key={index} className="flex items-center gap-4 p-3 rounded-lg hover:bg-card cursor-pointer transition-colors">
                            <div className="p-3 bg-card rounded-full border">
                                <Wrench className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <div className="flex-1">
                                <p className="font-semibold">{service.issue}</p>
                                <p className="text-sm text-muted-foreground">{service.location}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </motion.div>
        </div>
         <div className="p-4 border-t bg-background sticky bottom-0">
            <Button
                size="lg"
                disabled={!selectedIssue}
                onClick={handleRequestMechanic}
                className="w-full font-semibold h-12 text-lg">
                Find a Mechanic
            </Button>
        </div>
    </motion.div>
  );
}
