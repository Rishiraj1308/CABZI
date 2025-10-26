'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import { useFirebase } from '@/firebase/client-provider'
import { getDoc, doc, onSnapshot, query, collection, where, updateDoc, GeoPoint, serverTimestamp, addDoc } from 'firebase/firestore'
import type { GarageRequest, ClientSession } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import RideStatus from '@/components/ride-status'
import { Wrench, Zap, Fuel, Car, MoreHorizontal, MessageSquare, Phone, Navigation } from 'lucide-react'
import { runTransaction } from 'firebase/firestore'
import SearchingIndicator from '@/components/ui/searching-indicator'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'


const LiveMap = dynamic(() => import('@/components/live-map'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-muted flex items-center justify-center"><p>Loading Map...</p></div>,
});

const commonIssues = [
    { id: 'flat_tyre', label: 'Flat Tyre', icon: () => <div className="text-xl">🛞</div> },
    { id: 'battery_jumpstart', label: 'Jump Start', icon: () => <Zap className="w-6 h-6" /> },
    { id: 'towing_required', label: 'Towing', icon: () => <Car className="w-6 h-6" /> },
    { id: 'fuel_delivery', label: 'Fuel Refill', icon: () => <Fuel className="w-6 h-6" /> },
    { id: 'minor_repair', label: 'Minor Repair', icon: () => <div className="text-xl">🔩</div> },
    { id: 'other', label: 'Other', icon: () => <MoreHorizontal className="w-6 h-6" /> },
]

export default function ResQPage() {
  const [session, setSession] = useState<ClientSession | null>(null);
  const [activeGarageRequest, setActiveGarageRequest] = useState<GarageRequest | null>(null);
  const [currentUserLocation, setCurrentUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [selectedIssue, setSelectedIssue] = useState('');

  const liveMapRef = useRef<any>(null);
  const { user, db } = useFirebase();
  const { toast } = useToast();

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
  
  const handleLocationFound = useCallback((address: string, coords: { lat: number; lon: number }) => {
    setCurrentUserLocation(coords);
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

    const driverRef = doc(db, 'users', user.uid); // Assuming driver is a user
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

  const renderInitialView = () => (
     <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500 flex items-center justify-center text-white">
              <Wrench className="w-5 h-5"/>
            </div>
            <div>
              <div className="text-sm text-slate-600 font-semibold">Roadside Assistance</div>
              <div className="text-xs text-slate-400">Quick help for tyre, battery, towing & more</div>
            </div>
          </div>
          {activeGarageRequest && <div className="text-xs text-slate-500">Help is on the way</div>}
        </div>

        <div className="px-5 pb-5">
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {commonIssues.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setSelectedIssue(item.label)}
                    className={cn(
                        'flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-shadow duration-150 focus:outline-none',
                        selectedIssue === item.label ? 'bg-amber-50 border-amber-300 shadow-md ring-2 ring-amber-200' : 'bg-white border-slate-100 hover:shadow-sm'
                    )}>
                    <div className="text-2xl text-amber-600"><item.icon/></div>
                    <div className="text-xs text-slate-700 font-medium">{item.label}</div>
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
                <div>
                  <div className="text-xs text-slate-500">Location</div>
                  <div className="text-sm font-medium text-slate-700">Current GPS location</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">ETA</div>
                  <div className="text-sm font-medium text-slate-700">~ 10-15 mins</div>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  size="lg"
                  disabled={!selectedIssue}
                  onClick={handleRequestMechanic}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold">
                  Request Help Now
                </Button>
              </div>
            </div>
        </div>
      </div>
  )

  const renderActiveRequest = () => {
    if(!activeGarageRequest) return null;

    if (activeGarageRequest.status === 'pending') {
        return (
            <Card>
                 <CardContent className="py-10 text-center">
                    <SearchingIndicator partnerType="resq" />
                    <h3 className="text-2xl font-bold mt-4">Finding a Mechanic...</h3>
                    <p className="text-muted-foreground">Contacting nearby ResQ partners.</p>
                </CardContent>
            </Card>
        )
    }
    
    // Once accepted, the RideStatus component takes over
    return (
        <RideStatus 
            ride={activeGarageRequest} 
            isGarageRequest 
            onCancel={resetFlow} 
            onDone={resetFlow} 
            onPayment={handleGaragePayment}
        />
    )
  }

  return (
    <div className="h-full w-full relative flex flex-col">
      <div className="flex-1 relative">
        <LiveMap 
            ref={liveMapRef} 
            onLocationFound={handleLocationFound}
            riderLocation={currentUserLocation}
            driverLocation={activeGarageRequest?.mechanicLocation ? { lat: activeGarageRequest.mechanicLocation.latitude, lon: activeGarageRequest.mechanicLocation.longitude } : undefined}
         />
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-xl w-full"
        >
          {activeGarageRequest ? renderActiveRequest() : renderInitialView()}
        </motion.div>
      </div>
    </div>
  );
}
