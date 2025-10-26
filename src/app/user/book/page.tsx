'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'
import dynamic from 'next/dynamic'
import { useFirebase } from '@/firebase/client-provider'
import { collection, addDoc, serverTimestamp, doc, GeoPoint, query, where, getDocs, updateDoc, getDoc, onSnapshot } from 'firebase/firestore'
import { motion, AnimatePresence } from 'framer-motion'
import EmergencyButtons from '@/components/EmergencyButtons'
import LocationSelector from '@/components/location-selector'
import RideStatus from '@/components/ride-status'
import type { RideData, AmbulanceCase, GarageRequest, ClientSession } from '@/lib/types'
import { getRoute, searchPlace } from '@/lib/routing'
import { Card } from '@/components/ui/card'
import { useSearchParams } from 'next/navigation'

const LiveMap = dynamic(() => import('@/components/live-map'), { 
    ssr: false,
    loading: () => <div className="w-full h-full bg-muted flex items-center justify-center"><p>Loading Map...</p></div>
});

interface LocationWithCoords {
    address: string;
    coords: { lat: number; lon: number; } | null;
}


export default function BookRidePage() {
    const searchParams = useSearchParams();
    const isSosFlow = searchParams.get('sos') === 'true';

    const [pickup, setPickup] = useState<LocationWithCoords>({ address: '', coords: null });
    const [destination, setDestination] = useState<LocationWithCoords>({ address: '', coords: null });
    const [currentUserLocation, setCurrentUserLocation] = useState<{ lat: number, lon: number } | null>(null);
    const [activeRide, setActiveRide] = useState<RideData | null>(null);
    const [activeAmbulanceCase, setActiveAmbulanceCase] = useState<AmbulanceCase | null>(null);
    const [activeGarageRequest, setActiveGarageRequest] = useState<GarageRequest | null>(null);
    const [isRequestingSos, setIsRequestingSos] = useState(isSosFlow);
    const [routeGeometry, setRouteGeometry] = useState<any>(null);
    const [session, setSession] = useState<ClientSession | null>(null);

    const liveMapRef = useRef<any>(null);
    const { user, db } = useFirebase();
    const { toast } = useToast()

    useEffect(() => {
        if (user && db) {
            const userDocRef = doc(db, 'users', user.uid);
            getDoc(userDocRef).then(docSnap => {
                if (docSnap.exists()) {
                    const userData = docSnap.data();
                    setSession({
                        userId: user.uid,
                        name: userData.name,
                        phone: userData.phone,
                        gender: userData.gender
                    });
                }
            });
        }
    }, [user, db]);

     const resetFlow = useCallback(() => {
        setActiveRide(null);
        setActiveAmbulanceCase(null);
        setActiveGarageRequest(null);
        setRouteGeometry(null);
        setPickup({ address: '', coords: null });
        setDestination({ address: '', coords: null });
        setIsRequestingSos(false);
        localStorage.removeItem('activeRideId');
        localStorage.removeItem('activeGarageRequestId');
    }, []);

    const handleLocationFound = useCallback((address: string, coords: { lat: number, lon: number }) => {
        setCurrentUserLocation(coords);
        if (!pickup.address) { 
           setPickup({ address, coords });
        }
    }, [pickup.address]);

    useEffect(() => {
        if (!db || !session?.userId) return;

        let unsubscribers: (() => void)[] = [];

        const handleActiveDoc = (docSnap: any, type: 'ride' | 'garage' | 'ambulance') => {
            if (docSnap.exists() && !['completed', 'cancelled_by_driver', 'cancelled_by_rider', 'cancelled_by_mechanic', 'cancelled_by_admin', 'cancelled_by_partner'].includes(docSnap.data().status)) {
                const data = { id: docSnap.id, ...docSnap.data() };
                if (type === 'ride') setActiveRide(data as RideData);
                if (type === 'garage') setActiveGarageRequest(data as GarageRequest);
                if (type === 'ambulance') setActiveAmbulanceCase(data as AmbulanceCase);
                return true;
            }
            return false;
        }

        const rideId = localStorage.getItem('activeRideId');
        if (rideId) {
            const rideRef = doc(db, 'rides', rideId);
            const unsub = onSnapshot(rideRef, (docSnap) => {
                if (!handleActiveDoc(docSnap, 'ride')) {
                    resetFlow();
                }
            });
            unsubscribers.push(unsub);
        } else {
             // If there's no active ride, check for other services
            const qCure = query(collection(db, "emergencyCases"), where("riderId", "==", session.userId), where("status", "not-in", ["completed", "cancelled_by_rider", "cancelled_by_partner", "cancelled_by_admin"]));
            const unsubCure = onSnapshot(qCure, (snapshot) => {
                if (!snapshot.empty) handleActiveDoc(snapshot.docs[0], 'ambulance');
            });
            unsubscribers.push(unsubCure);

            const qResq = query(collection(db, "garageRequests"), where("driverId", "==", session.userId), where("status", "not-in", ["completed", "cancelled_by_driver", "cancelled_by_mechanic"]));
            const unsubResq = onSnapshot(qResq, (snapshot) => {
                if (!snapshot.empty) handleActiveDoc(snapshot.docs[0], 'garage');
            });
            unsubscribers.push(unsubResq);
        }

        return () => {
            unsubscribers.forEach(unsub => unsub());
        };

    }, [db, session, resetFlow]);

    return (
        <div className="h-full w-full relative flex flex-col">
            <div className="flex-1 relative">
                 <LiveMap ref={liveMapRef} onLocationFound={handleLocationFound} routeGeometry={routeGeometry} />
            </div>

            <div className="absolute bottom-0 left-0 right-0 z-10">
                <motion.div
                    initial={{ y: "100%", opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: "100%", opacity: 0 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="mx-auto max-w-lg w-full"
                >
                     <Card className="rounded-t-2xl shadow-2xl bg-background/80 backdrop-blur-sm border-t border-border/20">
                         {activeRide ? (
                            <div className="p-1">
                                <RideStatus ride={activeRide} onCancel={resetFlow} onDone={resetFlow} />
                            </div>
                        ) : activeAmbulanceCase ? (
                            <div className="p-1">
                                <RideStatus ride={activeAmbulanceCase} onCancel={resetFlow} onDone={resetFlow} />
                            </div>
                        ) : activeGarageRequest ? (
                             <div className="p-1">
                                <RideStatus ride={activeGarageRequest} isGarageRequest onCancel={resetFlow} onDone={resetFlow} />
                            </div>
                        ) : isRequestingSos ? (
                            <EmergencyButtons
                                serviceType="cure" // Can be made dynamic
                                liveMapRef={liveMapRef}
                                pickupCoords={pickup.coords}
                                setIsRequestingSos={setIsRequestingSos}
                                setActiveAmbulanceCase={setActiveAmbulanceCase}
                                setActiveGarageRequest={setActiveGarageRequest}
                                onBack={resetFlow}
                                session={session}
                            />
                        ) : (
                            <LocationSelector
                                pickup={pickup}
                                setPickup={setPickup}
                                destination={destination}
                                setDestination={setDestination}
                                onBack={resetFlow}
                                setActiveRide={setActiveRide}
                                setRouteGeometry={setRouteGeometry}
                                currentUserLocation={currentUserLocation}
                                liveMapRef={liveMapRef}
                                session={session}
                            />
                        )}
                    </Card>
                </motion.div>
            </div>
        </div>
    );
}
