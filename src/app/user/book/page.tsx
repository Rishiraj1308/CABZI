
'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Search, MapPin, MoreVertical, LocateFixed } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import { searchPlace } from '@/lib/routing';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

const LiveMap = dynamic(() => import('@/components/live-map'), {
    ssr: false,
    loading: () => <div className="w-full h-full bg-muted flex items-center justify-center"><p>Loading Map...</p></div>
});


interface Place {
    place_id: string;
    display_name: string;
    lat: string;
    lon: string;
}

export default function BookRidePage() {
    const router = useRouter();
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Place[]>([]);
    const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const mapRef = useRef<any>(null);

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
    };
    
    const handleLocateMe = () => {
        if(mapRef.current) {
            mapRef.current.locate();
        }
    }

    return (
    <div className="h-screen w-screen flex flex-col bg-muted relative">
        {/* Map Background */}
        <div className="absolute inset-0 z-0">
             <LiveMap ref={mapRef} />
        </div>

        {/* UI Overlay */}
        <div className="absolute inset-0 z-10 flex flex-col pointer-events-none">
            {/* Header */}
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
            
            {/* Search Results */}
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

            {/* Bottom Sheet for Confirmation */}
            {selectedPlace && (
                <div className="mt-auto pointer-events-auto">
                    <Card className="rounded-b-none rounded-t-2xl shadow-2xl">
                        <CardHeader>
                            <CardTitle className="flex justify-between items-start">
                                <div>
                                    <p className="text-xl">{selectedPlace.display_name.split(',')[0]}</p>
                                    <p className="text-xs text-muted-foreground font-normal">{selectedPlace.display_name.split(',').slice(1).join(',')}</p>
                                </div>
                                 <Button variant="ghost" size="icon"><MoreVertical className="w-5 h-5"/></Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted cursor-pointer">
                                <MapPin className="w-6 h-6 text-primary mt-1"/>
                                <div>
                                    <p className="font-semibold">South Wing Drop-off (Departure)</p>
                                    <p className="text-sm text-muted-foreground">0.0km</p>
                                </div>
                             </div>
                             <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted cursor-pointer">
                                <MapPin className="w-6 h-6 text-green-500 mt-1"/>
                                <div>
                                    <p className="font-semibold">Grab Pickup (Arrival Bays A1-A3)</p>
                                    <p className="text-sm text-muted-foreground">0.2km</p>
                                </div>
                             </div>
                        </CardContent>
                        <CardFooter>
                            <Button size="lg" className="w-full bg-green-600 hover:bg-green-700">Choose This Destination</Button>
                        </CardFooter>
                    </Card>
                </div>
            )}
        </div>
    </div>
  );
}
