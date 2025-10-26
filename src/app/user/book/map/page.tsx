
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
            if (!destQuery) return;

            setDestinationName(destQuery.split(',').slice(0, 2).join(', '));
            
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const coords = {
                        lat: position.coords.latitude,
                        lon: position.coords.longitude
                    };
                    setUserLocation(coords);

                    const address = await getAddress(coords.lat, coords.lon);
                    if (address) {
                        const shortAddress = address.split(',')[0] || 'Current Location';
                        setOriginName(shortAddress);
                    }
                },
                () => {
                    setUserLocation({ lat: 28.6139, lon: 77.2090 });
                    setOriginName("New Delhi");
                }
            );

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
    }, [searchParams, getAddress]);

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
            {/* Map Layer */}
            <div className="absolute inset-0 z-0">
                <LiveMap 
                    ref={liveMapRef} 
                    riderLocation={userLocation}
                    routeGeometry={routeGeometry}
                />
            </div>
            
            {/* UI Overlay Layer */}
            <div className="absolute inset-0 z-10 flex flex-col p-4 pointer-events-none">
                {/* Header */}
                <header className="shrink-0">
                    <Button variant="outline" size="icon" className="rounded-full shadow-lg pointer-events-auto" onClick={() => router.back()}>
                        <ArrowLeft className="w-5 h-5"/>
                    </Button>
                </header>

                {/* Spacer */}
                <div className="flex-grow" />

                {/* Footer Confirmation Card */}
                <footer className="shrink-0 pointer-events-auto">
                    {destination && (
                        <Card className="shadow-2xl animate-fade-in w-full max-w-lg mx-auto">
                            <CardContent className="p-4 flex items-center justify-between gap-4">
                                <div className="flex-1">
                                    <p className="text-sm text-muted-foreground">Your Trip</p>
                                    <h3 className="font-bold text-lg leading-tight line-clamp-2">{originName} to {destinationName}</h3>
                                </div>
                                <Button size="lg" className="h-12 text-base">Confirm Ride</Button>
                            </CardContent>
                        </Card>
                    )}
                </footer>
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
