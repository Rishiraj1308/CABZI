
'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'
import dynamic from 'next/dynamic'
import { useFirebase } from '@/firebase/client-provider'
import { collection, doc, GeoPoint, query, where, getDocs, getDoc } from 'firebase/firestore'
import { motion, AnimatePresence } from 'framer-motion'
import EmergencyButtons from '@/components/EmergencyButtons'
import LocationSelector from '@/components/location-selector'
import RideStatus from '@/components/ride-status'
import type { RideData, AmbulanceCase, GarageRequest, ClientSession } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Car, Wrench, Ambulance, Siren, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const LiveMap = dynamic(() => import('@/components/live-map'), { 
    ssr: false,
    loading: () => <div className="w-full h-full bg-muted flex items-center justify-center"><p>Loading Map...</p></div>
});

interface LocationWithCoords {
    address: string;
    coords: { lat: number; lon: number; } | null;
}

type ServiceView = 'selection' | 'path' | 'cure' | 'resq';

const serviceConfig = {
    path: { icon: Car, label: 'Ride', color: 'text-primary', hoverColor: 'hover:bg-primary/10' },
    cure: { icon: Ambulance, label: 'Cure', color: 'text-red-500', hoverColor: 'hover:bg-red-500/10' },
    resq: { icon: Wrench, label: 'ResQ', color: 'text-amber-500', hoverColor: 'hover:bg-amber-500/10' },
}

export default function UserPage() {
    const [view, setView] = useState<ServiceView>('selection');
    
    const [pickup, setPickup] = useState<LocationWithCoords>({ address: '', coords: null });
    const [destination, setDestination] = useState<LocationWithCoords>({ address: '', coords: null });
    const [currentUserLocation, setCurrentUserLocation] = useState<{ lat: number, lon: number } | null>(null);
    const [activeRide, setActiveRide] = useState<RideData | null>(null);
    const [routeGeometry, setRouteGeometry] = useState<any>(null);

    const [activeAmbulanceCase, setActiveAmbulanceCase] = useState<AmbulanceCase | null>(null);
    const [activeGarageRequest, setActiveGarageRequest] = useState<GarageRequest | null>(null);
    const [isRequestingSos, setIsRequestingSos] = useState(false);

    const liveMapRef = useRef<any>(null);
    const { user, db } = useFirebase();
    const { toast } = useToast()
    const router = useRouter();

    const [session, setSession] = useState<ClientSession | null>(null);

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
            const rideId = localStorage.getItem('activeRideId');
            if (rideId) {
                const rideRef = doc(db, 'rides', rideId);
                const docSnap = await getDoc(rideRef);
                if (docSnap.exists() && !['completed', 'cancelled_by_driver', 'cancelled_by_rider'].includes(docSnap.data().status)) {
                    setActiveRide({ id: docSnap.id, ...docSnap.data() } as RideData);
                    setView('path');
                    return;
                } else {
                    localStorage.removeItem('activeRideId');
                }
            }
            const qCure = query(collection(db, "emergencyCases"), where("riderId", "==", session.userId), where("status", "in", ["pending", "accepted", "onTheWay", "arrived", "inTransit"]));
            const caseSnapshot = await getDocs(qCure);
             if (!caseSnapshot.empty) {
                const caseDoc = caseSnapshot.docs[0];
                setActiveAmbulanceCase({ id: caseDoc.id, ...caseDoc.data() } as AmbulanceCase);
                setView('cure');
             }
        };
        checkActiveServices();
    }, [db, session]);

    const handleLocationFound = useCallback((address: string, coords: { lat: number, lon: number }) => {
        setCurrentUserLocation(coords);
        if (!pickup.address) {
           setPickup({ address, coords });
        }
    }, [pickup.address]);

    const renderContent = () => {
        if (activeRide || activeAmbulanceCase || activeGarageRequest) {
            const activeService = activeRide || activeAmbulanceCase || activeGarageRequest;
            const isGarage = !!activeGarageRequest;
            return (
                <div className="p-1">
                    <RideStatus 
                        ride={activeService} 
                        isGarageRequest={isGarage}
                        onCancel={resetFlow} 
                        onDone={resetFlow} 
                    />
                </div>
            );
        }

        switch(view) {
            case 'path':
                return <LocationSelector
                            pickup={pickup}
                            setPickup={setPickup}
                            destination={destination}
                            setDestination={setDestination}
                            onBack={() => { setView('selection'); setRouteGeometry(null); }}
                            setActiveRide={setActiveRide}
                            setRouteGeometry={setRouteGeometry}
                            currentUserLocation={currentUserLocation}
                            liveMapRef={liveMapRef}
                            session={session}
                        />
            case 'cure':
                return <EmergencyButtons 
                            serviceType="cure"
                            liveMapRef={liveMapRef}
                            pickupCoords={pickup.coords}
                            setIsRequestingSos={setIsRequestingSos}
                            setActiveAmbulanceCase={setActiveAmbulanceCase}
                            setActiveGarageRequest={() => {}} // dummy
                            onBack={() => setView('selection')}
                            session={session}
                        />
             case 'resq':
                return <EmergencyButtons 
                            serviceType="resq"
                            liveMapRef={liveMapRef}
                            pickupCoords={pickup.coords}
                            setIsRequestingSos={setIsRequestingSos}
                            setActiveAmbulanceCase={() => {}} // dummy
                            setActiveGarageRequest={setActiveGarageRequest}
                            onBack={() => setView('selection')}
                            session={session}
                        />
            case 'selection':
            default:
                 return (
                    <motion.div 
                        key="selection" 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="p-2"
                    >
                         <h3 className="text-center font-semibold mb-3">How can we help you?</h3>
                         <div className="grid grid-cols-3 gap-2">
                             {Object.entries(serviceConfig).map(([key, config]) => (
                                 <Card 
                                    key={key} 
                                    className={cn("p-2 text-center transition-all cursor-pointer", config.hoverColor)}
                                    onClick={() => setView(key as ServiceView)}
                                 >
                                    <config.icon className={cn("w-8 h-8 mx-auto", config.color)} />
                                    <p className="text-xs font-semibold mt-1">{config.label}</p>
                                </Card>
                             ))}
                         </div>
                    </motion.div>
                );
        }
    }

    return (
        <div className="h-full flex-1 flex flex-col">
            <div className="absolute top-20 left-4 z-10">
                {view !== 'selection' && !activeRide && !activeAmbulanceCase && (
                    <Button onClick={() => setView('selection')} variant="outline" size="icon" className="shadow-md">
                        <ArrowLeft className="w-5 h-5"/>
                    </Button>
                )}
            </div>

            <div className="absolute top-20 right-4 z-10">
                <Button onClick={() => setView('cure')} variant="destructive" size="lg" className="rounded-full shadow-lg h-14 w-14 p-0 animate-pulse-intense">
                    <Siren className="w-8 h-8" />
                    <span className="sr-only">Emergency SOS</span>
                </Button>
            </div>

            <div className="flex-1 relative">
                <LiveMap ref={liveMapRef} onLocationFound={handleLocationFound} routeGeometry={routeGeometry} />
            </div>
            <div className="z-10 absolute bottom-4 left-4 right-4">
                 <motion.div 
                    layout
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="mx-auto"
                    style={{ maxWidth: view === 'selection' ? '20rem' : '32rem' }}
                 >
                    <Card className="rounded-2xl shadow-2xl bg-background/80 backdrop-blur-sm border-border/20">
                         <AnimatePresence mode="wait">
                           <motion.div
                             key={view}
                             initial={{ opacity: 0, scale: 0.95 }}
                             animate={{ opacity: 1, scale: 1 }}
                             exit={{ opacity: 0, scale: 0.95 }}
                             transition={{ duration: 0.2 }}
                           >
                              {renderContent()}
                           </motion.div>
                        </AnimatePresence>
                     </Card>
                </motion.div>
            </div>
        </div>
    );
}
