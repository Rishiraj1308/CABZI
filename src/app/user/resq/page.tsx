
'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import { useFirebase } from '@/firebase/client-provider'
import { getDoc, doc } from 'firebase/firestore'
import type { RideData, AmbulanceCase, GarageRequest, ClientSession } from '@/lib/types'

import { Card } from '@/components/ui/card'
import EmergencyButtons from '@/components/EmergencyButtons'
import RideStatus from '@/components/ride-status'

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

  return (
    <div className="h-full w-full relative flex flex-col">
      <div className="flex-1 relative">
        <LiveMap ref={liveMapRef} onLocationFound={handleLocationFound} />
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
                <RideStatus ride={activeGarageRequest as any} isGarageRequest onCancel={resetFlow} onDone={resetFlow} />
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
