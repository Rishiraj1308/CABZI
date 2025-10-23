
'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Car, Wrench, Ambulance, Calendar, ArrowLeft } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import dynamic from 'next/dynamic'
import { useFirebase, useAuth } from '@/firebase/client-provider'
import { collection, addDoc, serverTimestamp, doc, GeoPoint, query, where, getDocs, updateDoc, getDoc } from 'firebase/firestore'
import { motion, AnimatePresence } from 'framer-motion'
import EmergencyButtons from '@/components/EmergencyButtons'
import LocationSelector from '@/components/location-selector'
import RideStatus from '@/components/ride-status'
import type { RideData, AmbulanceCase, GarageRequest, ClientSession } from '@/lib/types'
import { useRouter } from 'next/navigation'
import { getRoute, searchPlace } from '@/lib/routing'

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
            const qCure = query(collection(db, "emergencyCases"), where("riderId", "==", session.userId), where("status", "in", ["pending", "accepted", "onTheWay", "arrived", "inTransit"]));
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

    const serviceCards = [
        { type: 'path', title: 'Book a Ride', icon: Car, color: 'text-primary' },
        { type: 'cure', title: 'Cure SOS', icon: Ambulance, color: 'text-red-500' },
        { type: 'resq', title: 'ResQ Help', icon: Wrench, color: 'text-amber-500', isComingSoon: true },
        { type: 'appointment', title: 'Doctor', icon: Calendar, color: 'text-blue-500' },
    ];
    
    const handleServiceClick = (type: string) => {
        if (type === 'appointment') {
            router.push('/user/appointments');
        } else if (type === 'resq') {
            toast({title: "Coming Soon!", description: "ResQ services for users will be available soon."});
        } else {
            setView(type as ServiceView);
        }
    }

    const renderSelectionScreen = () => (
        <motion.div 
            layout
            key="selection" 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="p-4 md:p-6 space-y-4"
        >
            <div className="text-center">
                <h2 className="text-2xl font-bold tracking-tight">How can we help you?</h2>
                <p className="text-muted-foreground text-sm">Choose a service to get started.</p>
            </div>
            <div className="grid grid-cols-4 gap-3">
                {serviceCards.map(service => (
                    <motion.div layoutId={`${service.type}-card`} key={service.type}>
                         <Card 
                            className="hover:shadow-lg transition-all cursor-pointer text-center h-full flex flex-col items-center justify-center p-2 aspect-square" 
                            onClick={() => handleServiceClick(service.type)}
                         >
                            <service.icon className={`w-8 h-8 ${service.color}`}/>
                            <CardTitle className="pt-2 text-xs font-semibold">{service.title}</CardTitle>
                        </Card>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );

    const renderPathScreen = () => (
        <motion.div layoutId="path-card" key="path" className="h-full flex flex-col">
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
                    session={session}
                />
            )}
        </motion.div>
    );
    
    const renderCureScreen = () => (
        <motion.div layoutId="cure-card" key="cure" className="h-full flex flex-col">
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
                    session={session}
                />
            )}
        </motion.div>
    );
    
     const renderResqScreen = () => (
         <motion.div layoutId="resq-card" key="resq">
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
                    session={session}
                />
            )}
        </motion.div>
     );

    return (
        <div className="h-full w-full relative">
            <div className="absolute inset-0 z-0">
                <LiveMap ref={liveMapRef} onLocationFound={handleLocationFound} routeGeometry={routeGeometry} />
            </div>

            <div className="absolute bottom-0 left-0 right-0 z-10">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={view}
                        initial={{ y: "100%", opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: "100%", opacity: 0 }}
                        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                        className="mx-auto max-w-lg w-full"
                    >
                         <Card className="rounded-t-2xl shadow-2xl bg-background/80 backdrop-blur-sm border-t border-border/20">
                            {view === 'selection' && renderSelectionScreen()}
                            {view === 'path' && renderPathScreen()}
                            {view === 'cure' && renderCureScreen()}
                            {view === 'resq' && renderResqScreen()}
                        </Card>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}

