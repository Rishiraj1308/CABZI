
'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Map, MapPin } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { searchPlace } from '@/lib/routing';
import { Skeleton } from '@/components/ui/skeleton';

const recentTrips = [
    {
        icon: MapPin,
        title: "Connaught Place",
        description: "New Delhi, Delhi",
        distance: "5.2 km",
        time: "15 min"
    },
    {
        icon: MapPin,
        title: "Indira Gandhi International Airport",
        description: "New Delhi, Delhi",
        distance: "18.7 km",
        time: "45 min"
    },
    {
        icon: MapPin,
        title: "Select Citywalk",
        description: "Saket, New Delhi",
        distance: "12.1 km",
        time: "30 min"
    },
]

export default function BookRidePage() {
    const router = useRouter();
    const [pickupAddress, setPickupAddress] = useState('Locating...');
    const [destination, setDestination] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // This hook fetches the user's real address but we will display static text.
    // The real address is used on the next page.
    const getAddressFromCoords = useCallback(async (lat: number, lon: number) => {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
            const data = await response.json();
            return data.display_name || 'Unknown Location';
        } catch (error) {
            console.error("Error fetching address:", error);
            return 'Could not fetch address';
        }
    }, []);

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    // We fetch the address to ensure it's ready for the next step,
                    // but we keep the UI text as "Current Location".
                    const { latitude, longitude } = position.coords;
                    const address = await getAddressFromCoords(latitude, longitude);
                    // The state `pickupAddress` is now just for display. The actual location
                    // is handled on the map page.
                    setPickupAddress('Current Location');
                },
                () => {
                    setPickupAddress('Location access denied');
                }
            );
        } else {
            setPickupAddress('Geolocation not supported');
        }
    }, [getAddressFromCoords]);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };
    
    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    useEffect(() => {
        if (destination.length < 3) {
            setSearchResults([]);
            return;
        }

        const handler = setTimeout(async () => {
            setIsSearching(true);
            const results = await searchPlace(destination);
            setSearchResults(results || []);
            setIsSearching(false);
        }, 300); // Debounce search

        return () => clearTimeout(handler);
    }, [destination]);

    const handleSelectDestination = (place: any) => {
        const destinationName = place.display_name.split(',')[0];
        setDestination(destinationName);
        setSearchResults([]);
        router.push(`/user/book/map?search=${encodeURIComponent(place.display_name)}`);
    }

    return (
        <motion.div 
            className="min-h-screen w-full flex flex-col bg-muted/30 overflow-hidden"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
        >
            <header className="p-4 relative bg-background dark:bg-gradient-to-br dark:from-primary dark:via-primary/90 dark:to-black text-foreground dark:text-primary-foreground">
                <div className="container mx-auto">
                    <motion.div variants={itemVariants}>
                        <Button variant="ghost" size="icon" className="hover:bg-black/10 dark:hover:bg-white/10" onClick={() => router.push('/user')}>
                            <ArrowLeft className="w-5 h-5"/>
                        </Button>
                    </motion.div>
                    <motion.div variants={itemVariants} className="pt-8 pb-20 text-left">
                        <h1 className="text-4xl font-bold">Fair Fares, Safer Roads.</h1>
                        <p className="opacity-80 mt-1 max-w-md">Book a ride that empowers drivers and protects you on every trip.</p>
                    </motion.div>
                </div>
            </header>

            <div className="flex-1 container mx-auto p-4 space-y-6 relative z-10 -mt-16">
                 <motion.div 
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3, type: 'spring' }}
                    className="space-y-6"
                >
                    <Card className="shadow-lg overflow-hidden">
                        <CardContent className="p-3 relative">
                            <div className="flex items-center gap-4 py-2 px-2 rounded-lg">
                                <div className="w-2.5 h-2.5 rounded-full bg-green-500 ring-2 ring-green-500/30"/>
                                {pickupAddress === 'Locating...' ? (
                                    <Skeleton className="h-5 w-48" />
                                ) : (
                                    <p className="font-semibold text-base text-muted-foreground truncate">Current Location</p>
                                )}
                            </div>
                            <div className="border-l-2 border-dotted border-border h-4 ml-[13px] my-1"></div>
                            <div className="flex items-center gap-4 py-2 px-2 rounded-lg">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-red-500/30"/>
                                <Input
                                    placeholder="Where to?"
                                    className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-base font-semibold p-0 h-auto"
                                    value={destination}
                                    onChange={(e) => setDestination(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && searchResults.length > 0 && handleSelectDestination(searchResults[0])}
                                />
                            </div>
                             <div className="absolute -right-4 -bottom-4 w-40 h-24 z-0">
                                <Image src="/car.svg" alt="Car illustration" layout="fill" objectFit="contain" className="opacity-60" data-ai-hint="car illustration"/>
                            </div>
                        </CardContent>
                    </Card>

                    {(isSearching || searchResults.length > 0) && (
                        <Card className="shadow-lg">
                            <CardContent className="p-2 space-y-1">
                                {isSearching ? (
                                    Array.from({length: 2}).map((_, i) => (
                                        <div key={i} className="p-2 space-y-2">
                                            <Skeleton className="h-5 w-3/4" />
                                            <Skeleton className="h-4 w-1/2" />
                                        </div>
                                    ))
                                ) : (
                                    searchResults.map(place => (
                                        <div key={place.place_id} onClick={() => handleSelectDestination(place)} className="p-2 rounded-md hover:bg-muted cursor-pointer">
                                            <p className="font-semibold text-sm">{place.display_name.split(',')[0]}</p>
                                            <p className="text-xs text-muted-foreground">{place.display_name.split(',').slice(1).join(',')}</p>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>
                    )}
                    
                    <div className="space-y-2 pt-6">
                        <h3 className="font-bold text-lg">Recent Trips</h3>
                        {recentTrips.map((trip, index) => (
                            <motion.div 
                                key={trip.title}
                                variants={itemVariants}
                                initial="hidden"
                                animate="visible"
                                transition={{delay: 0.5 + index * 0.1}}
                            >
                                <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-card cursor-pointer transition-colors">
                                    <div className="p-3 bg-card rounded-full border">
                                        <trip.icon className="w-5 h-5 text-muted-foreground" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold">{trip.title}</p>
                                        <p className="text-sm text-muted-foreground">{trip.description}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-semibold">{trip.distance}</p>
                                        <p className="text-xs text-muted-foreground">{trip.time}</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
}
