
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
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Place[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    
    const [userLocation, setUserLocation] = useState<{ lat: number, lon: number } | null>(null);
    const [destination, setDestination] = useState<{ lat: number, lon: number } | null>(null);
    const [routeGeometry, setRouteGeometry] = useState(null);
    const [destinationName, setDestinationName] = useState('');
    
    const liveMapRef = useRef<any>(null);


    const handleSearch = useCallback(async (query: string) => {
        if(query.length < 3) return;
        setIsSearching(true);
        const results = await searchPlace(query);
        setSearchResults(results || []);
        setIsSearching(false);
    }, []);

    const handleSelectPlace = useCallback((place: Place) => {
        const destCoords = { lat: parseFloat(place.lat), lon: parseFloat(place.lon) };
        setDestination(destCoords);
        setDestinationName(place.display_name);
        setSearchQuery(place.display_name.split(',')[0]);
        setSearchResults([]);
    }, []);

    useEffect(() => {
        // Get user's current location once
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setUserLocation({
                    lat: position.coords.latitude,
                    lon: position.coords.longitude
                });
            },
            () => {
                // Fallback to a default location if user denies permission
                setUserLocation({ lat: 28.6139, lon: 77.2090 });
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
            setSearchQuery(initialSearch);
            handleSearch(initialSearch);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    return (
        <div className="h-screen w-screen flex flex-col bg-background">
            <header className="absolute top-0 left-0 right-0 z-10 p-4">
                <div className="flex items-start gap-4">
                    <Button variant="outline" size="icon" className="rounded-full shadow-lg shrink-0" onClick={() => router.back()}>
                        <ArrowLeft className="w-5 h-5"/>
                    </Button>
                    <div className="w-full">
                        <Card className="shadow-lg">
                            <CardContent className="p-2">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search for a destination..."
                                        className="pl-10 border-0 focus-visible:ring-0 text-base"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                        {searchResults.length > 0 && (
                            <Card className="mt-2 shadow-lg max-h-60 overflow-y-auto">
                                <CardContent className="p-2 space-y-1">
                                    {searchResults.map(place => (
                                        <div key={place.place_id} onClick={() => handleSelectPlace(place)} className="p-2 rounded-md hover:bg-muted cursor-pointer">
                                            <p className="font-semibold text-sm">{place.display_name.split(',')[0]}</p>
                                            <p className="text-xs text-muted-foreground">{place.display_name.split(',').slice(1).join(',')}</p>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </header>

            <div className="flex-1">
                <LiveMap 
                    ref={liveMapRef} 
                    riderLocation={userLocation}
                    routeGeometry={routeGeometry}
                />
            </div>
            
             {destination && (
                <div className="absolute bottom-0 left-0 right-0 z-10 p-4">
                     <div className="absolute top-0 right-6 -translate-y-1/2 flex flex-col gap-2">
                        <Button variant="outline" size="icon" className="rounded-full shadow-lg h-12 w-12"><MessageSquare className="w-6 h-6"/></Button>
                        <Button variant="outline" size="icon" className="rounded-full shadow-lg h-12 w-12"><Shield className="w-6 h-6"/></Button>
                    </div>
                    <Card className="shadow-2xl animate-fade-in">
                        <CardContent className="p-4 flex items-center justify-between gap-4">
                           <div className="flex-1">
                                <p className="text-sm text-muted-foreground">Destination</p>
                                <h3 className="font-bold text-lg leading-tight line-clamp-2">{destinationName}</h3>
                           </div>
                           <Button size="lg" className="h-12 text-base">Confirm Ride</Button>
                        </CardContent>
                    </Card>
                </div>
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
