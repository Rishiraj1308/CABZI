
'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Search, LocateFixed, MapPin, Building } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { searchPlace } from '@/lib/routing'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { Skeleton } from '@/components/ui/skeleton'

const LiveMap = dynamic(() => import('@/components/live-map'), { 
    ssr: false,
    loading: () => <div className="w-full h-full bg-muted flex items-center justify-center"><p>Loading Map...</p></div>
});

interface Place {
    place_id: string;
    display_name: string;
    lat: string;
    lon: string;
    address: {
        road?: string;
        suburb?: string;
        city?: string;
        state?: string;
        postcode?: string;
        country?: string;
        amenity?: string;
        office?: string;
        building?: string;
    };
}


export default function BookRideMapPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Place[]>([]);
    const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
    const [mapCenter, setMapCenter] = useState<{lat: number, lon: number}>({ lat: 28.6139, lon: 77.2090 });
    const [nearbyPOIs, setNearbyPOIs] = useState<Place[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const liveMapRef = useRef<any>(null);


    const handleSearch = async () => {
        if(searchQuery.length < 3) return;
        setIsSearching(true);
        const results = await searchPlace(searchQuery);
        setSearchResults(results);
        setIsSearching(false);
    }
    
    const handleSelectPlace = (place: Place) => {
        setSelectedPlace(place);
        setMapCenter({ lat: parseFloat(place.lat), lon: parseFloat(place.lon) });
        setSearchResults([]);
        fetchNearbyPOIs(parseFloat(place.lat), parseFloat(place.lon));
    }
    
    const fetchNearbyPOIs = async (lat: number, lon: number) => {
        const poiQuery = `${selectedPlace?.address.amenity || selectedPlace?.address.office || selectedPlace?.display_name.split(',')[0]}`;
        const results = await searchPlace(poiQuery);
        setNearbyPOIs(results.filter((p: Place) => p.place_id !== selectedPlace?.place_id).slice(0, 4));
    }

    return (
        <div className="h-screen w-screen flex flex-col bg-background">
            <div className="absolute top-4 left-4 z-10">
                <Button variant="outline" size="icon" className="rounded-full shadow-lg" onClick={() => router.back()}>
                    <ArrowLeft className="w-5 h-5"/>
                </Button>
            </div>
            
             <div className="absolute top-4 right-4 z-10 w-[calc(100%-6rem)] md:w-auto md:min-w-96">
                <Card className="shadow-lg">
                    <CardContent className="p-2">
                         <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search for a destination..."
                                className="pl-10 border-0 focus-visible:ring-0 text-base"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
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

            <div className="flex-1">
                <LiveMap ref={liveMapRef} riderLocation={mapCenter} />
            </div>
            
            {selectedPlace && (
                <div className="absolute bottom-0 left-0 right-0 z-10 p-4">
                    <Card className="shadow-2xl animate-fade-in">
                        <CardHeader>
                            <CardTitle>{selectedPlace.display_name.split(',')[0]}</CardTitle>
                            <CardDescription>{selectedPlace.display_name}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <h4 className="text-sm font-semibold mb-2">Nearby Points of Interest</h4>
                             <div className="space-y-2">
                               {nearbyPOIs.map(poi => (
                                   <div key={poi.place_id} className="flex items-center gap-3 p-2 rounded-md bg-muted/50 text-sm">
                                       <Building className="w-4 h-4 text-muted-foreground"/>
                                       <div className="flex-1">
                                         <p className="font-medium">{poi.display_name.split(',')[0]}</p>
                                         <p className="text-xs text-muted-foreground">{poi.address.road || poi.address.suburb}</p>
                                       </div>
                                       <p className="text-xs font-semibold">{poi.lat.slice(0,6)}, {poi.lon.slice(0,6)}</p>
                                   </div>
                               ))}
                           </div>
                        </CardContent>
                        <CardFooter>
                            <Button size="lg" className="w-full bg-green-600 hover:bg-green-700">Choose This Destination</Button>
                        </CardFooter>
                    </Card>
                </div>
            )}
        </div>
    )
}
