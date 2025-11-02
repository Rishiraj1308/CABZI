
'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Map, MapPin, Calendar } from 'lucide-react';
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
    },
    {
        icon: MapPin,
        title: "Indira Gandhi International Airport",
        description: "New Delhi, Delhi",
    },
    {
        icon: MapPin,
        title: "Select Citywalk",
        description: "Saket, New Delhi",
    },
]

export default function BookRidePage() {
    const router = useRouter();
    const [destination, setDestination] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

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
            <header className="bg-background p-4 relative">
                <div className="container mx-auto">
                    <motion.div variants={itemVariants} className="flex justify-between items-center">
                        <Button variant="ghost" size="icon" className="hover:bg-muted" onClick={() => router.push('/user')}>
                            <ArrowLeft className="w-5 h-5"/>
                        </Button>
                         <Button variant="outline">
                            <Map className="w-4 h-4 mr-2"/> Map
                         </Button>
                    </motion.div>
                    <motion.div variants={itemVariants} className="pt-8 pb-20 flex justify-between items-end">
                        <div>
                             <h1 className="text-4xl font-bold">Transport</h1>
                             <p className="text-muted-foreground mt-1 max-w-md">Wherever you're going, let's get you there!</p>
                        </div>
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
                        <CardContent className="p-3 flex items-center gap-2">
                             <div className="relative flex-1">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-red-500" />
                                <Input
                                    placeholder="Where to?"
                                    className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-base font-semibold p-0 h-12 pl-10"
                                    value={destination}
                                    onChange={(e) => setDestination(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && searchResults.length > 0 && handleSelectDestination(searchResults[0])}
                                />
                            </div>
                            <Button variant="outline">
                                <Calendar className="w-4 h-4 mr-2"/> Later
                            </Button>
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
                                        <div key={place.place_id} onClick={() => handleSelectDestination(place)} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors">
                                            <div className="p-2 bg-muted rounded-full border">
                                                <MapPin className="w-4 h-4 text-muted-foreground" />
                                            </div>
                                            <div className="flex-1">
                                                 <p className="font-semibold text-sm">{place.display_name.split(',')[0]}</p>
                                                 <p className="text-xs text-muted-foreground" dangerouslySetInnerHTML={{ __html: place.display_name.split(',').slice(1).join(', ') }} />
                                            </div>
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
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
}
