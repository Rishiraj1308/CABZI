
'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Map, MapPin, Calendar as CalendarIcon, Clock, Car } from 'lucide-react';
import { motion } from 'framer-motion';
import { getRoute, searchPlace } from '@/lib/routing';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { RideData, ClientSession } from '@/lib/types';
import { useFirebase } from '@/lib/firebase/client-provider';
import { GeoPoint, addDoc, collection, serverTimestamp } from 'firebase/firestore';


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

interface RideBookingSheetProps {
  session: ClientSession | null;
  pickup: string | null;
  drop: string | null;
  setRide: (ride: RideData) => void;
}

interface LocationSuggestion {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface VehicleOption {
  id: 'Bike' | 'Auto' | 'Cab' | 'Curocity Pink';
  name: string;
  icon: React.ElementType;
  fare: number | null;
  eta: number | null;
}

const RideBookingSheet: React.FC<RideBookingSheetProps> = ({ session, pickup, drop, setRide }) => {
  const router = useRouter();
  const { db } = useFirebase();

  const [step, setStep] = useState<'input' | 'confirm' | 'searching'>('input');
  
  const [pickupAddress, setPickupAddress] = useState(pickup || '');
  const [dropAddress, setDropAddress] = useState(drop || '');
  const [debouncedPickup] = useDebounce(pickupAddress, 500);
  const [debouncedDrop] = useDebounce(dropAddress, 500);
  
  const [pickupSuggestions, setPickupSuggestions] = useState<LocationSuggestion[]>([]);
  const [dropSuggestions, setDropSuggestions] = useState<LocationSuggestion[]>([]);
  
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [dropCoords, setDropCoords] = useState<{ lat: number; lon: number } | null>(null);

  const [isFetchingFares, setIsFetchingFares] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);

  const [vehicles, setVehicles] = useState<VehicleOption[]>([
    { id: 'Bike', name: 'Bike', icon: Bike, fare: null, eta: null },
    { id: 'Auto', name: 'Auto', icon: Car, fare: null, eta: null },
    { id: 'Cab', name: 'Cab', icon: Car, fare: null, eta: null },
    { id: 'Curocity Pink', name: 'Curocity Pink', icon: HeartHandshake, fare: null, eta: null },
  ]);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleOption['id'] | null>(null);
  
   useEffect(() => {
    if (debouncedPickup.length > 2) {
      fetchSuggestions(debouncedPickup, setPickupSuggestions);
    } else {
      setPickupSuggestions([]);
    }
  }, [debouncedPickup]);

  useEffect(() => {
    if (debouncedDrop.length > 2) {
      fetchSuggestions(debouncedDrop, setDropSuggestions);
    } else {
      setDropSuggestions([]);
    }
  }, [debouncedDrop]);

  useEffect(() => {
    // If drop address is passed via URL, geocode it and calculate fares
    if (drop && !dropCoords) {
      fetchSuggestions(drop, (suggestions) => {
        if (suggestions.length > 0) {
            handleSelectSuggestion(suggestions[0], 'drop');
        }
      });
    }
  }, [drop]);

  const fetchSuggestions = async (query: string, setter: React.Dispatch<React.SetStateAction<LocationSuggestion[]>>) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&limit=5`);
      const data = await response.json();
      setter(data);
    } catch (error) {
      console.error("Failed to fetch suggestions", error);
    }
  };

  const handleSelectSuggestion = (suggestion: LocationSuggestion, type: 'pickup' | 'drop') => {
    const coords = { lat: parseFloat(suggestion.lat), lon: parseFloat(suggestion.lon) };
    if (type === 'pickup') {
      setPickupAddress(suggestion.display_name);
      setPickupCoords(coords);
      setPickupSuggestions([]);
    } else {
      setDropAddress(suggestion.display_name);
      setDropCoords(coords);
      setDropSuggestions([]);
    }
  };
  
  const handleFindRides = async () => {
    // For now, assume pickup is current location if not set
    if (!pickupCoords) {
        // A better implementation would get user's current location here
        toast.error('Pickup location required', { description: 'Please set a pickup location.' });
        return;
    }
    if (!dropCoords) {
      toast.error('Locations required', { description: 'Please select a drop location.' });
      return;
    }
    setIsFetchingFares(true);
    try {
      const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${pickupCoords.lon},${pickupCoords.lat};${dropCoords.lon},${dropCoords.lat}?overview=false`);
      const data = await response.json();
      if (data.routes && data.routes[0]) {
        const route = data.routes[0];
        const distKm = route.distance / 1000;
        setDistance(distKm);
        
        setVehicles(prev => prev.map(v => ({
          ...v,
          fare: calculateFare(v.id, distKm),
          eta: Math.round(distKm * 2.5) // Simplified ETA
        })));

        setStep('confirm');
        router.push(`/user/ride-map?pickup=${encodeURIComponent(pickupAddress)}&drop=${encodeURIComponent(dropAddress)}`);
      }
    } catch (error) {
      toast.error('Could not get route', { description: 'Failed to calculate fares. Please try again.' });
    } finally {
      setIsFetchingFares(false);
    }
  };

  const calculateFare = (vehicleType: VehicleOption['id'], dist: number): number => {
    let base = 0;
    let perKm = 0;
    switch(vehicleType) {
        case 'Bike': base = 25; perKm = 8; break;
        case 'Auto': base = 40; perKm = 12; break;
        case 'Cab': base = 60; perKm = 18; break;
        case 'Curocity Pink': base = 70; perKm = 20; break;
    }
    return Math.round(base + (perKm * dist) + (dist * 0.2 * 5)); // Include 20% traffic buffer
  };

  const handleConfirmRide = async () => {
    if (!selectedVehicle || !session || !db) {
        toast.error('Please select a vehicle');
        return;
    }
    const vehicle = vehicles.find(v => v.id === selectedVehicle);
    const finalPickupCoords = pickupCoords || {lat: 28.6139, lon: 77.2090}; // Default fallback
    
    if (!vehicle || !vehicle.fare || !finalPickupCoords || !dropCoords) {
        toast.error('Error confirming ride');
        return;
    }
    
    setStep('searching');

    const rideDoc = {
      riderId: session.userId,
      riderName: session.name,
      riderGender: session.gender,
      pickup: {
        address: pickupAddress || 'Current Location',
        location: new GeoPoint(finalPickupCoords.lat, finalPickupCoords.lon)
      },
      destination: {
        address: dropAddress,
        location: new GeoPoint(dropCoords.lat, dropCoords.lon)
      },
      rideType: vehicle.name,
      status: 'searching' as const,
      fare: vehicle.fare,
      otp: Math.floor(1000 + Math.random() * 9000).toString(),
      createdAt: serverTimestamp(),
      rejectedBy: [],
    };
    
    try {
      const docRef = await addDoc(collection(db, 'rides'), rideDoc);
      localStorage.setItem('activeRideId', docRef.id);
      setRide({ id: docRef.id, ...rideDoc } as RideData); // Update parent state
    } catch (error) {
      console.error("Error creating ride document: ", error);
      toast.error('Failed to book ride', { description: 'Please try again later.' });
      setStep('confirm'); // Go back to confirm step on error
    }
  };


  return (
    <Sheet open={true} onOpenChange={(open) => !open && router.push('/user/ride-booking')}>
      <SheetContent side="bottom" className="max-h-[90vh] rounded-t-2xl flex flex-col">
        <SheetHeader>
          <div className="flex items-center">
            {step !== 'input' && (
                <Button variant="ghost" size="icon" onClick={() => setStep('input')} className="mr-2">
                    <ArrowLeft/>
                </Button>
            )}
            <div>
            <SheetTitle>
                {step === 'input' && "Plan your ride"}
                {step === 'confirm' && "Choose your ride"}
                {step === 'searching' && "Finding your ride..."}
            </SheetTitle>
            <SheetDescription>
                {step === 'input' && "Enter your pickup and drop-off locations."}
                {step === 'confirm' && "Select a vehicle that suits your needs."}
                {step === 'searching' && "Please wait while we connect you to a nearby partner."}
            </SheetDescription>
            </div>
          </div>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto pr-6">
        {step === 'input' && (
          <div className="space-y-4 py-4">
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input value={pickupAddress} onChange={e => setPickupAddress(e.target.value)} placeholder="Pickup location" className="pl-10 h-11"/>
              {pickupSuggestions.length > 0 && (
                <Card className="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto">
                  {pickupSuggestions.map(s => <div key={s.place_id} onClick={() => handleSelectSuggestion(s, 'pickup')} className="p-2 text-sm hover:bg-muted cursor-pointer">{s.display_name}</div>)}
                </Card>
              )}
            </div>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input value={dropAddress} onChange={e => setDropAddress(e.target.value)} placeholder="Drop-off location" className="pl-10 h-11"/>
              {dropSuggestions.length > 0 && (
                <Card className="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto">
                  {dropSuggestions.map(s => <div key={s.place_id} onClick={() => handleSelectSuggestion(s, 'drop')} className="p-2 text-sm hover:bg-muted cursor-pointer">{s.display_name}</div>)}
                </Card>
              )}
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-3 py-4">
            {isFetchingFares ? (
                Array.from({length: 4}).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
            ) : (
                vehicles.map((vehicle) => (
                    <Card 
                        key={vehicle.id} 
                        onClick={() => setSelectedVehicle(vehicle.id)}
                        className={`cursor-pointer transition-all ${selectedVehicle === vehicle.id ? 'ring-2 ring-primary' : 'hover:bg-muted'}`}
                    >
                        <CardContent className="p-3 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <vehicle.icon className="w-8 h-8 text-primary" />
                                <div>
                                    <p className="font-bold">{vehicle.name}</p>
                                    <p className="text-xs text-muted-foreground">{vehicle.eta} min away</p>
                                </div>
                            </div>
                            <p className="font-semibold text-lg">₹{vehicle.fare}</p>
                        </CardContent>
                    </Card>
                ))
            )}
          </div>
        )}

        {step === 'searching' && (
          <div className="flex flex-col items-center justify-center h-full py-8">
            <SearchingIndicator partnerType="path" />
            <p className="mt-4 font-semibold text-lg">Connecting you to a driver...</p>
            <p className="text-sm text-muted-foreground">This may take a moment.</p>
          </div>
        )}
        </div>


        {step !== 'searching' && (
            <SheetFooter>
            {step === 'input' ? (
                <Button onClick={handleFindRides} disabled={!dropAddress || isFetchingFares} className="w-full">
                    {isFetchingFares ? "Calculating..." : "Find Rides"}
                </Button>
            ) : (
                <Button onClick={handleConfirmRide} disabled={!selectedVehicle} className="w-full">
                    Confirm {selectedVehicle}
                </Button>
            )}
            </SheetFooter>
        )}

      </SheetContent>
    </Sheet>
  );
};

export default RideBookingSheet;
