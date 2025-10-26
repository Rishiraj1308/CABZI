
'use client'

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft, MessageSquare, Shield } from 'lucide-react'
import { getRoute } from '@/lib/routing'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'

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

    useEffect(() => {
        const fetchInitialData = async () => {
            const destQuery = searchParams.get('search');
            if (!destQuery) return;

            // Since we don't have search on this page, we assume destQuery is a full display_name
            setDestinationName(destQuery.split(',').slice(0, 2).join(', '));
            
            // A real app would pass lat/lon, but for this flow, we'll parse it back if needed
            // For now, we'll assume the destination object is passed or re-fetched if necessary.

            // Get user's current location
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
                    setUserLocation({ lat: 28.6139, lon: 77.2090 });
                    setOriginName("New Delhi");
                }
            );

            // Fetch the coordinates for the destination name
            try {
                const results = await (await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destQuery)}&format=json&limit=1`)).json();
                if (results.length > 0) {
                    const place = results[0];
                    setDestination({ lat: parseFloat(place.lat), lon: parseFloat(place.lon) });
                }
            } catch (error) {
                console.error("Failed to get destination coordinates:", error);
            }
        };

        fetchInitialData();
    }, [searchParams]);

    useEffect(() => {
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

    return (
        <div className="h-screen w-screen relative">
            <div className="absolute inset-0 z-0">
                <LiveMap 
                    ref={liveMapRef} 
                    riderLocation={userLocation}
                    routeGeometry={routeGeometry}
                />
            </div>
            
            <div className="absolute inset-0 z-10 flex flex-col pointer-events-none">
                <header className="p-4 pointer-events-auto shrink-0">
                    <Button variant="outline" size="icon" className="rounded-full shadow-lg" onClick={() => router.back()}>
                        <ArrowLeft className="w-5 h-5"/>
                    </Button>
                </header>
            </div>

            {destination && (
                <footer className="absolute bottom-4 left-4 right-4 z-20 pointer-events-auto">
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
    )
}

export default function BookRideMapPage() {
    return (
        <Suspense fallback={<Skeleton className="w-full h-screen" />}>
            <BookRideMapComponent />
        </Suspense>
    );
}
