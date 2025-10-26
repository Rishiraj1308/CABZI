
'use client'

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Search, MessageSquare, Shield } from 'lucide-react'
import { searchPlace, getRoute } from '@/lib/routing'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const LiveMap = dynamic(() => import('@/components/live-map'), { 
    ssr: false,
    loading: () => <Skeleton className="w-full h-full bg-muted" />,
});

interface Place {
    place_id: string;
    display_name: string;
    lat: string;
    lon: string;
}

function BookRideMapComponent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const [userLocation, setUserLocation] = useState<{ lat: number, lon: number } | null>(null);
    const [originName, setOriginName] = useState('Current Location');
    const [destination, setDestination] = useState<{ lat: number, lon: number } | null>(null);
    const [routeGeometry, setRouteGeometry] = useState(null);
    const [destinationName, setDestinationName] = useState('');
    
    const liveMapRef = useRef<any>(null);


    const handleSearch = useCallback(async (query: string) => {
        if(query.length < 3) return;
        const results = await searchPlace(query);
        if (results && results.length > 0) {
            handleSelectPlace(results[0]);
        }
    }, []);

    const handleSelectPlace = useCallback((place: Place) => {
        const destCoords = { lat: parseFloat(place.lat), lon: parseFloat(place.lon) };
        setDestination(destCoords);
        setDestinationName(place.display_name.split(',').slice(0, 2).join(', '));
    }, []);

    useEffect(() => {
        // Get user's current location once
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const coords = {
                    lat: position.coords.latitude,
                    lon: position.coords.longitude
                };
                setUserLocation(coords);

                // Wait for map to be ready before calling getAddress
                const checkMapReady = setInterval(async () => {
                    if (liveMapRef.current) {
                        clearInterval(checkMapReady);
                        const address = await liveMapRef.current.getAddress(coords.lat, coords.lon);
                        if (address) {
                            setOriginName(address.split(',')[0] || 'Current Location');
                        }
                    }
                }, 100);
            },
            () => {
                // Fallback to a default location if user denies permission
                setUserLocation({ lat: 28.6139, lon: 77.2090 });
                setOriginName("New Delhi");
            }
        );
    }, []);

    useEffect(() => {
        // Fetch route when both user location and destination are set
        const fetchRoute = async () => {
            if (userLocation && destination) {
                try {
                    const routeData = await getRoute(userLocation, destination);
                    if (routeData.routes && routeData.routes.length > 0) {
                        setRouteGeometry(routeData.routes[0].geometry);
                    }
                } catch (error) {
                    console.error("Failed to fetch route:", error);
                }
            }
        };

        fetchRoute();
    }, [userLocation, destination]);
    
    // Effect to handle initial search from query params
    useEffect(() => {
        const initialSearch = searchParams.get('search');
        if (initialSearch) {
            handleSearch(initialSearch);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    return (
        <div className="h-screen w-screen relative">
            {/* Map Layer */}
            <div className="absolute inset-0 z-0">
                <LiveMap 
                    ref={liveMapRef} 
                    riderLocation={userLocation}
                    routeGeometry={routeGeometry}
                />
            </div>
            
            {/* UI Overlay Layer */}
            <div className="absolute inset-0 z-10 flex flex-col pointer-events-none">
                <header className="p-4 pointer-events-auto">
                    <Button variant="outline" size="icon" className="rounded-full shadow-lg shrink-0" onClick={() => router.back()}>
                        <ArrowLeft className="w-5 h-5"/>
                    </Button>
                </header>

                <div className="flex-grow" />

                {destination && (
                    <footer className="p-4 pointer-events-auto">
                         <div className="relative">
                            <div className="absolute -top-4 right-2 flex flex-col gap-2">
                                <Button variant="outline" size="icon" className="rounded-full shadow-lg h-12 w-12"><MessageSquare className="w-6 h-6"/></Button>
                                <Button variant="outline" size="icon" className="rounded-full shadow-lg h-12 w-12"><Shield className="w-6 h-6"/></Button>
                            </div>
                            <Card className="shadow-2xl animate-fade-in">
                                <CardContent className="p-4 flex items-center justify-between gap-4">
                                   <div className="flex-1">
                                        <p className="text-sm text-muted-foreground">Your Trip</p>
                                        <h3 className="font-bold text-lg leading-tight line-clamp-2">{originName} to {destinationName}</h3>
                                   </div>
                                   <Button size="lg" className="h-12 text-base">Confirm Ride</Button>
                                </CardContent>
                            </Card>
                         </div>
                    </footer>
                )}
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
