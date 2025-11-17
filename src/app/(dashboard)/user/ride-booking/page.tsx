
'use client'

import React, { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Map, MapPin, Calendar as CalendarIcon, Clock, Car } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { getRoute, searchPlace } from '@/lib/routing'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Label } from '@/components/ui/label'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'


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

const timeSlots = [
  '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'
]


export default function BookRidePage() {
    const router = useRouter();
    const { toast } = useToast();
    const [destination, setDestination] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [currentUserLocation, setCurrentUserLocation] = useState<{ lat: number, lon: number } | null>(null);
    
    // State for scheduling
    const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
    const [scheduledDate, setScheduledDate] = useState<Date | undefined>(new Date());
    const [scheduledTime, setScheduledTime] = useState('');

    useEffect(() => {
      // Get user's current location on mount
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setCurrentUserLocation({
              lat: position.coords.latitude,
              lon: position.coords.longitude,
            });
          },
          () => {
            toast({
              variant: 'destructive',
              title: 'Location Access Denied',
              description: 'Distance and ETA cannot be calculated without your location.',
            });
          }
        );
      }
    }, [toast]);


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
            
            if (currentUserLocation && results) {
                // For each result, fetch route info to get distance and time
                const resultsWithRouteInfo = await Promise.all(
                    results.map(async (place: any) => {
                        try {
                            const routeData = await getRoute(
                                currentUserLocation, 
                                { lat: parseFloat(place.lat), lon: parseFloat(place.lon) }
                            );
                            if (routeData && routeData.routes && routeData.routes.length > 0) {
                                const route = routeData.routes[0];
                                return {
                                    ...place,
                                    distance: route.distance / 1000, // in km
                                    duration: Math.round(route.duration / 60), // in minutes
                                };
                            }
                        } catch (error) {
                            // If routing fails for one result, just return the original place
                            return place;
                        }
                        return place;
                    })
                );
                setSearchResults(resultsWithRouteInfo);
            } else {
                setSearchResults(results || []);
            }
            setIsSearching(false);
        }, 500); // Debounce search

        return () => clearTimeout(handler);
    }, [destination, currentUserLocation]);

    const handleSelectDestination = (place: any) => {
        const destinationName = place.display_name.split(',')[0];
        setDestination(destinationName);
        setSearchResults([]);
        router.push(`/user/ride-map?search=${encodeURIComponent(place.display_name)}`);
    }
    
    const handleConfirmSchedule = () => {
        if (!scheduledDate || !scheduledTime) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select a date and time.' });
            return;
        }
        
        toast({
            title: 'Ride Scheduled!',
            description: `Your ride has been scheduled for ${format(scheduledDate, 'PPP')} at ${scheduledTime}.`,
            className: 'bg-green-600 text-white border-green-600'
        });
        
        setIsScheduleDialogOpen(false);
        setScheduledDate(new Date());
        setScheduledTime('');
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
                         <Button variant="outline" onClick={() => router.push('/user/ride-map')}>
                            <Map className="w-4 h-4 mr-2"/> Map
                         </Button>
                    </motion.div>
                    <motion.div variants={itemVariants} className="pt-8 pb-20 flex justify-between items-end">
                        <div>
                             <h1 className="text-4xl font-bold">Transport</h1>
                             <p className="text-muted-foreground mt-1 max-w-md">Wherever you're going, let's get you there!</p>
                        </div>
                        <svg viewBox="0 0 512 512" className="w-24 h-24 hidden sm:block">
                            <defs>
                                <linearGradient id="car-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style={{ stopColor: '#22c55e', stopOpacity: 1 }} />
                                <stop offset="100%" style={{ stopColor: '#16a34a', stopOpacity: 1 }} />
                                </linearGradient>
                            </defs>
                            <path fill="url(#car-gradient)" d="M496 192h-22.33a111.13 111.13 0 00-19.1-33.07c-25.22-25.22-68.33-38.22-118.82-38.82a242.1 242.1 0 00-47.5.8C252.75 125.7 208 160 208 160s-32.67-48-80-48c-40 0-80 24-80 64-40 32-40 96-40 96s16 16 32 16h400c16 0 16-16 16-16s0-56-16-80zM80 288c-17.67 0-32 14.33-32 32s14.33 32 32 32 32-14.33 32-32-14.33-32-32-32zm352 0c-17.67 0-32 14.33-32 32s14.33 32 32 32 32-14.33 32-32-14.33-32-32-32z" />
                        </svg>
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
                            <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline">
                                        <CalendarIcon className="w-4 h-4 mr-2"/> Later
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Schedule a Ride</DialogTitle>
                                        <DialogDescription>Choose a future date and time for your pickup.</DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-6 py-4">
                                        <div className="space-y-2">
                                            <Label>Select Date</Label>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full justify-start text-left font-normal",
                                                        !scheduledDate && "text-muted-foreground"
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {scheduledDate ? format(scheduledDate, "PPP") : <span>Pick a date</span>}
                                                </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0"><Calendar
                                                    mode="single"
                                                    selected={scheduledDate}
                                                    onSelect={setScheduledDate}
                                                    initialFocus
                                                    disabled={(d) => d < new Date(new Date().setDate(new Date().getDate()))}
                                                /></PopoverContent>
                                            </Popover>
                                        </div>
                                         <div className="space-y-2">
                                            <Label>Select Time Slot</Label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {timeSlots.map(slot => (
                                                    <Button 
                                                        key={slot} 
                                                        variant={scheduledTime === slot ? 'default' : 'outline'}
                                                        onClick={() => setScheduledTime(slot)}
                                                    >
                                                        {slot}
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button onClick={handleConfirmSchedule} disabled={!scheduledDate || !scheduledTime}>Schedule Ride</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
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
                                                 {place.distance && place.duration && (
                                                    <div className="text-xs text-primary font-semibold flex items-center gap-2 mt-1">
                                                       <div className="flex items-center gap-1"><Car className="w-3 h-3"/> {place.distance.toFixed(1)} km</div>
                                                       <div className="flex items-center gap-1"><Clock className="w-3 h-3"/> ~{place.duration} min</div>
                                                    </div>
                                                 )}
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
