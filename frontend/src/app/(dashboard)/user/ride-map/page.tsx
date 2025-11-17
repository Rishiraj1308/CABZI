
'use client'

import React, { useState, useEffect, useCallback, Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft, MapPin, Clock, Car } from 'lucide-react'
import { getRoute, searchPlace } from '@/lib/routing'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { useFirebase } from '@/lib/firebase/client-provider'
import { GeoPoint, addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { toast } from 'sonner'
import type { RideData, ClientSession } from '@/lib/types'
import { cn } from '@/lib/utils'
import { HeartHandshake } from 'lucide-react'
import SearchingIndicator from '@/components/ui/searching-indicator'
import { useActiveRequest } from '@/features/user/components/active-request-provider';


const LiveMap = dynamic(() => import('@/features/user/components/ride/LiveMap'), {
    ssr: false,
    loading: () => <Skeleton className="w-full h-full bg-muted" />,
});

interface LocationWithCoords {
    address: string;
    coords: { lat: number; lon: number; } | null;
}

interface RideTypeInfo {
    name: string;
    description: string;
    icon: React.ElementType;
    eta: string;
    fare: string;
    fareDetails?: { base: number; perKm: number; serviceFee: number; total: number; }
}

const fareConfig: {[key: string]: { base: number, perKm: number, serviceFee: number }} = {
    'Bike': { base: 20, perKm: 5, serviceFee: 0 },
    'Auto': { base: 30, perKm: 8, serviceFee: 0 }, 
    'Cab (Lite)': { base: 40, perKm: 12, serviceFee: 20 },
    'Curocity Pink': { base: 50, perKm: 12, serviceFee: 30 },
}

const initialRideTypes: RideTypeInfo[] = [
    { name: 'Bike', description: 'Quick and affordable for solo trips', icon: Car, eta: '...', fare: '...' },
    { name: 'Auto', description: 'The classic three-wheeler for city travel', icon: Car, eta: '...', fare: '...' },
    { name: 'Cab (Lite)', description: 'Affordable sedans for everyday rides', icon: Car, eta: '...', fare: '...' },
    { name: 'Curocity Pink', description: 'A safe ride option exclusively for women.', icon: HeartHandshake, eta: '...', fare: '...' },
]


function BookRideMapComponent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { db, user } = useFirebase();
    const [session, setSession] = useState<ClientSession | null>(null);
    const { setActiveRide } = useActiveRequest() as any;
    
    const [pickup, setPickup] = useState<LocationWithCoords>({ address: 'Locating...', coords: null });
    const [destination, setDestination] = useState<LocationWithCoords | null>(null);
    const [routeGeometry, setRouteGeometry] = useState(null);
    const [routeInfo, setRouteInfo] = useState<{distance: number, duration: number} | null>(null);
    const [rideTypes, setRideTypes] = useState<RideTypeInfo[]>(initialRideTypes);
    const [selectedRide, setSelectedRide] = useState('Cab (Lite)');
    const [isLoading, setIsLoading] = useState(true);
    const [isBooking, setIsBooking] = useState(false);
    
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const handleSelectRideType = (rideName: string) => {
        setSelectedRide(rideName);
    }

    const getAddress = useCallback(async (lat: number, lon: number): Promise<string | null> => {
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
            if (!res.ok) return null;
            const data = await res.json();
            return data?.display_name || null;
        } catch {
            return null;
        }
    }, []);

    useEffect(() => {
        if(user && db){
            const sessionData = localStorage.getItem('curocity-session');
            if(sessionData) setSession(JSON.parse(sessionData));
        }
    },[user, db]);

    // This effect runs once to get the initial destination from the URL and the user's current location.
    useEffect(() => {
        const destQuery = searchParams.get('search');
        if (!destQuery) {
             toast.error("No destination selected.");
             router.back();
             return;
        }

        const fetchInitialData = async () => {
            // Get user's current location
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const coords = { lat: position.coords.latitude, lon: position.coords.longitude };
                    setPickup(prev => ({ ...prev, coords }));
                    const address = await getAddress(coords.lat, coords.lon);
                    setPickup({ address: address || 'Current Location', coords });
                },
                () => {
                    // Fallback location if user denies access
                    const fallbackCoords = { lat: 28.6139, lon: 77.2090 };
                    setPickup({ address: 'New Delhi, India', coords: fallbackCoords }); 
                    toast.error("Location Access Denied");
                }
            );
            
            // Geocode the destination from URL
            try {
                const results = await searchPlace(destQuery);
                if (results.length > 0) {
                    const place = results[0];
                    setDestination({ 
                        address: place.display_name,
                        coords: { lat: parseFloat(place.lat), lon: parseFloat(place.lon) } 
                    });
                } else {
                     toast.error("Destination Not Found");
                }
            } catch (error) {
                 toast.error("Error", { description: "Could not find coordinates for the destination." });
            }
        };

        fetchInitialData();
    }, [searchParams, router, getAddress]);

    // This effect runs only when the user's location or destination changes to calculate the route and fares.
    useEffect(() => {
        if (!pickup?.coords || !destination?.coords) return;

        const fetchRouteAndFares = async () => {
            setIsLoading(true);
            try {
                const routeData = await getRoute(pickup.coords!, destination.coords!);
                if (routeData.routes && routeData.routes.length > 0) {
                    const route = routeData.routes[0];
                    setRouteGeometry(route.geometry);
                    setRouteInfo({ distance: route.distance / 1000, duration: Math.round(route.duration / 60) });
                    
                    const updatedRideTypes = initialRideTypes.map(rt => {
                        if (rt.name === 'Curocity Pink' && session?.gender !== 'female') {
                            return { ...rt, fare: 'N/A', eta: 'N/A' };
                        }
                        const config = fareConfig[rt.name];
                        if (!config) return { ...rt, fare: 'N/A', eta: 'N/A' };
                        // Add a 20% buffer for traffic/time
                        const totalFare = Math.round(((config.base + (config.perKm * (route.distance / 1000))) * 1.2) / 5) * 5;
                        return { 
                            ...rt, 
                            fare: `₹${totalFare}`, 
                            fareDetails: { ...config, total: totalFare },
                            eta: `${Math.round(route.duration / 60) + 3} min`
                        };
                    });
                    setRideTypes(updatedRideTypes);
                }
            } catch (error) {
                toast.error("Routing Error");
            } finally {
                setIsLoading(false);
            }
        };

        fetchRouteAndFares();
    }, [pickup, destination, session?.gender]);
    
    const handleConfirmRide = async () => {
       if (!pickup?.coords || !destination?.coords || !session || !db || !routeInfo) return;
    
        const selectedRideInfo = rideTypes.find(rt => rt.name === selectedRide);
        if (!selectedRideInfo?.fareDetails) {
            toast.error('Error', { description: 'Could not get ride fare details.' });
            return;
        }

        setIsBooking(true); 

        const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
        const rideData = {
            riderId: session.userId,
            riderName: session.name,
            riderGender: session.gender,
            pickup: { address: pickup.address, location: new GeoPoint(pickup.coords.lat, pickup.coords.lon) },
            destination: { address: destination.address, location: new GeoPoint(destination.coords.lat, destination.coords.lon) },
            rideType: selectedRide,
            status: 'searching' as const,
            fare: selectedRideInfo.fareDetails.total,
            distance: routeInfo.distance,
            otp: generatedOtp,
            createdAt: serverTimestamp(),
        };

        try {
            const docRef = await addDoc(collection(db, 'rides'), rideData);
            setActiveRide({ id: docRef.id, ...rideData });
        } catch (error) {
            toast.error('Booking Failed', {description: 'Please try again later.'});
            setIsBooking(false); // Only reset on failure
        }
    }

    return (
        <div className="h-screen w-screen flex flex-col bg-background">
            <div className="absolute top-4 left-4 z-20">
                 <Button variant="outline" size="icon" className="h-10 w-10 rounded-full shadow-lg" onClick={() => router.back()}>
                    <ArrowLeft className="w-5 h-5"/>
                </Button>
            </div>
            <div className="flex-1 relative">
                <div className="absolute inset-0 z-0">
                    {isClient && (
                        <LiveMap
                            riderLocation={pickup?.coords}
                            destinationLocation={destination?.coords}
                            routeGeometry={routeGeometry}
                        />
                    )}
                </div>
            </div>
            
             <Card className="shadow-2xl rounded-t-3xl border-t-4 border-primary/20 flex flex-col h-auto max-h-[65%]">
                 {isBooking ? (
                    <CardContent className="p-6 flex flex-col items-center justify-center text-center flex-1">
                        <SearchingIndicator partnerType="path" />
                        <p className="mt-4 font-semibold text-lg">Finding your ride...</p>
                        <p className="text-sm text-muted-foreground">Connecting you to a nearby partner.</p>
                    </CardContent>
                 ) : (
                    <>
                        <CardHeader className="text-center">
                            <CardTitle>Select a Ride</CardTitle>
                            <CardDescription>Choose your preferred ride type for this trip.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 flex-1 overflow-y-auto">
                            {isLoading ? (
                                Array.from({length: 4}).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
                            ) : (
                                rideTypes.map(rt => (
                                    <Card 
                                        key={rt.name} 
                                        onClick={() => rt.fare !== 'N/A' && handleSelectRideType(rt.name)}
                                        className={cn(
                                        "flex items-center p-3 gap-3 cursor-pointer transition-all", 
                                        selectedRide === rt.name && 'ring-2 ring-primary', 
                                        rt.fare === 'N/A' && 'opacity-40 cursor-not-allowed',
                                        rt.name === 'Curocity Pink' && 'bg-pink-500/5',
                                        rt.name === 'Curocity Pink' && selectedRide === rt.name && 'ring-pink-500'
                                        
                                        )}>
                                        <rt.icon className={cn("w-10 h-10 flex-shrink-0", rt.name === 'Curocity Pink' ? 'text-pink-500' : 'text-primary')} />
                                        <div className="flex-1">
                                            <p className="font-bold">{rt.name}</p>
                                            <p className="text-xs text-muted-foreground">{rt.description}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-lg">{rt.fare}</p>
                                            <p className="text-xs flex items-center justify-end gap-1"><Clock className="w-3 h-3"/> {rt.eta}</p>
                                        </div>
                                    </Card>
                                ))
                            )}
                        </CardContent>
                        <CardFooter className="pt-4">
                            <Button size="lg" className="h-12 text-base font-bold w-full" disabled={isLoading || isBooking} onClick={handleConfirmRide}>
                                {isBooking ? 'Confirming...' : `Confirm ${selectedRide}`}
                            </Button>
                        </CardFooter>
                    </>
                 )}
            </Card>
        </div>
    )
}

export default function BookRideMapPage() {
    return (
        <Suspense fallback={<Skeleton className="w-full h-screen" />}>
            <BookRideMapComponent />
        </Suspense>
    );
}

    
