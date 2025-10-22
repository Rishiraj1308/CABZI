
'use client'

import React, { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { ArrowLeft, Star, MapPin, HeartHandshake, IndianRupee } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from '@/hooks/use-toast'
import { useFirebase } from '@/firebase/client-provider'
import { collection, addDoc, serverTimestamp, GeoPoint } from 'firebase/firestore'
import { getRoute, searchPlace } from '@/lib/tomtom'
import { RideData, ClientSession } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Card, CardContent } from './ui/card'
import { BikeIcon, AutoIcon, CabIcon } from './icons'
import { Skeleton } from './ui/skeleton'

interface LocationSelectorProps {
    pickup: { address: string; coords: { lat: number; lon: number } | null };
    setPickup: (value: { address: string; coords: { lat: number; lon: number } | null }) => void;
    destination: { address: string; coords: { lat: number; lon: number } | null };
    setDestination: (value: { address: string; coords: { lat: number; lon: number } | null }) => void;
    onBack: () => void;
    setActiveRide: (ride: RideData) => void;
    setRouteGeometry: (geometry: any) => void;
    currentUserLocation: { lat: number, lon: number } | null;
    liveMapRef: React.RefObject<any>;
    session: ClientSession | null;
}

interface RideTypeInfo {
    name: string;
    description: string;
    icon: React.ElementType;
    eta: string;
    fare: string;
    fareDetails?: { base: number; perKm: number; serviceFee: number; total: number; }
}

const fareConfig: {[key: string]: { base: number, perKm: number, serviceFee: number }} = {
    'Bike': { base: 20, perKm: 5, serviceFee: 0 },
    'Auto': { base: 30, perKm: 8, serviceFee: 0 }, 
    'Cab (Lite)': { base: 40, perKm: 10, serviceFee: 20 },
    'Cabzi Pink': { base: 50, perKm: 12, serviceFee: 30 },
}

const initialRideTypes: RideTypeInfo[] = [
    { name: 'Bike', description: 'Quick and affordable for solo trips', icon: BikeIcon, eta: '...', fare: '...' },
    { name: 'Auto', description: 'The classic three-wheeler for city travel', icon: AutoIcon, eta: '...', fare: '...' },
    { name: 'Cab (Lite)', description: 'Affordable sedans for everyday rides', icon: CabIcon, eta: '...', fare: '...' },
    { name: 'Cabzi Pink', description: 'A safe ride option exclusively for women, with women partners.', icon: HeartHandshake, eta: '...', fare: '...' },
]


export default function LocationSelector({
  pickup,
  setPickup,
  destination,
  setDestination,
  onBack,
  setActiveRide,
  setRouteGeometry,
  currentUserLocation,
  liveMapRef,
  session,
}: LocationSelectorProps) {

  const [isFindingRides, setIsFindingRides] = useState(false);
  const [rideTypes, setRideTypes] = useState<RideTypeInfo[]>(initialRideTypes);
  const [selectedRide, setSelectedRide] = useState('Cab (Lite)');
  const [showRideOptions, setShowRideOptions] = useState(false);
  const [isBooking, setIsBooking] = useState(false);

  const { toast } = useToast();
  const { db } = useFirebase();


  const getCoordinates = async (address: string): Promise<{ lat: number; lon: number } | null> => {
      if (!address || address.trim() === "") return null;
      try {
          const result: any = await searchPlace(address);
          if (result && result.results && result.results.length > 0) return result.results[0].position;
          return null;
      } catch (error) { return null; }
  };

  const handleGetRideInfo = async () => {
    if (!destination.address) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please enter a destination.' });
        return;
    }
    
    setIsFindingRides(true);
    setRideTypes(initialRideTypes);
    setRouteGeometry(null);
    
    let startCoords = pickup.coords;
    if (!startCoords) {
        if (currentUserLocation) {
            startCoords = currentUserLocation;
            if (liveMapRef.current) {
                const address = await liveMapRef.current.getAddress(startCoords.lat, startCoords.lon);
                setPickup({ address: address || 'Current Location', coords: startCoords });
            }
        } else {
             toast({ variant: 'destructive', title: 'Location Error', description: 'Could not determine your location.' });
             setIsFindingRides(false);
             return;
        }
    }

    const endCoords = destination.coords || (await getCoordinates(destination.address));
    if (!startCoords || !endCoords) {
        setIsFindingRides(false);
        return;
    }
    
    setDestination({ address: destination.address, coords: endCoords });

    const routeInfo: any = await getRoute(startCoords, endCoords);
    if (!routeInfo || !routeInfo.routes || routeInfo.routes.length === 0) {
        setIsFindingRides(false);
        return;
    }
    
    const route = routeInfo.routes[0];
    const distance = route.summary.lengthInMeters;

    setRouteGeometry(route.geometry);
    
    const updatedRideTypes = initialRideTypes.map(rt => {
        if (rt.name === 'Cabzi Pink' && session?.gender !== 'female') {
            return { ...rt, fare: 'N/A', eta: 'N/A' };
        }
        const config = fareConfig[rt.name];
        if (!config) return { ...rt };
        
        const calculatedFare = config.base + (config.perKm * (distance / 1000)) + config.serviceFee;
        const totalFare = Math.round(calculatedFare / 5) * 5;
        
        return { ...rt, fare: `₹${totalFare}`, fareDetails: { ...config, total: totalFare } };
    });
    
    setRideTypes(updatedRideTypes);
    setIsFindingRides(false);
    setShowRideOptions(true);
  }

  const handleConfirmRide = async () => {
    if (!pickup.coords || !destination.coords || !session || !db) return;
    
    const selectedRideInfo = rideTypes.find(rt => rt.name === selectedRide);
    if (!selectedRideInfo?.fareDetails) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not get ride fare details.' });
        return;
    }

    setIsBooking(true); // Disable button

    const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
    const rideData = {
        riderId: session.userId,
        riderName: session.name,
        riderGender: session.gender,
        pickup: { address: pickup.address, location: new GeoPoint(pickup.coords.lat, pickup.coords.lon) },
        destination: { address: destination.address, location: new GeoPoint(destination.coords.lat, destination.coords.lon) },
        rideType: selectedRide,
        status: 'searching' as const,
        fare: selectedRideInfo.fareDetails.total,
        otp: generatedOtp,
        createdAt: serverTimestamp(),
    };

    try {
        const docRef = await addDoc(collection(db, 'rides'), rideData);
        setActiveRide({ id: docRef.id, ...rideData } as RideData);
        localStorage.setItem('activeRideId', docRef.id);
    } catch (error) {
        console.error("Error creating ride:", error);
        toast({ variant: 'destructive', title: 'Booking Failed' });
        setIsBooking(false); // Re-enable button on failure
    }
  };


  return (
    <div className="p-4">
      <div className="relative mb-4">
        <Button onClick={() => { onBack(); setShowRideOptions(false); }} variant="ghost" size="icon" className="absolute top-1/2 -translate-y-1/2 left-0 h-8 w-8">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="pl-10 pr-6">
            <div className="relative">
                <Input 
                    value={pickup.address}
                    onChange={e => setPickup({ ...pickup, address: e.target.value })}
                    placeholder="Current Location"
                    className="bg-muted border-0 focus-visible:ring-0 text-base font-semibold"
                />
            </div>
             <div className="border-l-2 border-dotted border-border h-4 ml-[13px] my-1"></div>
             <div className="relative">
                <Input 
                    value={destination.address}
                    onChange={(e) => setDestination({ address: e.target.value, coords: null })}
                    placeholder="Where to?"
                    className="bg-muted border-primary focus-visible:ring-primary text-base font-semibold"
                    onKeyDown={(e) => e.key === 'Enter' && handleGetRideInfo()}
                />
             </div>
        </div>
      </div>
      
        {!showRideOptions ? (
             <Tabs defaultValue="suggested" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="recent">Recent</TabsTrigger>
                    <TabsTrigger value="suggested">Suggested</TabsTrigger>
                    <TabsTrigger value="saved">Saved</TabsTrigger>
                </TabsList>
            </Tabs>
        ) : (
            <div className="space-y-2">
                 <div className="grid grid-cols-4 gap-2">
                    {rideTypes.map(rt => (
                        <Card 
                          key={rt.name} 
                          onClick={() => rt.fare !== 'N/A' && setSelectedRide(rt.name)}
                          className={cn("p-2 text-center cursor-pointer", selectedRide === rt.name && 'ring-2 ring-primary', rt.fare === 'N/A' && 'opacity-50 cursor-not-allowed')}
                        >
                            <rt.icon className="w-8 h-8 mx-auto mb-1 text-foreground" />
                            <p className="text-xs font-semibold">{rt.name}</p>
                            {isFindingRides ? <Skeleton className="h-4 w-10 mx-auto mt-1"/> : <p className="text-xs font-bold">{rt.fare}</p>}
                        </Card>
                    ))}
                 </div>
                 <Button className="w-full" size="lg" onClick={handleConfirmRide} disabled={isFindingRides || isBooking}>
                     {isBooking ? 'Requesting Ride...' : `Confirm ${selectedRide}`}
                 </Button>
            </div>
        )}

    </div>
  )
}
