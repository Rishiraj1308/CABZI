
'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { HeartHandIcon } from '@/components/icons'
import { Star, Phone, LocateFixed, Shield, LifeBuoy, Share2, MapPin, ArrowRight, ArrowLeft, Wrench, Ambulance, Car } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import dynamic from 'next/dynamic'
import { Input } from '@/components/ui/input'
import { useFirestore } from '@/firebase/client-provider'
import { collection, addDoc, serverTimestamp, doc, GeoPoint, query, where, getDocs, updateDoc, getDoc } from 'firebase/firestore'
import { Skeleton } from '@/components/ui/skeleton'
import { useRider } from './layout'
import { MotionDiv, AnimatePresence } from '@/components/ui/motion-div'
import SearchingIndicator from '@/components/ui/searching-indicator'
import { getRoute, searchPlace } from '@/lib/tomtom'
import EmergencyButtons from '@/components/EmergencyButtons'
import LocationSelector from '@/components/location-selector'


const LiveMap = dynamic(() => import('@/components/live-map'), { 
    ssr: false,
    loading: () => <div className="w-full h-full bg-muted flex items-center justify-center"><p>Loading Map...</p></div>
});
const RideStatus = dynamic(() => import('@/components/ride-status'), { ssr: false });

// Interfaces remain largely the same, but we add more for new services
interface RideTypeInfo {
    name: string;
    description: string;
    icon: React.ElementType;
    eta: string;
    fare: string;
    fareDetails?: { base: number; perKm: number; serviceFee: number; total: number; }
}

interface LocationWithCoords {
    address: string;
    coords: { lat: number; lon: number; } | null;
}

export interface RideData {
    id: string;
    pickup: { address: string; location: { latitude: number; longitude: number; } };
    destination: { address: string; location: { latitude: number; longitude: number; } };
    status: "searching" | "accepted" | "in-progress" | "completed" | "cancelled_by_driver" | "cancelled_by_rider" | "payment_pending";
    otp?: string;
    driverDetails?: { name: string; vehicle: string; rating: number; photoUrl: string; phone: string; };
    driverEta?: number | null;
    fare?: number;
}

export interface AmbulanceCase {
    id: string;
    caseId: string;
    riderId: string;
    riderName: string;
    phone: string;
    location: GeoPoint;
    status: 'pending' | 'accepted' | 'onTheWay' | 'arrived' | 'inTransit' | 'completed' | 'cancelled_by_rider' | 'cancelled_by_partner';
    otp?: string;
    assignedPartner?: { id: string; name: string; phone: string; ambulanceName?: string; photoUrl?: string; } | null;
    partnerEta?: number | null;
    partnerLocation?: GeoPoint | null;
    hospitalEta?: number | null;
    severity?: 'Non-Critical' | 'Serious' | 'Critical';
}

interface GarageRequest {
    id: string;
    status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled_by_driver' | 'cancelled_by_mechanic';
    mechanicName?: string;
    mechanicPhone?: string;
    eta?: number;
    partnerLocation?: GeoPoint | null;
}

const initialRideTypes: RideTypeInfo[] = [
    { name: 'Bike', description: 'Quick and affordable for solo trips', icon: 'bike', eta: '...', fare: '...' },
    { name: 'Auto', description: 'The classic three-wheeler for city travel', icon: 'auto', eta: '...', fare: '...' },
    { name: 'Cab (Lite)', description: 'Affordable sedans for everyday rides', icon: 'cab', eta: '...', fare: '...' },
    { name: 'Cabzi Pink', description: 'A safe ride option exclusively for women, with women partners.', icon: HeartHandIcon, eta: '...', fare: '...' },
]

const fareConfig: {[key: string]: { base: number, perKm: number, serviceFee: number }} = {
    'Bike': { base: 20, perKm: 5, serviceFee: 0 },
    'Auto': { base: 30, perKm: 8, serviceFee: 0 }, 
    'Cab (Lite)': { base: 40, perKm: 10, serviceFee: 20 },
    'Cabzi Pink': { base: 50, perKm: 12, serviceFee: 30 },
}

type ServiceView = 'selection' | 'path' | 'cure' | 'resq';

export default function RiderPage() {
    const [view, setView] = useState<ServiceView>('selection');
    
    // States for PATH service
    const [selectedRide, setSelectedRide] = useState('Cab (Lite)')
    const [rideTypes, setRideTypes] = useState<RideTypeInfo[]>(initialRideTypes)
    const [pickup, setPickup] = useState<LocationWithCoords>({ address: '', coords: null });
    const [destination, setDestination] = useState<LocationWithCoords>({ address: '', coords: null });
    const [currentUserLocation, setCurrentUserLocation] = useState<{ lat: number, lon: number } | null>(null);
    const [isFindingRides, setIsFindingRides] = useState(false);
    const [activeRide, setActiveRide] = useState<RideData | null>(null);
    const [routeGeometry, setRouteGeometry] = useState<any>(null);

    // States for CURE and ResQ services
    const [activeAmbulanceCase, setActiveAmbulanceCase] = useState<AmbulanceCase | null>(null);
    const [activeGarageRequest, setActiveGarageRequest] = useState<GarageRequest | null>(null);
    const [isRequestingSos, setIsRequestingSos] = useState(false);


    const liveMapRef = useRef<any>(null);
    const { session } = useRider();
    const db = useFirestore();
    const { toast } = useToast()

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
                } else {
                    localStorage.removeItem('activeRideId');
                }
            }

            // Check for active ambulance case
            const q = query(collection(db, "emergencyCases"), where("riderId", "==", session.userId), where("status", "in", ["pending", "accepted", "onTheWay", "arrived", "inTransit"]));
            const caseSnapshot = await getDocs(q);
             if (!caseSnapshot.empty) {
                const caseDoc = caseSnapshot.docs[0];
                setActiveAmbulanceCase({ id: caseDoc.id, ...caseDoc.data() } as AmbulanceCase);
                setView('cure'); // Switch view to cure if active case found
             }
        };
        checkActiveServices();
    }, [db, session]);

    const handleGetRideInfo = async () => {
        if (!destination.address) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please enter a destination.' });
            return;
        }
        
        setIsFindingRides(true);
        setRideTypes(initialRideTypes);
        setRouteGeometry(null);
        
        let startCoords = pickup.coords;
        if (!startCoords) {
            if (currentUserLocation) {
                startCoords = currentUserLocation;
                if (liveMapRef.current) {
                    const address = await liveMapRef.current.getAddress(startCoords.lat, startCoords.lon);
                    setPickup({ address: address || 'Current Location', coords: startCoords });
                }
            } else {
                 toast({ variant: 'destructive', title: 'Location Error', description: 'Could not determine your location.' });
                 setIsFindingRides(false);
                 return;
            }
        }

        const endCoords = destination.coords || (await getCoordinates(destination.address));
        if (!startCoords || !endCoords) {
            setIsFindingRides(false);
            return;
        }
        
        setDestination(prev => ({ ...prev, address: destination.address, coords: endCoords }));

        const routeInfo = await getRoute(startCoords, endCoords);
        if (!routeInfo || !routeInfo.routes || routeInfo.routes.length === 0) {
            setIsFindingRides(false);
            return;
        }
        
        const { distance, geometry } = routeInfo;
        setRouteGeometry(geometry);
        
        const updatedRideTypes = initialRideTypes.map(rt => {
            if (rt.name === 'Cabzi Pink' && session?.gender !== 'female') {
                return { ...rt, fare: 'N/A', eta: 'N/A' };
            }
            const config = fareConfig[rt.name];
            if (!config) return { ...rt };
            
            const calculatedFare = config.base + (config.perKm * distance) + config.serviceFee;
            const totalFare = Math.round(calculatedFare / 5) * 5;
            
            return { ...rt, fare: `₹${totalFare}`, fareDetails: { ...config, total: totalFare } };
        });
        
        setRideTypes(updatedRideTypes);
        setIsFindingRides(false);
    }
    
    const getCoordinates = async (address: string): Promise<{ lat: number; lon: number } | null> => {
        if (!address || address.trim() === "") return null;
        try {
            const result = await searchPlace(address);
            if (result && result.results && result.results.length > 0) return result.results[0].position;
            return null;
        } catch (error) { return null; }
    };

    const handleLocationFound = useCallback((address: string, coords: { lat: number, lon: number }) => {
        setPickup({ address, coords });
        setCurrentUserLocation(coords);
    }, []);

    const resetFlow = () => {
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
    };
    
    const handleConfirmRide = async () => {
        if (!pickup.coords || !destination.coords || !session || !db) return;
        
        const selectedRideInfo = rideTypes.find(rt => rt.name === selectedRide);
        if (!selectedRideInfo?.fareDetails) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not get ride fare details.' });
            return;
        }

        const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
        const rideData = {
            riderId: session.phone,
            riderName: session.name,
            riderGender: session.gender,
            pickup: { address: pickup.address, location: new GeoPoint(pickup.coords.lat, pickup.coords.lon) },
            destination: { address: destination.address, location: new GeoPoint(destination.coords.lat, destination.coords.lon) },
            rideType: selectedRide,
            status: 'searching' as const,
            fare: selectedRideInfo.fareDetails.total,
            otp: generatedOtp,
            createdAt: serverTimestamp(),
        };

        try {
            const docRef = await addDoc(collection(db, 'rides'), rideData);
            setActiveRide({ id: docRef.id, ...rideData } as RideData);
            localStorage.setItem('activeRideId', docRef.id);
        } catch (error) {
            console.error("Error creating ride:", error);
            toast({ variant: 'destructive', title: 'Booking Failed' });
        }
    };

    const renderSelectionScreen = () => (
        <MotionDiv initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 md:p-6 space-y-6">
            <div className="text-center">
                <h2 className="text-3xl font-bold tracking-tight">How can we help you?</h2>
                <p className="text-muted-foreground">Choose a service to get started.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="hover:border-primary hover:shadow-lg transition-all cursor-pointer text-center" onClick={() => setView('path')}>
                    <CardHeader><Car className="w-12 h-12 text-primary mx-auto"/> <CardTitle className="pt-2">Book a Ride</CardTitle></CardHeader>
                    <CardContent><p className="text-sm text-muted-foreground">Book a Bike, Auto, or Cab instantly.</p></CardContent>
                </Card>
                 <Card className="hover:border-red-500 hover:shadow-lg transition-all cursor-pointer text-center" onClick={() => setView('cure')}>
                    <CardHeader><Ambulance className="w-12 h-12 text-red-500 mx-auto"/> <CardTitle className="pt-2">Cure Service</CardTitle></CardHeader>
                    <CardContent><p className="text-sm text-muted-foreground">Request an ambulance for emergencies.</p></CardContent>
                </Card>
                 <Card className="hover:border-amber-500 hover:shadow-lg transition-all cursor-pointer text-center" onClick={() => setView('resq')}>
                    <CardHeader><Wrench className="w-12 h-12 text-amber-500 mx-auto"/> <CardTitle className="pt-2">ResQ Service</CardTitle></CardHeader>
                    <CardContent><p className="text-sm text-muted-foreground">Get on-spot help for vehicle trouble.</p></CardContent>
                </Card>
            </div>
        </MotionDiv>
    );

    const renderPathScreen = () => {
         if (activeRide) {
            return (
                <div className="p-1">
                    <RideStatus ride={activeRide} onCancel={resetFlow} onDone={resetFlow} />
                </div>
            )
        }
        return (
            <LocationSelector
                pickup={pickup}
                setPickup={setPickup}
                destination={destination}
                setDestination={setDestination}
                onBack={() => { setView('selection'); setRouteGeometry(null); }}
            />
        );
    }
    
    const renderCureScreen = () => {
         if (activeAmbulanceCase) {
             return (
                 <div className="p-1">
                    <RideStatus ride={activeAmbulanceCase} onCancel={resetFlow} onDone={resetFlow} />
                </div>
            )
        }
        return (
            <div className="p-4">
                 <div className="flex items-center gap-4 mb-4">
                     <Button onClick={() => setView('selection')} variant="outline" size="icon"><ArrowLeft/></Button>
                    <div>
                        <h2 className="text-xl font-bold tracking-tight">Cure Services</h2>
                        <p className="text-muted-foreground text-sm">Emergency ambulance services.</p>
                    </div>
                </div>
                 <EmergencyButtons 
                    liveMapRef={liveMapRef}
                    pickupCoords={pickup.coords}
                    setIsRequestingSos={setIsRequestingSos}
                    setActiveAmbulanceCase={setActiveAmbulanceCase}
                    setActiveGarageRequest={() => {}} // dummy function for this view
                />
            </div>
        );
    }
    
     const renderResqScreen = () => {
         if(activeGarageRequest) {
            return (
                 <div className="p-1">
                    <RideStatus ride={activeGarageRequest as any} isGarageRequest onCancel={resetFlow} onDone={resetFlow} />
                </div>
            );
         }
        return (
            <div className="p-4">
                 <div className="flex items-center gap-4 mb-4">
                     <Button onClick={() => setView('selection')} variant="outline" size="icon"><ArrowLeft/></Button>
                    <div>
                        <h2 className="text-xl font-bold tracking-tight">ResQ Services</h2>
                        <p className="text-muted-foreground text-sm">Get on-spot help for vehicle trouble.</p>
                    </div>
                </div>
                 <EmergencyButtons 
                    liveMapRef={liveMapRef}
                    pickupCoords={pickup.coords}
                    setIsRequestingSos={setIsRequestingSos}
                    setActiveAmbulanceCase={() => {}} // dummy function
                    setActiveGarageRequest={setActiveGarageRequest}
                 />
            </div>
        );
     }

    return (
        <div className="h-full w-full relative">
            <div className="absolute inset-0 z-0">
                <LiveMap ref={liveMapRef} onLocationFound={handleLocationFound} routeGeometry={routeGeometry} />
            </div>
            <div className="absolute bottom-0 left-0 right-0 z-10">
                 <Card className="m-2 rounded-2xl shadow-2xl">
                     <AnimatePresence mode="wait">
                        <MotionDiv
                            key={view}
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -50 }}
                            transition={{ duration: 0.3 }}
                        >
                            {view === 'selection' && renderSelectionScreen()}
                            {view === 'path' && renderPathScreen()}
                            {view === 'cure' && renderCureScreen()}
                            {view === 'resq' && renderResqScreen()}
                        </MotionDiv>
                    </AnimatePresence>
                 </Card>
            </div>
        </div>
    );
}

