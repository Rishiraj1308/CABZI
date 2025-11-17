
'use client'

import React, { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Map, MapPin, Calendar as CalendarIcon, Clock, Car } from 'lucide-react'
import { motion } from 'framer-motion'
import { getRoute, searchPlace } from '@/lib/routing'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Label } from '@/components/ui/label'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import type { RideData, ClientSession } from '@/lib/types'
import { useFirebase } from '@/lib/firebase/client-provider'
import { GeoPoint, addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { useActiveRequest } from '@/features/user/components/active-request-provider';


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

interface LocationSuggestion {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  distance?: number;
  duration?: number;
}

function BookRidePageComponent() {
    const router = useRouter();
    const { setActiveRide } = useActiveRequest() as any;
  
    const [destination, setDestination] = useState('')
    const [searchResults, setSearchResults] = useState<LocationSuggestion[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [currentUserLocation, setCurrentUserLocation] = useState<{ lat: number, lon: number } | null>(null)
  
    const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false)
    const [scheduledDate, setScheduledDate] = useState<Date | undefined>(new Date())
    const [scheduledTime, setScheduledTime] = useState('')
  
    useEffect(() => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setCurrentUserLocation({
              lat: pos.coords.latitude,
              lon: pos.coords.longitude,
            })
          },
          () => {
            toast.error('Location Access Denied', {
              description: 'Distance and ETA cannot be calculated without your location.',
            })
          }
        )
      }
    }, [])
  
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
        setSearchResults([])
        return
      }
  
      const handler = setTimeout(async () => {
        setIsSearching(true)
        const results: LocationSuggestion[] = await searchPlace(destination)
  
        if (currentUserLocation && results) {
          const enriched = await Promise.all(
            results.map(async (place: LocationSuggestion) => {
              try {
                const route = await getRoute(
                  currentUserLocation,
                  { lat: parseFloat(place.lat), lon: parseFloat(place.lon) }
                )
  
                if (route?.routes?.[0]) {
                  const r = route.routes[0]
                  return {
                    ...place,
                    distance: r.distance / 1000,
                    duration: Math.round(r.duration / 60),
                  }
                }
              } catch { }
  
              return place
            })
          )
  
          setSearchResults(enriched)
        } else {
          setSearchResults(results || [])
        }
  
        setIsSearching(false)
      }, 500)
  
      return () => clearTimeout(handler)
    }, [destination, currentUserLocation])
  
    const handleSelectDestination = (place: any) => {
      const destinationName = place.display_name.split(',')[0]
      setDestination(destinationName)
      setSearchResults([])
      router.push(`/user/ride-map?search=${encodeURIComponent(place.display_name)}`)
    }
  
    const handleConfirmSchedule = () => {
      if (!scheduledDate || !scheduledTime) {
        toast.error('Error', {
          description: 'Please select date and time.'
        })
        return
      }
  
      toast.success('Ride Scheduled!', {
        description: `Your ride is scheduled for ${format(scheduledDate, 'PPP')} at ${scheduledTime}.`,
      })
  
      setIsScheduleDialogOpen(false)
      setScheduledDate(new Date())
      setScheduledTime('')
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
            
            <motion.div variants={itemVariants} className="pt-8 pb-20">
              <h1 className="text-4xl font-bold">Book a Ride</h1>
              <p className="text-muted-foreground mt-1 max-w-md">Enter your destination to see fare estimates and book a ride instantly.</p>
            </motion.div>
          </div>
        </header>
  
        <div className="flex-1 container mx-auto p-4 space-y-6 relative z-10 -mt-16">
          <motion.div initial={{ y: 50 }} animate={{ y: 0 }} transition={{ delay: 0.3 }} className="space-y-6">
            
            <Card className="shadow-lg overflow-hidden">
              <CardContent className="p-3 flex items-center gap-2">
                <div className="relative flex-1">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-red-500" />
                  <Input
                    placeholder="Where to?"
                    className="border-0 bg-transparent text-base font-semibold p-0 h-12 pl-10 focus-visible:ring-0 focus-visible:ring-offset-0"
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
                      
                      <div>
                        <Label>Select Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {scheduledDate ? format(scheduledDate, "PPP") : "Pick a date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent><Calendar mode="single" selected={scheduledDate} onSelect={setScheduledDate} initialFocus/></PopoverContent>
                        </Popover>
                      </div>
  
                      <div>
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
                      <Button onClick={handleConfirmSchedule}>Schedule Ride</Button>
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
                      <div 
                        key={place.place_id}
                        onClick={() => handleSelectDestination(place)}
                        className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                      >
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
  
              {recentTrips.map((trip, i) => (
                <motion.div key={trip.title} variants={itemVariants}>
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
    )
  }
  
  export default function Page() {
    return (
      <Suspense fallback={<Skeleton className="h-screen w-full" />}>
        <BookRidePageComponent />
      </Suspense>
    );
  }

    