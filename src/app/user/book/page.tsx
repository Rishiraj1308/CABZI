'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Search, MapPin, MoreVertical, LocateFixed } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { searchPlace } from '@/lib/routing';
import { useFirebase } from '@/firebase/client-provider';

const LiveMap = dynamic(() => import('@/components/live-map'), {
    ssr: false,
    loading: () => <div className="w-full h-full bg-muted flex items-center justify-center"><p>Loading Map...</p></div>
});


interface Place {
    place_id: string;
    display_name: string;
    lat: string;
    lon: string;
    [key: string]: any; // Allow other properties
}

interface POI {
    place_id: string;
    display_name: string;
    distance: string;
}

export default function BookRidePage() {
    const router = useRouter();
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Place[]>([]);
    const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
    const [nearbyPois, setNearbyPois] = useState<POI[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [userCoords, setUserCoords] = useState<{lat: number, lon: number} | null>(null);
    const mapRef = useRef<any>(null);
    const { user } = useFirebase();

    useEffect(() => {
        if (!user) {
            router.push('/login?role=user');
        }
    }, [user, router]);
    
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(pos => {
                setUserCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
            });
        }
    }, []);

    const fetchPois = useCallback(async (place: Place) => {
        if (!userCoords) return;
        
        setIsSearching(true);
        try {
            // A simple way to get POIs is to search for common terms near the selected place
            const poiQuery = `(gate, pickup, drop-off, entry, exit) near ${place.display_name}`;
            const results = await searchPlace(poiQuery);
            if (results && results.length > 0) {
                 const pois = results.map((poi: Place) => {
                     const distanceInKm = getDistance(
                         userCoords.lat,
                         userCoords.lon,
                         parseFloat(poi.lat),
                         parseFloat(poi.lon)
                     );
                     return {
                         place_id: poi.place_id,
                         display_name: poi.display_name.split(',')[0], // Keep it short
                         distance: `${distanceInKm.toFixed(1)}km`
                     };
                 }).slice(0, 5); // Limit to 5 POIs
                 setNearbyPois(pois);
            } else {
                 setNearbyPois([]);
            }
        } catch (error) {
            setNearbyPois([]);
        } finally {
            setIsSearching(false);
        }
    }, [userCoords]);


    const handleSearch = useCallback(async (query: string) => {
        if (query.length < 3) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const results = await searchPlace(query);
            setSearchResults(results || []);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Search Failed' });
        } finally {
            setIsSearching(false);
        }
    }, [toast]);

    const handleSelectPlace = (place: Place) => {
        setSelectedPlace(place);
        setSearchResults([]);
        setSearchQuery(place.display_name.split(',')[0]);
        if (mapRef.current) {
            mapRef.current.flyTo([parseFloat(place.lat), parseFloat(place.lon)], 16);
        }
        fetchPois(place);
    };
    
    const handleLocateMe = () => {
        if(mapRef.current) {
            mapRef.current.locate();
        }
    }

    const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };


    return (
    <div className="h-screen w-screen flex flex-col bg-muted relative">
        <div className="absolute inset-0 z-0">
             <LiveMap ref={mapRef} />
        </div>

        <div className="absolute inset-0 z-10 flex flex-col pointer-events-none">
            <div className="p-4 flex items-center gap-2 pointer-events-auto">
                 <Button variant="outline" size="icon" className="rounded-full bg-background/80 backdrop-blur-sm" onClick={() => router.back()}>
                    <ArrowLeft className="w-5 h-5"/>
                 </Button>
                 <div className="relative flex-1">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                     <Input 
                        placeholder="Search for a destination..." 
                        className="pl-10 h-11 rounded-full shadow-md bg-background/80 backdrop-blur-sm"
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); handleSearch(e.target.value); }}
                     />
                 </div>
            </div>
            
            {searchResults.length > 0 && (
                <Card className="mx-4 mt-2 shadow-lg pointer-events-auto">
                    <CardContent className="p-2 max-h-60 overflow-y-auto">
                        {isSearching ? <Skeleton className="h-20 w-full" /> : (
                            searchResults.map(place => (
                                <div key={place.place_id} onClick={() => handleSelectPlace(place)} className="p-2 flex items-start gap-3 rounded-md hover:bg-muted cursor-pointer">
                                    <MapPin className="w-5 h-5 text-muted-foreground mt-1"/>
                                    <div>
                                        <p className="font-semibold text-sm">{place.display_name.split(',')[0]}</p>
                                        <p className="text-xs text-muted-foreground">{place.display_name.split(',').slice(1,4).join(',')}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            )}

            <div className="absolute top-1/2 right-4 -translate-y-1/2 pointer-events-auto">
                <Button variant="outline" size="icon" className="rounded-full bg-background/80 backdrop-blur-sm" onClick={handleLocateMe}>
                    <LocateFixed className="w-5 h-5"/>
                </Button>
            </div>

            {selectedPlace && (
                <div className="mt-auto pointer-events-auto">
                    <Card className="rounded-b-none rounded-t-2xl shadow-2xl">
                        <CardHeader>
                            <CardTitle className="flex justify-between items-start">
                                <div>
                                    <p className="text-xl">{selectedPlace.display_name.split(',')[0]}</p>
                                    <p className="text-xs text-muted-foreground font-normal">{selectedPlace.display_name.split(',').slice(1,3).join(',')}</p>
                                </div>
                                 <Button variant="ghost" size="icon"><MoreVertical className="w-5 h-5"/></Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                             {isSearching ? <Skeleton className="h-16 w-full" /> : 
                                nearbyPois.length > 0 ? (
                                    nearbyPois.map(poi => (
                                        <div key={poi.place_id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted cursor-pointer">
                                            <MapPin className="w-6 h-6 text-primary mt-1"/>
                                            <div>
                                                <p className="font-semibold">{poi.display_name}</p>
                                                <p className="text-sm text-muted-foreground">{poi.distance} from your location</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    // Default/Fallback when no POIs found
                                    <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted cursor-pointer">
                                        <MapPin className="w-6 h-6 text-primary mt-1"/>
                                        <div>
                                            <p className="font-semibold">Main Entrance</p>
                                            <p className="text-sm text-muted-foreground">Default drop-off point</p>
                                        </div>
                                    </div>
                                )
                             }
                        </CardContent>
                        <CardFooter>
                            <Button size="lg" className="w-full" onClick={() => toast({ title: 'Feature Coming Soon!', description: 'Ride confirmation flow will be enabled soon.' })}>Choose This Destination</Button>
                        </CardFooter>
                    </Card>
                </div>
            )}
        </div>
    </div>
  );
}