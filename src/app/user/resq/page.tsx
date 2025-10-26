
'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import { useFirebase } from '@/firebase/client-provider'
import { getDoc, doc, onSnapshot, query, collection, where, updateDoc, GeoPoint, serverTimestamp, addDoc } from 'firebase/firestore'
import type { RideData, AmbulanceCase, GarageRequest, ClientSession } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import RideStatus from '@/components/ride-status'
import { Wrench } from 'lucide-react'
import { runTransaction } from 'firebase/firestore'
import SearchingIndicator from '@/components/ui/searching-indicator'

const LiveMap = dynamic(() => import('@/components/live-map'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-muted flex items-center justify-center"><p>Loading Map...</p></div>,
});

const commonIssues = [
    { id: 'flat_tyre', label: 'Flat Tyre / Puncture' },
    { id: 'battery_jumpstart', label: 'Battery Jump-Start' },
    { id: 'engine_trouble', label: 'Minor Engine Trouble' },
    { id: 'towing_required', label: 'Towing Required' },
    { id: 'other', label: 'Other Issue' },
]

export default function ResQPage() {
  const [session, setSession] = useState<ClientSession | null>(null);
  const [activeGarageRequest, setActiveGarageRequest] = useState<GarageRequest | null>(null);
  const [isRequestingSos, setIsRequestingSos] = useState(false);
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
    setIsRequestingSos(false);
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
        setActiveGarageRequest(requestData as GarageRequest);
        localStorage.setItem('activeGarageRequestId', requestDoc.id);

        if (requestData.status === 'accepted' && activeGarageRequest?.status !== 'accepted') {
          toast({ title: "ResQ Partner Assigned!", description: `${requestData.mechanicName} is on the way.` });
        }
        if (requestData.status === 'bill_sent' && activeGarageRequest?.status !== 'bill_sent') {
            toast({
                title: "Job Card Ready for Approval",
                description: `Please review and approve the job card from ${requestData.mechanicName}.`,
                duration: 9000
            });
        }
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
    
    setActiveGarageRequest({ id: requestDocRef.id, ...requestData });
    localStorage.setItem('activeGarageRequestId', requestDocRef.id);
    toast({ title: "Request Sent!", description: "We are finding a nearby ResQ partner for you." });
  }

  const renderInitialView = () => (
      <Card className="rounded-t-2xl shadow-2xl">
          <CardHeader>
              <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-500/10 rounded-full">
                      <Wrench className="w-6 h-6 text-amber-500"/>
                  </div>
                  <div>
                    <CardTitle>Roadside Assistance</CardTitle>
                    <CardDescription>Vehicle trouble? Select your issue to find help.</CardDescription>
                  </div>
              </div>
          </CardHeader>
          <CardContent>
            <RadioGroup onValueChange={setSelectedIssue} value={selectedIssue}>
              <div className="space-y-2">
                {commonIssues.map(issue => (
                  <div key={issue.id} className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
                    <RadioGroupItem value={issue.label} id={issue.id} />
                    <Label htmlFor={issue.id} className="font-normal w-full cursor-pointer">{issue.label}</Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </CardContent>
          <CardFooter>
              <Button size="lg" className="w-full" onClick={handleRequestMechanic} disabled={!selectedIssue}>
                  Request Help Now
              </Button>
          </CardFooter>
      </Card>
  )

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

      <div className="absolute bottom-0 left-0 right-0 z-10">
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-lg w-full"
        >
          {activeGarageRequest ? (
            <div className="p-1">
                <RideStatus 
                    ride={activeGarageRequest as any} 
                    isGarageRequest 
                    onCancel={resetFlow} 
                    onDone={resetFlow} 
                    onPayment={handleGaragePayment}
                />
            </div>
          ) : (
            renderInitialView()
          )}
        </motion.div>
      </div>
    </div>
  );
}
