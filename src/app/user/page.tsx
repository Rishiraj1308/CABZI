
'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Car, Wrench, Ambulance, Calendar, Wallet } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import dynamic from 'next/dynamic'
import { useFirebase } from '@/firebase/client-provider'
import { collection, addDoc, serverTimestamp, doc, GeoPoint, query, where, getDocs, updateDoc, getDoc } from 'firebase/firestore'
import { MotionDiv, AnimatePresence } from '@/components/ui/motion-div'
import EmergencyButtons from '@/components/EmergencyButtons'
import LocationSelector from '@/components/location-selector'
import RideStatus from '@/components/ride-status'
import type { RideData, AmbulanceCase, GarageRequest } from '@/lib/types'
import { useRouter } from 'next/navigation'

const LiveMap = dynamic(() => import('@/components/live-map'), { 
    ssr: false,
    loading: () => <div className="w-full h-full bg-muted flex items-center justify-center"><p>Loading Map...</p></div>
});

interface LocationWithCoords {
    address: string;
    coords: { lat: number; lon: number; } | null;
}

type ServiceView = 'selection' | 'path' | 'cure' | 'resq';

export default function UserPage() {
    const [view, setView] = useState<ServiceView>('selection');
    
    // States for PATH service
    const [pickup, setPickup] = useState<LocationWithCoords>({ address: '', coords: null });
    const [destination, setDestination] = useState<LocationWithCoords>({ address: '', coords: null });
    const [currentUserLocation, setCurrentUserLocation] = useState<{ lat: number, lon: number } | null>(null);
    const [activeRide, setActiveRide] = useState<RideData | null>(null);
    const [routeGeometry, setRouteGeometry] = useState<any>(null);

    // States for CURE and ResQ services
    const [activeAmbulanceCase, setActiveAmbulanceCase] = useState<AmbulanceCase | null>(null);
    const [activeGarageRequest, setActiveGarageRequest] = useState<GarageRequest | null>(null);
    const [isRequestingSos, setIsRequestingSos] = useState(false);

    const liveMapRef = useRef<any>(null);
    const { user: session, db } = useFirebase();
    const { toast } = useToast()
    const router = useRouter();

    const resetFlow = useCallback(() => {
        setView('selection');
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


    useEffect(() => {
        const checkActiveServices = async () => {
            if (!db || !session) return;

            // Check for active ride
            const rideId = localStorage.getItem('activeRideId');
            if (rideId) {
                const rideRef = doc(db, 'rides', rideId);
                const docSnap = await getDoc(rideRef);
                if (docSnap.exists() && !['completed', 'cancelled_by_driver', 'cancelled_by_rider'].includes(docSnap.data().status)) {
                    setActiveRide({ id: docSnap.id, ...docSnap.data() } as RideData);
                    setView('path'); // Switch view to path if active ride found
                    return; // Prioritize active ride
                } else {
                    localStorage.removeItem('activeRideId');
                }
            }

            // Check for active ambulance case
            const qCure = query(collection(db, "emergencyCases"), where("riderId", "==", session.uid), where("status", "in", ["pending", "accepted", "onTheWay", "arrived", "inTransit"]));
            const caseSnapshot = await getDocs(qCure);
             if (!caseSnapshot.empty) {
                const caseDoc = caseSnapshot.docs[0];
                setActiveAmbulanceCase({ id: caseDoc.id, ...caseDoc.data() } as AmbulanceCase);
                setView('cure');
                return;
             }
        };
        checkActiveServices();
    }, [db, session]);

    const handleLocationFound = useCallback((address: string, coords: { lat: number, lon: number }) => {
        setCurrentUserLocation(coords);
        if (!pickup.address) { // Only set pickup if it's not already set by the user
           setPickup({ address, coords });
        }
    }, [pickup.address]);

    
    const renderSelectionScreen = () => (
        <MotionDiv 
            layoutId="service-container" 
            key="selection" 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 md:p-6 space-y-6"
        >
            <div className="text-center">
                <h2 className="text-3xl font-bold tracking-tight">How can we help you?</h2>
                <p className="text-muted-foreground">Choose a service to get started.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MotionDiv layoutId="path-card">
                    <Card className="hover:border-primary hover:shadow-lg transition-all cursor-pointer text-center h-full" onClick={() => setView('path')}>
                        <CardHeader><Car className="w-10 h-10 text-primary mx-auto"/> <CardTitle className="pt-2 text-base">Book a Ride</CardTitle></CardHeader>
                    </Card>
                </MotionDiv>
                 <MotionDiv layoutId="cure-card">
                    <Card className="hover:border-red-500 hover:shadow-lg transition-all cursor-pointer text-center h-full" onClick={() => setView('cure')}>
                        <CardHeader><Ambulance className="w-10 h-10 text-red-500 mx-auto"/> <CardTitle className="pt-2 text-base">Cure SOS</CardTitle></CardHeader>
                    </Card>
                </MotionDiv>
                <MotionDiv layoutId="resq-card">
                    <Card className="hover:border-amber-500 hover:shadow-lg transition-all cursor-pointer text-center h-full" onClick={() => toast({title: "Coming Soon!", description: "ResQ services for users will be available soon."})}>
                        <CardHeader><Wrench className="w-10 h-10 text-amber-500 mx-auto"/> <CardTitle className="pt-2 text-base">ResQ Help</CardTitle></CardHeader>
                    </Card>
                </MotionDiv>
                 <MotionDiv layoutId="appointment-card">
                    <Card className="hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer text-center h-full" onClick={() => router.push('/user/appointments')}>
                        <CardHeader><Calendar className="w-10 h-10 text-blue-500 mx-auto"/> <CardTitle className="pt-2 text-base">Doctor</CardTitle></CardHeader>
                    </Card>
                </MotionDiv>
            </div>
        </MotionDiv>
    );

    const renderPathScreen = () => (
        <MotionDiv layoutId="path-card" key="path">
            {activeRide ? (
                <div className="p-1">
                    <RideStatus ride={activeRide} onCancel={resetFlow} onDone={resetFlow} />
                </div>
            ) : (
                <LocationSelector
                    pickup={pickup}
                    setPickup={setPickup}
                    destination={destination}
                    setDestination={setDestination}
                    onBack={() => { setView('selection'); setRouteGeometry(null); }}
                    setActiveRide={setActiveRide}
                    setRouteGeometry={setRouteGeometry}
                    currentUserLocation={currentUserLocation}
                    liveMapRef={liveMapRef}
                />
            )}
        </MotionDiv>
    );
    
    const renderCureScreen = () => (
        <MotionDiv layoutId="cure-card" key="cure">
            {activeAmbulanceCase ? (
                <div className="p-1">
                    <RideStatus ride={activeAmbulanceCase} onCancel={resetFlow} onDone={resetFlow} />
                </div>
            ) : (
                <EmergencyButtons 
                    serviceType="cure"
                    liveMapRef={liveMapRef}
                    pickupCoords={pickup.coords}
                    setIsRequestingSos={setIsRequestingSos}
                    setActiveAmbulanceCase={setActiveAmbulanceCase}
                    setActiveGarageRequest={() => {}} // dummy function for this view
                    onBack={() => setView('selection')}
                />
            )}
        </MotionDiv>
    );
    
     const renderResqScreen = () => (
         <MotionDiv layoutId="resq-card" key="resq">
            {activeGarageRequest ? (
                <div className="p-1">
                    <RideStatus ride={activeGarageRequest as any} isGarageRequest onCancel={resetFlow} onDone={resetFlow} />
                </div>
            ) : (
                <EmergencyButtons 
                    serviceType="resq"
                    liveMapRef={liveMapRef}
                    pickupCoords={pickup.coords}
                    setIsRequestingSos={setIsRequestingSos}
                    setActiveAmbulanceCase={() => {}} // dummy function
                    setActiveGarageRequest={setActiveGarageRequest}
                    onBack={() => setView('selection')}
                />
            )}
        </MotionDiv>
     );

    return (
        <div className="h-full flex-1 flex flex-col">
            <div className="flex-1 relative">
                <LiveMap ref={liveMapRef} onLocationFound={handleLocationFound} routeGeometry={routeGeometry} />
            </div>
            <div className="z-10">
                 <Card className="rounded-t-2xl shadow-2xl">
                     <AnimatePresence mode="wait">
                        {view === 'selection' && renderSelectionScreen()}
                        {view === 'path' && renderPathScreen()}
                        {view === 'cure' && renderCureScreen()}
                        {view === 'resq' && renderResqScreen()}
                    </AnimatePresence>
                 </Card>
            </div>
        </div>
    );
}
