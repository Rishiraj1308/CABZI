
'use client'

import React, { useState, useEffect, useCallback, Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { getRoute } from '@/lib/routing'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { useFirebase } from '@/firebase/client-provider'
import { GeoPoint } from 'firebase/firestore'
import { useToast } from '@/hooks/use-toast'
import type { RideData, ClientSession } from '@/lib/types'
import { cn } from '@/lib/utils'
import { BikeIcon, AutoIcon, CabIcon } from '@/components/icons'
import { HeartHandshake, Clock, IndianRupee } from 'lucide-react'

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
    'Cabzi Pink': { base: 50, perKm: 12, serviceFee: 30 },
}

const initialRideTypes: RideTypeInfo[] = [
    { name: 'Bike', description: 'Quick and affordable for solo trips', icon: BikeIcon, eta: '...', fare: '...' },
    { name: 'Auto', description: 'The classic three-wheeler for city travel', icon: AutoIcon, eta: '...', fare: '...' },
    { name: 'Cab (Lite)', description: 'Affordable sedans for everyday rides', icon: CabIcon, eta: '...', fare: '...' },
    { name: 'Cabzi Pink', description: 'A safe ride option exclusively for women, with women partners.', icon: HeartHandshake, eta: '...', fare: '...' },
]


function BookRideMapComponent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    
    const [userLocation, setUserLocation] = useState<{ lat: number, lon: number } | null>(null);
    const [destination, setDestination] = useState<LocationWithCoords | null>(null);
    const [routeGeometry, setRouteGeometry] = useState(null);
    const [routeInfo, setRouteInfo] = useState<{distance: number, duration: number} | null>(null);
    const [rideTypes, setRideTypes] = useState<RideTypeInfo[]>(initialRideTypes);
    const [selectedRide, setSelectedRide] = useState('Cab (Lite)');
    const [isLoading, setIsLoading] = useState(true);

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
    }, [userLocation, destination, toast]);


    return (
        <div className="h-screen w-screen flex flex-col bg-muted">
            {/* Top Half: Map */}
            <div className="flex-1 relative">
                <Button variant="outline" size="icon" className="absolute top-4 left-4 z-10 rounded-full shadow-lg" onClick={() => router.back()}>
                    <ArrowLeft className="w-5 h-5"/>
                </Button>
                <LiveMap
                    riderLocation={userLocation}
                    routeGeometry={routeGeometry}
                />
            </div>

            {/* Bottom Half: Ride Options */}
            <div className="flex-1 flex flex-col p-4 bg-background rounded-t-2xl shadow-inner-top -mt-4 z-10 overflow-y-auto">
                 <CardHeader className="p-2 text-center">
                    <CardTitle>Select a Ride</CardTitle>
                    <CardDescription>Choose your preferred ride type for this trip.</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                     {isLoading ? (
                        Array.from({length: 4}).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
                    ) : (
                        rideTypes.map(rt => (
                            <Card 
                              key={rt.name} 
                              onClick={() => rt.fare !== 'N/A' && setSelectedRide(rt.name)}
                              className={cn(
                                "flex items-center p-3 gap-3 cursor-pointer transition-all", 
                                selectedRide === rt.name && 'ring-2 ring-primary shadow-lg', 
                                rt.fare === 'N/A' && 'opacity-40 cursor-not-allowed',
                                rt.name === 'Cabzi Pink' && 'bg-pink-500/5',
                                rt.name === 'Cabzi Pink' && selectedRide === rt.name && 'ring-pink-500'
                                
                                )}>
                                <rt.icon className={cn("w-10 h-10 flex-shrink-0", rt.name === 'Cabzi Pink' ? 'text-pink-500' : 'text-primary')} />
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
                    <Button size="lg" className="w-full h-12 text-base font-bold" disabled={isLoading}>
                       Confirm {selectedRide}
                    </Button>
                </CardFooter>
            </div>
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

