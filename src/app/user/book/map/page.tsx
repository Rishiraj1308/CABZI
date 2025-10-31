
'use client'

import React, { useState, useEffect, useCallback, Suspense, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft, MapPin, X, Shield, Phone, Siren, Clock, IndianRupee } from 'lucide-react'
import { getRoute, searchPlace } from '@/lib/routing'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { useFirebase } from '@/firebase/client-provider'
import { GeoPoint, addDoc, collection, serverTimestamp, getDoc, doc, onSnapshot, updateDoc } from 'firebase/firestore'
import { useToast } from '@/hooks/use-toast'
import type { RideData, ClientSession } from '@/lib/types'
import { cn } from '@/lib/utils'
import { BikeIcon, AutoIcon, CabIcon } from '@/components/icons'
import { HeartHandshake } from 'lucide-react'
import RideStatus from '@/components/ride-status'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

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
    
    const [pickup, setPickup] = useState<LocationWithCoords>({ address: 'Locating...', coords: null });
    const [destination, setDestination] = useState<LocationWithCoords | null>(null);
    const [routeGeometry, setRouteGeometry] = useState(null);
    const [routeInfo, setRouteInfo] = useState<{distance: number, duration: number} | null>(null);
    const [rideTypes, setRideTypes] = useState<RideTypeInfo[]>(initialRideTypes);
    const [selectedRide, setSelectedRide] = useState('Cab (Lite)');
    const [isLoading, setIsLoading] = useState(true);
    const [isBooking, setIsBooking] = useState(false);
    
    const [activeRide, setActiveRide] = useState<RideData | null>(null);

    // Refs for audio elements
    const doorSoundRef = useRef<HTMLAudioElement | null>(null);
    const engineStartSoundRef = useRef<HTMLAudioElement | null>(null);

    // Initialize audio on component mount
    useEffect(() => {
        doorSoundRef.current = new Audio('/sounds/door-open.mp3');
        engineStartSoundRef.current = new Audio('/sounds/engine-start.mp3');
    }, []);

    const playSound = (soundRef: React.RefObject<HTMLAudioElement>) => {
        soundRef.current?.play().catch(e => console.log("Sound play failed:", e));
    };

    const handleSelectRideType = (rideName: string) => {
        setSelectedRide(rideName);
        playSound(doorSoundRef);
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
            getDoc(doc(db, 'users', user.uid)).then(docSnap => {
                if(docSnap.exists()){
                    setSession({userId: user.uid, name: docSnap.data().name, phone: docSnap.data().phone, gender: docSnap.data().gender})
                }
            })
        }
    },[user, db]);

    // This effect runs once to get the initial destination from the URL and the user's current location.
    useEffect(() => {
        const destQuery = searchParams.get('search');
        if (!destQuery) {
             toast({ variant: "destructive", title: "No destination selected." });
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
                    toast({ variant: 'destructive', title: "Location Access Denied" });
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
                     toast({ variant: "destructive", title: "Destination Not Found" });
                }
            } catch (error) {
                 toast({ variant: "destructive", title: "Error", description: "Could not find coordinates for the destination." });
            }
        };

        fetchInitialData();
    }, [searchParams, router, toast, getAddress]);

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
                toast({ variant: "destructive", title: "Routing Error" });
            } finally {
                setIsLoading(false);
            }
        };

        fetchRouteAndFares();
    }, [pickup, destination, toast, session?.gender]);
    
    // This effect listens for updates on the active ride.
    useEffect(() => {
        if (!db || !activeRide?.id) return;
    
        const unsub = onSnapshot(doc(db, 'rides', activeRide.id), (docSnap) => {
            if (docSnap.exists()) {
                const rideData = { id: docSnap.id, ...docSnap.data() } as RideData;
                setActiveRide(rideData); // Update state with the new data
                // Check if the ride is completed or cancelled
                if (['completed', 'cancelled_by_driver', 'cancelled_by_rider'].includes(rideData.status)) {
                     setTimeout(() => {
                        localStorage.removeItem('activeRideId');
                        setActiveRide(null);
                        setRouteGeometry(null);
                    }, 5000); // 5-second delay before clearing
                }
            } else {
                 localStorage.removeItem('activeRideId');
                 setActiveRide(null);
                 setRouteGeometry(null);
            }
        });
    
        return () => unsub(); // Cleanup on component unmount or when activeRide.id changes
    }, [db, activeRide?.id]);
    
     // New effect to check for an active ride on initial load
    useEffect(() => {
        if (!db) return;
        const activeRideId = localStorage.getItem('activeRideId');
        if (activeRideId) {
            const rideRef = doc(db, 'rides', activeRideId);
            getDoc(rideRef).then(docSnap => {
                if (docSnap.exists()) {
                    setActiveRide({ id: docSnap.id, ...docSnap.data() } as RideData);
                } else {
                    localStorage.removeItem('activeRideId');
                }
            });
        }
    }, [db]);

    const handleConfirmRide = async () => {
       if (!pickup?.coords || !destination?.coords || !session || !db || !routeInfo) return;
    
        const selectedRideInfo = rideTypes.find(rt => rt.name === selectedRide);
        if (!selectedRideInfo?.fareDetails) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not get ride fare details.' });
            return;
        }

        playSound(engineStartSoundRef);
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
            setActiveRide({ id: docRef.id, ...rideData } as RideData);
            localStorage.setItem('activeRideId', docRef.id);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Booking Failed' });
        } finally {
            setIsBooking(false);
        }
    }
    
    const handleCancelRide = async () => {
        if (!db || !activeRide) return;
        const rideRef = doc(db, 'rides', activeRide.id);
        try {
            await updateDoc(rideRef, { status: 'cancelled_by_rider' });
            toast({ variant: 'destructive', title: 'Ride Cancelled' });
            localStorage.removeItem('activeRideId');
            setActiveRide(null);
            setRouteGeometry(null);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Cancellation failed' });
        }
    }


    return (
        <div className="h-screen w-screen flex flex-col bg-background">
            <div className="flex-1 relative">
                <div className="absolute inset-0 z-0">
                    <LiveMap
                        riderLocation={pickup?.coords}
                        destinationLocation={destination?.coords}
                        routeGeometry={routeGeometry}
                        isTripInProgress={activeRide?.status === 'in-progress'}
                    />
                </div>
                 <div className="absolute top-4 left-4 z-10">
                    <Button variant="outline" size="icon" className="rounded-full shadow-lg" onClick={() => router.back()}>
                        <ArrowLeft className="w-5 h-5"/>
                    </Button>
                </div>
            </div>
            
             <Card className="shadow-2xl rounded-t-3xl border-t-4 border-primary/20 flex flex-col h-auto max-h-[65%]">
                 {activeRide ? (
                     <div className="p-4">
                         <RideStatus ride={activeRide} onCancel={handleCancelRide} onDone={handleCancelRide} />
                     </div>
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
                        <CardFooter className="pt-4 grid grid-cols-5 gap-2">
                            <Button size="lg" className="h-12 text-base font-bold col-span-4" disabled={isLoading || isBooking} onClick={handleConfirmRide}>
                                {isBooking ? 'Confirming...' : `Confirm ${selectedRide}`}
                            </Button>
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="outline" size="lg" className="h-12">
                                        <Shield/>
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>Safety Toolkit</AlertDialogTitle></AlertDialogHeader>
                                    <div className="py-4 space-y-2">
                                        <Button variant="outline" className="w-full justify-start gap-2" onClick={() => toast({title: "Coming Soon!"})}><MapPin className="w-4 h-4"/> Share Ride Details</Button>
                                        <Button variant="outline" className="w-full justify-start gap-2"><a href="tel:112"><Phone className="w-4 h-4"/> Call Emergency Services</a></Button>
                                    </div>
                                </AlertDialogContent>
                            </AlertDialog>
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
