
'use client'

import React, { useState, useEffect, useCallback, Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft, MapPin } from 'lucide-react'
import { getRoute, searchPlace } from '@/lib/routing'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { useFirebase } from '@/firebase/client-provider'
import { GeoPoint, addDoc, collection, serverTimestamp, getDoc, doc, onSnapshot } from 'firebase/firestore'
import { useToast } from '@/hooks/use-toast'
import type { RideData, ClientSession } from '@/lib/types'
import { cn } from '@/lib/utils'
import { BikeIcon, AutoIcon, CabIcon } from '@/components/icons'
import { HeartHandshake, Clock, IndianRupee, Shield } from 'lucide-react'
import SearchingIndicator from '@/components/ui/searching-indicator'
import { motion, AnimatePresence } from 'framer-motion'

const LiveMap = dynamic(() => import('@/components/live-map'), {
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
    'Cab (Lite)': { base: 40, perKm: 10, serviceFee: 20 },
    'Curocity Pink': { base: 50, perKm: 12, serviceFee: 30 },
}

const initialRideTypes: RideTypeInfo[] = [
    { name: 'Bike', description: 'Quick and affordable for solo trips', icon: BikeIcon, eta: '...', fare: '...' },
    { name: 'Auto', description: 'The classic three-wheeler for city travel', icon: AutoIcon, eta: '...', fare: '...' },
    { name: 'Cab (Lite)', description: 'Affordable sedans for everyday rides', icon: CabIcon, eta: '...', fare: '...' },
    { name: 'Curocity Pink', description: 'A safe ride option exclusively for women.', icon: HeartHandshake, eta: '...', fare: '...' },
]


function BookRideMapComponent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const { db, user } = useFirebase();
    const [session, setSession] = useState<ClientSession | null>(null);
    
    const [userLocation, setUserLocation] = useState<{ lat: number, lon: number } | null>(null);
    const [destination, setDestination] = useState<LocationWithCoords | null>(null);
    const [routeGeometry, setRouteGeometry] = useState(null);
    const [routeInfo, setRouteInfo] = useState<{distance: number, duration: number} | null>(null);
    const [rideTypes, setRideTypes] = useState<RideTypeInfo[]>(initialRideTypes);
    const [selectedRide, setSelectedRide] = useState('Cab (Lite)');
    const [isLoading, setIsLoading] = useState(true);
    const [isBooking, setIsBooking] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

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
            getDoc(doc(db, 'users', user.uid)).then(docSnap => {
                if(docSnap.exists()){
                    setSession({userId: user.uid, name: docSnap.data().name, phone: docSnap.data().phone, gender: docSnap.data().gender})
                }
            })
        }
    },[user, db])

    useEffect(() => {
        const fetchInitialData = async () => {
            const destQuery = searchParams.get('search');
            if (!destQuery) {
                 toast({ variant: "destructive", title: "No destination selected." });
                 router.back();
                 return;
            }

            try {
                // Get user's current location first
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const coords = {
                            lat: position.coords.latitude,
                            lon: position.coords.longitude
                        };
                        setUserLocation(coords);
                    },
                    () => {
                        // Fallback location if user denies permission
                        setUserLocation({ lat: 28.6139, lon: 77.2090 });
                        toast({ variant: 'destructive', title: "Location Access Denied", description: "Using default location. Your ride fare might be inaccurate." });
                    }
                );

                // Geocode the destination query
                const results = await (await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destQuery)}&format=json&limit=1`)).json();
                if (results.length > 0) {
                    const place = results[0];
                    setDestination({ 
                        address: place.display_name,
                        coords: { lat: parseFloat(place.lat), lon: parseFloat(place.lon) } 
                    });
                } else {
                     toast({ variant: "destructive", title: "Destination Not Found" });
                }
            } catch (error) {
                console.error("Failed to get destination coordinates:", error);
                 toast({ variant: "destructive", title: "Error", description: "Could not find coordinates for the destination." });
            }
        };

        fetchInitialData();
    }, [searchParams, router, toast]);


    useEffect(() => {
        const fetchRouteAndFares = async () => {
            if (!userLocation || !destination?.coords) return;
            setIsLoading(true);

            try {
                const routeData = await getRoute(userLocation, destination.coords);
                if (routeData.routes && routeData.routes.length > 0) {
                    const route = routeData.routes[0];
                    setRouteGeometry(route.geometry);
                    setRouteInfo({
                        distance: route.distance / 1000, // meters to km
                        duration: Math.round(route.duration / 60) // seconds to minutes
                    });
                    
                    const updatedRideTypes = initialRideTypes.map(rt => {
                        if (rt.name === 'Curocity Pink' && session?.gender !== 'female') {
                            return { ...rt, fare: 'N/A', eta: 'N/A' };
                        }

                        const config = fareConfig[rt.name];
                        if (!config) return { ...rt, fare: 'N/A', eta: 'N/A' };
                        
                        const calculatedFare = config.base + (config.perKm * (route.distance / 1000)) + config.serviceFee;
                        const totalFare = Math.round(calculatedFare / 5) * 5; // Round to nearest 5
                        
                        return { 
                            ...rt, 
                            fare: `₹${totalFare}`, 
                            fareDetails: { ...config, total: totalFare },
                            eta: `${Math.round(route.duration / 60) + 3} min` // Adding a buffer for finding driver
                        };
                    });
                    setRideTypes(updatedRideTypes);

                }
            } catch (error) {
                console.error("Failed to fetch route:", error);
                toast({ variant: "destructive", title: "Routing Error", description: "Could not calculate the route."});
            } finally {
                setIsLoading(false);
            }
        };

        fetchRouteAndFares();
    }, [userLocation, destination, toast, session?.gender]);
    
    const handleConfirmRide = async () => {
       if (!userLocation || !destination?.coords || !session || !db) return;
    
        const selectedRideInfo = rideTypes.find(rt => rt.name === selectedRide);
        if (!selectedRideInfo?.fareDetails) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not get ride fare details.' });
            return;
        }

        setIsBooking(true); 

        const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
        const rideData = {
            riderId: session.userId,
            riderName: session.name,
            riderGender: session.gender,
            pickup: { address: 'Current Location', location: new GeoPoint(userLocation.lat, userLocation.lon) },
            destination: { address: destination.address, location: new GeoPoint(destination.coords.lat, destination.coords.lon) },
            rideType: selectedRide,
            status: 'searching' as const,
            fare: selectedRideInfo.fareDetails.total,
            otp: generatedOtp,
            createdAt: serverTimestamp(),
        };

        try {
            const docRef = await addDoc(collection(db, 'rides'), rideData);
            localStorage.setItem('activeRideId', docRef.id);
            setIsSearching(true); // Show searching UI
            
             // Listen for the ride to be accepted, then navigate
            const unsubscribe = onSnapshot(doc(db, 'rides', docRef.id), (rideSnap) => {
                if (rideSnap.exists() && rideSnap.data().status !== 'searching') {
                    unsubscribe();
                    router.push('/user');
                }
            });

        } catch (error) {
            console.error("Error creating ride:", error);
            toast({ variant: 'destructive', title: 'Booking Failed' });
            setIsBooking(false); // Re-enable button on failure
        }
    }


    return (
        <div className="h-screen w-screen flex flex-col bg-background">
            <div className="flex-1 relative">
                <div className="absolute inset-0 z-0">
                    <LiveMap
                        riderLocation={userLocation}
                        destinationLocation={destination?.coords}
                        routeGeometry={routeGeometry}
                    />
                </div>
                 <div className="absolute top-4 left-4 z-10">
                    <Button variant="outline" size="icon" className="rounded-full shadow-lg" onClick={() => router.back()}>
                        <ArrowLeft className="w-5 h-5"/>
                    </Button>
                </div>
            </div>
            
             <Card className="shadow-2xl rounded-t-3xl border-t-4 border-primary/20 flex flex-col h-auto max-h-[55%]">
                <AnimatePresence mode="wait">
                    {isSearching ? (
                         <motion.div
                            key="searching"
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -50 }}
                         >
                            <CardHeader>
                                <CardTitle>Finding you a ride...</CardTitle>
                            </CardHeader>
                             <CardContent className="flex flex-col items-center justify-center text-center h-64">
                                <SearchingIndicator partnerType="path" className="w-32 h-32"/>
                                <p className="text-muted-foreground mt-4">Please wait while we connect you to a nearby partner.</p>
                            </CardContent>
                         </motion.div>
                    ) : (
                         <motion.div
                            key="selection"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                         >
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
                                            onClick={() => rt.fare !== 'N/A' && setSelectedRide(rt.name)}
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
                            <CardFooter className="pt-4 grid grid-cols-5 gap-2">
                                <Button size="lg" className="h-12 text-base font-bold col-span-4" disabled={isLoading || isBooking} onClick={handleConfirmRide}>
                                    {isBooking ? 'Confirming...' : `Confirm ${selectedRide}`}
                                </Button>
                                <Button variant="outline" size="lg" className="h-12">
                                    <Shield/>
                                </Button>
                            </CardFooter>
                         </motion.div>
                    )}
                </AnimatePresence>
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

    