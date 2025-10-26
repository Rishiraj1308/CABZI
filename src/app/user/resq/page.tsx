
'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import { useFirebase } from '@/firebase/client-provider'
import { getDoc, doc, onSnapshot, query, collection, where, updateDoc } from 'firebase/firestore'
import type { RideData, AmbulanceCase, GarageRequest, ClientSession } from '@/lib/types'
import { useToast } from '@/hooks/use-toast'

import { Card } from '@/components/ui/card'
import EmergencyButtons from '@/components/EmergencyButtons'
import RideStatus from '@/components/ride-status'
import { runTransaction } from 'firebase/firestore'

const LiveMap = dynamic(() => import('@/components/live-map'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-muted flex items-center justify-center"><p>Loading Map...</p></div>,
});

export default function ResQPage() {
  const [session, setSession] = useState<ClientSession | null>(null);
  const [activeGarageRequest, setActiveGarageRequest] = useState<GarageRequest | null>(null);
  const [isRequestingSos, setIsRequestingSos] = useState(false);
  const [currentUserLocation, setCurrentUserLocation] = useState<{ lat: number; lon: number } | null>(null);

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
        setActiveGarageRequest(null);
        localStorage.removeItem('activeGarageRequestId');
      }
    });

    return () => unsubscribe();
  }, [db, session?.userId, activeGarageRequest?.status, toast]);
  
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
            
            // Mark the job as completed
            transaction.update(garageRequestRef, { status: 'completed', paymentMode });
        });

        toast({
            title: `Payment via ${paymentMode} confirmed`,
            description: `Thank you for using Curocity ResQ.`,
            className: "bg-green-600 text-white border-green-600"
        });

        // The onSnapshot listener will handle UI update
    } catch (error: any) {
        console.error("Garage payment failed:", error);
        toast({
            variant: 'destructive',
            title: 'Payment Failed',
            description: error.message || 'There was an issue processing the payment.'
        });
    }
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

      <div className="absolute bottom-0 left-0 right-0 z-10">
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-lg w-full"
        >
          <Card className="rounded-t-2xl shadow-2xl bg-background/80 backdrop-blur-sm border-t border-border/20">
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
              <EmergencyButtons
                serviceType="resq"
                liveMapRef={liveMapRef}
                pickupCoords={currentUserLocation}
                setIsRequestingSos={setIsRequestingSos}
                setActiveAmbulanceCase={() => {}} // Not used for ResQ
                setActiveGarageRequest={setActiveGarageRequest}
                onBack={resetFlow}
                session={session}
              />
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
