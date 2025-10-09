
'use client'

import React, { useState, useEffect, type SVGProps, useRef, useCallback } from 'react'
import Image from 'next/image'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { BikeIcon, AutoIcon, CabIcon, TotoIcon, HeartHandIcon } from '@/components/icons'
import { Star, Phone, LocateFixed, Shield, LifeBuoy, Share2, MapPin, ArrowRight, Send, ArrowLeft, KeyRound, IndianRupee, Clock, Info, Home, Briefcase, History, User, Heart, Gift, Building2, Plane, Users, Check, QrCode, Wrench, Ambulance, ScanLine, Hospital, MessageSquare, Search, CircleDot } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import dynamic from 'next/dynamic'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogClose, DialogFooter } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet"
import { Label } from '@/components/ui/label'
import { db } from '@/lib/firebase'
import { collection, addDoc, serverTimestamp, onSnapshot, doc, GeoPoint, query, where, getDocs, updateDoc, getDoc, deleteDoc } from 'firebase/firestore'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { QrReader } from 'react-qr-reader';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from "@/components/ui/alert-dialog"
import EmergencyButtons from '@/components/EmergencyButtons'
import { useRider } from './layout'
import { MotionDiv } from '@/components/ui/motion-div'
import { AnimatePresence } from 'framer-motion'
import SearchingIndicator from '@/components/ui/searching-indicator'


const LiveMap = dynamic(() => import('@/components/live-map'), { 
    ssr: false,
    loading: () => <div className="w-full h-full bg-muted flex items-center justify-center"><p>Loading Map...</p></div>
});
const RideStatus = dynamic(() => import('@/components/ride-status'), { ssr: false });


interface RideTypeInfo {
    name: string;
    description: string;
    icon: React.ElementType;
    eta: string;
    fare: string;
    fareDetails?: {
        base: number;
        perKm: number;
        serviceFee: number;
        total: number;
    }
}

interface LocationWithCoords {
    address: string;
    coords: { lat: number; lon: number } | null;
}

interface HospitalInfo {
    id: string;
    name: string;
    address: string;
    distance: number;
    location: GeoPoint;
    baseFare?: number;
    perKmRate?: number;
}

const initialRideTypes: RideTypeInfo[] = [
  { name: 'Bike', description: 'Quick and affordable for solo trips', icon: BikeIcon, eta: '...', fare: '...' },
  { name: 'Auto', description: 'The classic three-wheeler for city travel', icon: AutoIcon, eta: '...', fare: '...' },
  { name: 'Cab (Lite)', description: 'Affordable sedans for everyday rides', icon: CabIcon, eta: '...', fare: '...' },
  { name: 'Cab (Prime)', description: 'Comfortable sedans with top drivers', icon: CabIcon, eta: '...', fare: '...' },
  { name: 'Cab (XL)', description: 'SUVs for groups of 6 or more', icon: CabIcon, eta: '...', fare: '...' }, 
  { name: 'Toto', description: 'Eco-friendly local e-rickshaws', icon: TotoIcon, eta: '...', fare: '...' },
  { name: 'Cabzi Pink', description: 'A safe ride option exclusively for women, with women partners.', icon: HeartHandIcon, eta: '...', fare: '...' },
]

const fareConfig: {[key: string]: { base: number, perKm: number, serviceFee: number, perMinute?: number }} = {
    'Bike': { base: 20, perKm: 5, serviceFee: 0 },
    'Auto': { base: 30, perKm: 8, serviceFee: 0 }, 
    'Cab (Lite)': { base: 40, perKm: 10, serviceFee: 20 },
    'Cab (Prime)': { base: 50, perKm: 12, serviceFee: 30 },
    'Cab (XL)': { base: 60, perKm: 15, serviceFee: 40 }, 
    'Toto': { base: 15, perKm: 4, serviceFee: 0 },
    'Cabzi Pink': { base: 50, perKm: 12, serviceFee: 30 },
    'Ambulance': { base: 500, perKm: 20, serviceFee: 0, perMinute: 5}, // Default, can be overridden
}

interface RideData {
    id: string;
    pickup: { address: string; location: { latitude: number; longitude: number; } };
    destination: { address: string; location: { latitude: number; longitude: number; } };
    status: "searching" | "accepted" | "in-progress" | "completed" | "cancelled_by_driver" | "cancelled_by_rider" | "payment_pending";
    otp?: string;
    driverDetails?: {
        name: string;
        vehicle: string;
        rating: number;
        photoUrl: string;
        phone: string;
    };
    driverEta?: number | null;
    fare?: number;
}

interface AmbulanceCase {
    id: string;
    caseId: string;
    riderId: string;
    riderName: string;
    phone: string;
    location: GeoPoint;
    status: 'pending' | 'accepted' | 'onTheWay' | 'arrived' | 'inTransit' | 'completed' | 'cancelled_by_rider' | 'cancelled_by_partner' | 'cancelled_by_admin';
    otp?: string;
    assignedPartner?: {
        id: string;
        name: string;
        phone: string;
        ambulanceName?: string;
        photoUrl?: string;
    } | null;
    hospitalPreference?: 'Govt Hospital' | 'Private Hospital' | "Don't Know" | string; // Updated to allow specific hospital ID
    hospitalLocation?: GeoPoint | null;
    estimatedFare?: number;
    createdAt: any;
    rejectedBy?: string[];
    partnerEta?: number | null;
    hospitalEta?: number | null;
    partnerLocation?: GeoPoint | null;
    severity?: 'Non-Critical' | 'Serious' | 'Critical';
}

export default function RiderPage() {
  const [selectedRide, setSelectedRide] = useState('Cab (Prime)')
  const [rideTypes, setRideTypes] = useState<RideTypeInfo[]>(initialRideTypes)
  const [rating, setRating] = useState(0);
  const [pickup, setPickup] = useState<LocationWithCoords>({ address: '', coords: null });
  const [destination, setDestination] = useState<LocationWithCoords>({ address: '', coords: null });
  const [estimatedDistance, setEstimatedDistance] = useState(0);
  const [isFindingRides, setIsFindingRides] = useState(false);
  const [view, setView] = useState<'hidden' | 'planning' | 'options'>('hidden');
  const [activeRide, setActiveRide] = useState<RideData | null>(null);
  const [activeAmbulanceCase, setActiveAmbulanceCase] = useState<AmbulanceCase | null>(null);
  const [routeGeometry, setRouteGeometry] = useState<any>(null);
  const liveMapRef = useRef<any>(null);
  const { session } = useRider();
  const [nearbyDrivers, setNearbyDrivers] = useState<number | null>(null);
  const [driverLiveLocation, setDriverLiveLocation] = useState<{lat: number, lon: number} | null>(null);
  const lastApiCallTimestamp = useRef<number>(0);
  const notificationSoundRef = useRef<HTMLAudioElement | null>(null);
  const [isRequestingSos, setIsRequestingSos] = useState(false);
  const [isFocused, setIsFocused] = useState<'pickup' | 'destination' | null>(null);

  const { toast } = useToast()
  
  useEffect(() => {
    notificationSoundRef.current = new Audio('/sounds/notification.mp3');

    const checkActiveRide = async () => {
        const rideId = localStorage.getItem('activeRideId');
        if (rideId && db) {
            const rideRef = doc(db, 'rides', rideId);
            const docSnap = await getDoc(rideRef);
            if (docSnap.exists() && !['completed', 'cancelled_by_driver', 'cancelled_by_rider'].includes(docSnap.data().status)) {
                const rideData = { id: docSnap.id, ...docSnap.data() } as RideData;
                setActiveRide(rideData);
                const p = rideData.pickup;
                const d = rideData.destination;
                setPickup({ address: p.address, coords: { lat: p.location.latitude, lon: p.location.longitude } });
                setDestination({ address: d.address, coords: { lat: d.location.latitude, lon: d.location.longitude } });
            } else {
                localStorage.removeItem('activeRideId');
            }
        }
    };
    checkActiveRide();
  }, []);
  
    // New listener for emergency cases
    useEffect(() => {
        if (!session?.phone || !db) return;

        const q = query(
            collection(db, "emergencyCases"),
            where("riderId", "==", session.phone),
            where("status", "in", ["pending", "accepted", "onTheWay", "arrived", "inTransit"])
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            if (!snapshot.empty) {
                const caseDoc = snapshot.docs[0];
                const caseData = { id: caseDoc.id, ...caseDoc.data() } as AmbulanceCase;
                
                if (activeAmbulanceCase?.status !== 'accepted' && caseData.status === 'accepted') {
                     toast({
                        title: "Partner Dispatched",
                        description: `${caseData.assignedPartner?.name} is on the way.`,
                        className: "bg-green-600 text-white border-green-600",
                        duration: 9000
                    });
                }
                
                const partnerLoc = caseData.partnerLocation;
                const patientLoc = { lat: caseData.location.latitude, lon: caseData.location.longitude };
                
                if (partnerLoc) {
                     const partnerCoords = { lat: partnerLoc.latitude, lon: partnerLoc.longitude };
                     setDriverLiveLocation(partnerCoords); // Update driver marker on map

                    if (caseData.status === 'onTheWay' || caseData.status === 'accepted') {
                        const routeInfo = await getRouteInfo(partnerCoords, patientLoc);
                        if(routeInfo) {
                          caseData.partnerEta = routeInfo.duration;
                          setRouteGeometry(routeInfo.geometry); 
                        }
                    } else if (caseData.status === 'inTransit' && caseData.hospitalLocation) {
                        const hospitalCoords = {lat: caseData.hospitalLocation.latitude, lon: caseData.hospitalLocation.longitude};
                        const routeInfo = await getRouteInfo(partnerCoords, hospitalCoords);
                        if (routeInfo) {
                           caseData.hospitalEta = routeInfo.duration;
                           setRouteGeometry(routeInfo.geometry);
                        }
                    }
                }
                
                setActiveAmbulanceCase(caseData);
                setIsRequestingSos(true);
            } else {
                if(activeAmbulanceCase && activeAmbulanceCase.status === 'completed') return;
                setActiveAmbulanceCase(null);
                setIsRequestingSos(false);
            }
        });

        return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session?.phone, db, toast]);
    
  
  const handleConfirmRide = async () => {
    const selectedRideData = rideTypes.find(r => r.name === selectedRide);
    if (!selectedRideData || !db || !session) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not request ride. Session data is missing.' });
        return;
    }
    
    if ((selectedRideData.fare === '...' && selectedRideData.fare !== 'On Quote') || !pickup.coords || !destination.coords) {
         toast({ variant: 'destructive', title: 'Error', description: 'Could not request ride. Location or fare data is missing.' });
        return;
    }
    
    try {
        const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
        const rideDoc = await addDoc(collection(db, 'rides'), {
            riderId: session.phone,
            riderName: session.name,
            riderGender: session.gender, // Important: Add rider's gender
            pickup: {
                address: pickup.address,
                location: new GeoPoint(pickup.coords.lat, pickup.coords.lon)
            },
            destination: {
                address: destination.address,
                location: new GeoPoint(destination.coords.lat, destination.coords.lon)
            },
            rideType: selectedRideData.name,
            fare: selectedRideData.fareDetails?.total,
            status: 'searching',
            otp: generatedOtp,
            rejectedBy: [],
            createdAt: serverTimestamp(),
        });
        
        localStorage.setItem('activeRideId', rideDoc.id);

        setActiveRide({
            id: rideDoc.id,
            pickup: { address: pickup.address, location: { latitude: pickup.coords.lat, longitude: pickup.coords.lon } },
            destination: { address: destination.address, location: { latitude: destination.coords.lat, longitude: destination.coords.lon } },
            status: 'searching',
            otp: generatedOtp,
            fare: selectedRideData.fareDetails?.total
        });
        
        setView('hidden');
    } catch (error) {
        console.error("Error creating ride document: ", error);
        toast({ variant: 'destructive', title: 'Booking Failed', description: 'Could not connect to the server.' });
    }
  }

 const getCoordinates = async (address: string): Promise<{ lat: number; lon: number } | null> => {
    if (!address || address.trim() === "") {
        return null;
    }
    for (let attempt = 1; attempt <= 2; attempt++) {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`);
            if (!response.ok) {
                 const errorText = await response.text();
                 throw new Error(errorText || `Nominatim search API failed with status: ${response.status}`);
            }
            const data = await response.json();
            if (data && data.length > 0) {
                return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
            } else {
                 if (attempt >= 2) {
                    toast({ variant: 'destructive', title: 'Location Not Found', description: `Could not find coordinates for "${address}". Please try a more specific location.` });
                }
            }
        } catch (error: any) {
            console.error(`getCoordinates Attempt ${attempt} failed: ${error.message}`);
            if (attempt >= 2) {
                toast({ variant: 'destructive', title: 'Location Service Error', description: `Could not find "${address}". Please check the address or try again.` });
                return null;
            }
             await new Promise(res => setTimeout(res, 500 * attempt));
        }
    }
    return null;
 };


  const getRouteInfo = async (startCoords: any, endCoords: any) => {
      try {
          const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startCoords.lon},${startCoords.lat};${endCoords.lon},${endCoords.lat}?overview=full&geometries=geojson`;
          const response = await fetch(osrmUrl);
          if (!response.ok) {
              const errorText = await response.text().catch(() => 'OSRM API Error');
              console.error(`OSRM API Error (${response.status}):`, errorText);
              toast({ variant: 'destructive', title: 'Routing Error', description: 'Could not calculate the route. Please check the locations.' });
              return null;
          }
          const data = await response.json();
          if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
              const route = data.routes[0];
              return {
                  distance: route.distance / 1000,
                  duration: Math.round(route.duration / 60 * 1.2),
                  geometry: route.geometry,
              };
          }
          return null;
      } catch (error) {
          console.error('Routing error:', error);
          toast({ variant: 'destructive', title: 'Network Error', description: 'Failed to connect to the routing service.' });
          return null;
      }
  };


  const handleGetRideInfo = async () => {
    if (!destination.address) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please enter a destination.' });
        return;
    }
    
    setIsFindingRides(true);
    setView('options');
    setRideTypes(initialRideTypes);
    setRouteGeometry(null);
    setNearbyDrivers(null);
    
    let startCoords = pickup.coords;
    if (!startCoords && liveMapRef.current) {
        toast({title: "Getting your location..."});
        const locationResult = await liveMapRef.current.locate();
        if (locationResult) {
            startCoords = locationResult.coords;
            setPickup({ address: locationResult.address, coords: startCoords });
        } else {
             toast({ variant: 'destructive', title: 'Location Error', description: 'Could not determine your location. Please check browser permissions.' });
             setIsFindingRides(false);
             setView('planning');
             return;
        }
    }

    const endCoords = destination.coords || (await getCoordinates(destination.address));
    
    if (!startCoords || !endCoords) {
        setIsFindingRides(false);
        setView('planning');
        return;
    }
    
    setDestination(prev => ({ ...prev, address: destination.address, coords: endCoords }));

    if(!db) {
      toast({ variant: 'destructive', title: 'Database Error', description: 'Could not connect to Firebase to find drivers.' });
      setIsFindingRides(false);
      return;
    }
    const partnersRef = collection(db, 'partners');
    const q = query(partnersRef, where('isOnline', '==', true));
    const querySnapshot = await getDocs(q);
    setNearbyDrivers(querySnapshot.size);
    
    const routeInfo = await getRouteInfo(startCoords, endCoords);
    if (!routeInfo) {
        setIsFindingRides(false);
        return;
    }
    
    const { distance, duration, geometry } = routeInfo;
    setEstimatedDistance(distance);
    setRouteGeometry(geometry);
    
    const updatedRideTypes = initialRideTypes.map(rt => {
        if (rt.name === 'Cabzi Pink' && session?.gender === 'male') {
            return { ...rt, fare: 'N/A', eta: 'N/A' };
        }
        const config = fareConfig[rt.name];
        if (!config) return { ...rt };
        
        const calculatedFare = config.base + (config.perKm * distance) + config.serviceFee;
        const totalFare = Math.round(calculatedFare / 5) * 5;
        const etaValue = Math.round(duration + 5);
        
        return { 
            ...rt, 
            fare: `₹${totalFare}`, 
            eta: `${etaValue} min`, 
            fareDetails: { base: config.base, perKm: config.perKm, serviceFee: config.serviceFee, total: totalFare } 
        };
    });
    
    setRideTypes(updatedRideTypes);
    setIsFindingRides(false);
  }

  useEffect(() => {
    if (!activeRide?.id || !db) return;

    const rideRef = doc(db, 'rides', activeRide.id);
    const unsubscribe = onSnapshot(rideRef, async (docSnap) => {
        if (docSnap.exists()) {
            const rideData = docSnap.data();
            const currentStatus = activeRide.status;

            if (rideData.driverLocation && pickup.coords) {
                const now = Date.now();
                const driverLoc = { lat: rideData.driverLocation.latitude, lon: rideData.driverLocation.longitude };
                setDriverLiveLocation(driverLoc);

                if (now - lastApiCallTimestamp.current > 20000) {
                    lastApiCallTimestamp.current = now;
                    let startCoords, endCoords;

                    if (rideData.status === 'accepted') {
                        startCoords = driverLoc;
                        endCoords = { lat: pickup.coords.lat, lon: pickup.coords.lon };
                    } else if (rideData.status === 'in-progress' && destination.coords) {
                        startCoords = driverLoc;
                        endCoords = { lat: destination.coords.lat, lon: destination.coords.lon };
                    }

                    if (startCoords && endCoords) {
                        const etaInfo = await getRouteInfo(startCoords, endCoords);
                        if (etaInfo) {
                           setActiveRide(prev => prev ? {...prev, driverEta: etaInfo.duration} : null);
                        }
                    }
                }
            }

            if (rideData.status !== currentStatus) {
                switch (rideData.status) {
                    case 'accepted':
                        notificationSoundRef.current?.play().catch(e => console.log("Audio play failed:", e));
                        setActiveRide(prev => prev ? {
                            ...prev,
                            status: 'accepted',
                            driverDetails: {
                                name: rideData.driverName,
                                vehicle: rideData.driverVehicle,
                                rating: rideData.driverRating,
                                photoUrl: rideData.driverPhotoUrl,
                                phone: rideData.driverPhone,
                            }
                        } : null);
                        toast({ title: "Partner Found!", description: `${rideData.driverName} is on the way to ${pickup.address}` });
                        break;
                    case 'in-progress':
                        if(pickup.coords && destination.coords) {
                            const tripRoute = await getRouteInfo(pickup.coords, destination.coords);
                            if (tripRoute) {
                                setRouteGeometry(tripRoute.geometry);
                            }
                        }
                        setActiveRide(prev => prev ? { ...prev, status: 'in-progress' } : null);
                        toast({ title: "Trip Started!", description: `Your trip to ${destination.address} is now in progress.`, className: "bg-green-600 text-white border-green-600" });
                        break;
                    case 'completed':
                        setActiveRide(prev => prev ? { ...prev, status: 'payment_pending', fare: rideData.fare } : null);
                        break;
                    case 'cancelled_by_driver':
                        toast({ variant: 'destructive', title: 'Ride Cancelled', description: 'The partner has cancelled the ride.'});
                        resetState();
                        break;
                }
            }
        }
    });

    return () => unsubscribe();
  }, [activeRide?.id, activeRide?.status, db, destination.address, toast, pickup.address, pickup.coords, destination.coords]);


  useEffect(() => {
    if (activeRide?.status === "accepted" && activeRide.driverEta && activeRide.driverEta > 0) {
        const timer = setInterval(() => {
            setActiveRide(prev => prev ? {...prev, driverEta: Math.max(0, (prev.driverEta || 0) - (1/60))} : null);
        }, 1000);
        return () => clearInterval(timer);
    }
  }, [activeRide?.driverEta, activeRide?.status]);


    useEffect(() => {
        if (!activeAmbulanceCase || !db) return;

        // Function to calculate ETA
        const calculateEta = async (start: GeoPoint, end: {lat: number, lon: number}) => {
            const partnerCoords = { lat: start.latitude, lon: start.longitude };
            const routeInfo = await getRouteInfo(partnerCoords, end);
            return routeInfo?.duration || null;
        };

        const caseRef = doc(db, 'emergencyCases', activeAmbulanceCase.id);
        const unsubscribe = onSnapshot(caseRef, async (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                 // If partner location changes, recalculate ETA
                if (data.partnerLocation && pickup.coords) {
                    const newPartnerLoc = data.partnerLocation;
                    let eta = null;
                    if (data.status === 'onTheWay' || data.status === 'accepted') {
                        eta = await calculateEta(newPartnerLoc, pickup.coords);
                         setActiveAmbulanceCase(prev => prev ? { ...prev, partnerEta: eta, partnerLocation: newPartnerLoc } : null);
                    } else if (data.status === 'inTransit' && data.hospitalLocation) {
                        const hospitalCoords = { lat: data.hospitalLocation.latitude, lon: data.hospitalLocation.longitude };
                        eta = await calculateEta(newPartnerLoc, hospitalCoords);
                        setActiveAmbulanceCase(prev => prev ? { ...prev, hospitalEta: eta, partnerLocation: newPartnerLoc } : null);
                    }
                }
            }
        });

        return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeAmbulanceCase?.id, db]);


  const resetState = () => {
    setActiveRide(null);
    setActiveAmbulanceCase(null);
    setIsRequestingSos(false);
    setRating(0);
    setDestination({ address: '', coords: null });
    setRideTypes(initialRideTypes);
    setEstimatedDistance(0);
    setRouteGeometry(null);
    setDriverLiveLocation(null);
    setView('hidden');
    liveMapRef.current?.locate();
    localStorage.removeItem('activeRideId');
    localStorage.removeItem('activeGarageRequestId');
  }

  const handleCancelRideByRider = async () => {
      if (!db || !activeRide) return;
      const rideRef = doc(db, 'rides', activeRide.id);
      await updateDoc(rideRef, { status: 'cancelled_by_rider' });
      toast({ variant: 'destructive', title: 'Ride Cancelled' });
      resetState();
  }
  
  const handleLocateMe = useCallback(async () => {
    if (liveMapRef.current) {
        const location = await liveMapRef.current.locate();
        if (location) {
            setPickup({ address: location.address, coords: location.coords });
        }
    }
  }, []);

  useEffect(() => {
    handleLocateMe();
  }, [handleLocateMe]);

  const selectedRideData = rideTypes.find(r => r.name === selectedRide);
  
  const handlePayment = async () => {
    if (!activeRide || !db) return;
    
    // This is a simulation
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const rideRef = doc(db, 'rides', activeRide.id);
    await updateDoc(rideRef, { status: 'completed' });
    
    toast({
        title: "Payment Successful!",
        description: `₹${activeRide.fare} has been paid.`,
        className: 'bg-green-600 text-white border-green-600'
    });
    
    setActiveRide(prev => prev ? { ...prev, status: 'completed' } : null);
  }

  const renderRideBooking = () => {
    const cardVariants = {
        hidden: { y: '100%', opacity: 0 },
        visible: { y: '0%', opacity: 1, transition: { type: 'spring', damping: 25, stiffness: 150 } },
        exit: { y: '100%', opacity: 0, transition: { duration: 0.2 } }
    };

    const contentVariants = {
        hidden: { opacity: 0, height: 0 },
        visible: { opacity: 1, height: 'auto', transition: { duration: 0.3, delay: 0.1 } },
        exit: { opacity: 0, height: 0, transition: { duration: 0.2 } }
    };
    
    if(activeRide) return <RideStatus ride={activeRide} rating={rating} setRating={setRating} onCancel={handleCancelRideByRider} onPayment={handlePayment} onDone={resetState} />;

    return (
        <MotionDiv 
          className="fixed bottom-0 left-0 right-0 z-20 p-4"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
            <Card className="w-full max-w-lg mx-auto shadow-2xl">
                <AnimatePresence mode="wait">
                    {view === 'hidden' && (
                        <MotionDiv key="hidden" variants={contentVariants} initial="hidden" animate="visible" exit="exit">
                             <CardContent className="p-0">
                                <div className="flex items-center gap-4 p-4 cursor-pointer" onClick={() => setView('planning')}>
                                    <Search className="w-6 h-6 text-muted-foreground"/>
                                    <p className="text-lg font-semibold text-muted-foreground">Where to?</p>
                                </div>
                            </CardContent>
                        </MotionDiv>
                    )}
                    {view === 'planning' && (
                        <MotionDiv key="planning" variants={contentVariants} initial="hidden" animate="visible" exit="exit">
                           <CardHeader className="p-4 pb-2 flex-shrink-0 flex flex-row items-center gap-2">
                                <Button variant="ghost" size="icon" onClick={() => setView('hidden')}><ArrowLeft/></Button>
                                <CardTitle>Plan Your Trip</CardTitle>
                           </CardHeader>
                           <CardContent className="p-4 space-y-4">
                                <div className="relative p-4 rounded-lg border bg-background">
                                    <div className="absolute left-6 top-10 bottom-10 w-px border-l-2 border-dotted"></div>
                                    <div className="relative flex items-center gap-3">
                                        <MapPin className="h-5 w-5 text-green-500 flex-shrink-0" />
                                        <Input placeholder="Current location" className="border-0 shadow-none h-auto p-0 focus-visible:ring-0 text-base flex-1" value={pickup.address} onChange={(e) => setPickup(prev => ({ ...prev, address: e.target.value }))}/>
                                    </div>
                                    <div className="my-4 border-t"></div>
                                    <div className="relative flex items-center gap-3">
                                        <CircleDot className="h-5 w-5 text-primary flex-shrink-0" />
                                        <Input placeholder="Enter destination" className="border-0 shadow-none h-auto p-0 focus-visible:ring-0 text-base flex-1" value={destination.address} onChange={(e) => setDestination(prev => ({...prev, address: e.target.value}))}/>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" className="w-full justify-start gap-2 text-muted-foreground"><Home className="w-4 h-4"/> Add Home</Button>
                                    <Button variant="outline" className="w-full justify-start gap-2 text-muted-foreground"><Briefcase className="w-4 h-4"/> Add Work</Button>
                                </div>
                           </CardContent>
                           <CardFooter>
                                <Button size="lg" className="w-full" onClick={handleGetRideInfo} disabled={isFindingRides || !destination.address}>Find Rides</Button>
                           </CardFooter>
                        </MotionDiv>
                    )}
                    {view === 'options' && (
                         <MotionDiv key="options" variants={contentVariants} initial="hidden" animate="visible" exit="exit" className="flex flex-col max-h-[80vh]">
                            <CardHeader className="p-4 pb-2 flex-shrink-0 flex flex-row items-center gap-2 border-b">
                                <Button variant="ghost" size="icon" onClick={() => { setView('planning'); setRouteGeometry(null); }}><ArrowLeft/></Button>
                                <div>
                                    <CardTitle>Available Options</CardTitle>
                                    {nearbyDrivers !== null && (<p className="text-sm text-muted-foreground flex items-center gap-1.5 pt-1"><Users className="w-4 h-4 text-green-600"/> Found {nearbyDrivers} partners nearby</p>)}
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 overflow-y-auto p-4">
                                {isFindingRides ? (
                                    <div className="py-10 text-center space-y-2"><SearchingIndicator partnerType="path" /><p className="font-semibold mt-4">Finding best options...</p></div>
                                ) : (
                                    <div className="space-y-2">
                                        {rideTypes.map(ride => (
                                            <div key={ride.name} onClick={() => (ride.fare !== '...' && ride.fare !== 'N/A') && setSelectedRide(ride.name)} className={cn("p-3 rounded-lg border-2 flex flex-col transition-all cursor-pointer", selectedRide === ride.name ? "border-primary bg-primary/10" : "border-transparent bg-muted/50", ride.name === 'Cabzi Pink' && 'bg-pink-100/50 dark:bg-pink-900/20', selectedRide === ride.name && ride.name === 'Cabzi Pink' && '!border-pink-500 bg-pink-100 dark:bg-pink-900/30', (ride.fare === '...' || ride.fare === 'N/A') && 'opacity-50 cursor-not-allowed')}>
                                                <div className="flex items-center gap-4 w-full">
                                                    <ride.icon className={cn("w-10 h-10 text-primary", ride.name === 'Cabzi Pink' && 'text-pink-500')} />
                                                    <div className="flex-1">
                                                        <p className="font-bold">{ride.name}</p>
                                                        <p className="text-xs text-muted-foreground">{ride.description}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-bold text-lg">{ride.fare}</p>
                                                        <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end"><Clock className="w-3 h-3"/> {ride.eta}</p>
                                                    </div>
                                                </div>
                                                {selectedRide === ride.name && ride.fareDetails && (
                                                    <Dialog>
                                                        <DialogTrigger asChild><Button variant="link" size="sm" className="text-xs h-auto p-0 mt-2 text-primary"><Info className="w-3 h-3 mr-1" /> Fare Breakdown</Button></DialogTrigger>
                                                        <DialogContent>
                                                            <DialogHeader><DialogTitle>Fare Breakdown for {ride.name}</DialogTitle></DialogHeader>
                                                            <div className="text-sm text-muted-foreground mt-3 pt-3 space-y-1">
                                                                <div className="flex justify-between"><span>Base Fare</span> <span>₹{ride.fareDetails.base.toFixed(2)}</span></div>
                                                                <div className="flex justify-between"><span>Distance Charge ({estimatedDistance.toFixed(1)} km)</span> <span>₹{(ride.fareDetails.perKm * estimatedDistance).toFixed(2)}</span></div>
                                                                {ride.fareDetails.serviceFee > 0 && <div className="flex justify-between"><span>Service & Safety Fee</span> <span>₹{ride.fareDetails.serviceFee.toFixed(2)}</span></div>}
                                                                <div className="flex justify-between font-bold text-foreground border-t mt-1 pt-2"><span>Total Payable</span> <span>₹{ride.fareDetails.total.toFixed(2)}</span></div>
                                                            </div>
                                                        </DialogContent>
                                                    </Dialog>
                                                )}
                                                {ride.name === "Cabzi Pink" && ride.fare === 'N/A' && (<div className="text-xs text-pink-600 dark:text-pink-400 mt-2 pt-2 border-t border-dashed w-full flex items-center gap-1"><Info className="w-3 h-3"/><span>Only available for women.</span></div>)}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter>
                                <Button size="lg" className="w-full btn-glow" onClick={handleConfirmRide} disabled={isFindingRides || rideTypes.every(r => r.fare === '...')}>Confirm {selectedRide} <ArrowRight className="ml-2 h-5 w-5" /></Button>
                            </CardFooter>
                         </MotionDiv>
                    )}
                </AnimatePresence>
            </Card>
        </MotionDiv>
    )
  }

  return (
    <div className="h-screen w-screen flex flex-col">
        {activeRide && (
            <RideStatus ride={activeRide} rating={rating} setRating={setRating} onCancel={handleCancelRideByRider} onPayment={handlePayment} onDone={resetState} />
        )}

        <div className="flex-1 relative">
            <LiveMap
                ref={liveMapRef}
                onLocationFound={(address, coords) => {
                  setPickup({ address: address, coords: coords });
                }}
                riderLocation={pickup.coords ?? undefined}
                routeGeometry={routeGeometry}
                driverLocation={driverLiveLocation}
                isTripInProgress={activeRide?.status === 'in-progress'}
            />
        </div>
        
        {!activeRide && renderRideBooking()}
        
        <div className="absolute top-20 right-4 z-10 pointer-events-auto">
             <EmergencyButtons
                session={session}
                liveMapRef={liveMapRef}
                pickupCoords={pickup.coords}
                setIsRequestingSos={setIsRequestingSos}
                setActiveAmbulanceCase={setActiveAmbulanceCase}
            />
        </div>
    </div>
  );
}
