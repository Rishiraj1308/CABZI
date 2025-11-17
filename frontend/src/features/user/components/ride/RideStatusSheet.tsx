
'use client';

import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Phone, Shield, Share2, Siren, Star, XCircle, Route, Clock, MapPin, CheckCircle, Navigation, User, BadgeCheck, PartyPopper, IndianRupee } from 'lucide-react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useFirebase } from '@/lib/firebase/client-provider';
import type { RideData } from '@/lib/types';
import { getRoute } from '@/lib/routing';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import SearchingIndicator from '@/components/ui/searching-indicator';
import dynamic from 'next/dynamic';
import { differenceInYears, format } from 'date-fns';
import { motion } from 'framer-motion';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableRow, TableFooter, TableHead } from '@/components/ui/table';
import { cn } from '@/lib/utils';


const LiveMap = dynamic(() => import('@/features/user/components/ride/LiveMap'), {
    ssr: false,
    loading: () => <div className="h-full w-full bg-muted animate-pulse" />
});


interface RideStatusProps {
    ride: RideData;
    isGarageRequest?: boolean;
    isAmbulanceCase?: boolean;
    onCancel: () => void;
    onDone: () => void;
}

export default function RideStatus({ ride, onCancel, isGarageRequest, isAmbulanceCase, onDone }: RideStatusProps) {
  const { db } = useFirebase();
  const [driverLocation, setDriverLocation] = useState<{lat: number, lon: number} | null>(null);
  const [etaMin, setEtaMin] = useState<number | null>(null);
  const [distKm, setDistKm] = useState<number | null>(null);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [isCancelling, setIsCancelling] = useState(false);
  const [rating, setRating] = useState(0);
  const [isRatingSubmitting, setIsRatingSubmitting] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const partnerCollection = isGarageRequest ? 'mechanics' : isAmbulanceCase ? 'ambulances' : 'pathPartners';
  const partnerId = isGarageRequest ? ride.mechanicId : isAmbulanceCase ? ride.assignedAmbulanceId : ride.driverId;

  // Watch driver's live location
  useEffect(() => {
    if (!db || !partnerId) return;

    const unsub = onSnapshot(doc(db, partnerCollection, partnerId), (snap) => {
      const d = snap.data();
      const loc = d?.currentLocation || d?.location;
      if (loc) {
        setDriverLocation({ lat: loc.latitude, lon: loc.longitude });
      }
    });

    return () => unsub();
  }, [db, partnerId, partnerCollection]);


  const computeRoute = async () => {
    if (!driverLocation) return;
    
    const destination = ride.status === 'in-progress' 
        ? ride.destination?.location 
        : ride.pickup?.location;

    if (!destination) return;

    try {
      const routeData = await getRoute(
        { lat: driverLocation.lat, lon: driverLocation.lon },
        { lat: destination.latitude, lon: destination.longitude }
      );

      if (routeData?.routes?.[0]) {
        const route = routeData.routes[0];
        setEtaMin(Math.max(1, Math.round(route.duration / 60)));
        setDistKm(route.distance / 1000);
        const coords = route.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
        setRouteCoords(coords);
      }
    } catch (error) {
        console.error("Error computing route:", error);
    }
  }
  
  useEffect(() => {
    if (ride.status === 'searching' || !driverLocation) return;

    computeRoute(); // Initial calculation

    if (timerRef.current) clearInterval(timerRef.current);
  
    // Re-calculate every 15 seconds
    timerRef.current = setInterval(computeRoute, 15000);
  
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverLocation, ride.status, ride.pickup?.location, ride.destination?.location]);


  const handleCancelClick = async () => {
    setIsCancelling(true);
    try {
        await onCancel(); 
    } finally {
        setIsCancelling(false);
    }
  }
  
  const handleRatingSubmit = async () => {
      if(rating === 0) {
          toast.info("Please select a rating.");
          return;
      }
      setIsRatingSubmitting(true);
      // In a real app, you'd save this rating to the backend
      // and associate it with the driver.
      setTimeout(() => {
        toast.success("Thank you for your feedback!");
        onDone();
        setIsRatingSubmitting(false);
      }, 1000);
  }

  const driverDetails = isGarageRequest 
    ? { name: ride.mechanicName, phone: ride.mechanicPhone, vehicle: 'Service Bike', rating: 4.8, dob: '', photoUrl: '' }
    : isAmbulanceCase 
    ? { name: "Paramedic Team", phone: ride.assignedPartner?.phone, vehicle: ride.assignedAmbulanceName || 'Ambulance', rating: 5.0, dob: '', photoUrl: ''}
    : ride.driverDetails;

  const calculateAge = (dobString?: string): number | null => {
      if (!dobString) return null;
      try {
          return differenceInYears(new Date(), new Date(dobString));
      } catch {
          return null;
      }
  }

  const driverAge = calculateAge(driverDetails?.dob);
  
  const partnerType = isGarageRequest ? 'resq' : isAmbulanceCase ? 'cure' : 'path';

  const renderSearchingView = () => (
    <div className="w-full h-full flex flex-col">
      <div className="relative flex-1 w-full">
        <LiveMap riderLocation={ride.pickup?.location ? { lat: ride.pickup.location.latitude, lon: ride.pickup.location.longitude } : null} />
      </div>
      <Card className="rounded-t-2xl -mt-4 z-10 flex-shrink-0 border-t-4 border-primary/20">
        <CardContent className="p-6 flex flex-col items-center justify-center text-center">
          <SearchingIndicator partnerType={partnerType} />
          <p className="mt-4 font-semibold text-lg">Finding your partner...</p>
          <p className="text-sm text-muted-foreground">Connecting you to a nearby partner.</p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="mt-6 w-full max-w-xs" disabled={isCancelling}>
                {isCancelling ? 'Cancelling...' : 'Cancel Search'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>This will cancel your request. You can always book a new one.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Go Back</AlertDialogCancel>
                <AlertDialogAction onClick={handleCancelClick} className="bg-destructive hover:bg-destructive/90">Confirm Cancellation</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );

  const renderInProgressView = () => (
    <div className="w-full h-full flex flex-col">
      <div className="relative flex-1 w-full">
        <LiveMap
            driverLocation={driverLocation}
            destinationLocation={ride.destination?.location ? { lat: ride.destination.location.latitude, lon: ride.destination.location.longitude } : null}
            routeGeometry={{ type: "LineString", coordinates: routeCoords.map(c => [c[1], c[0]]) }}
            isTripInProgress={true}
        />
      </div>
      <Card className="rounded-t-2xl -mt-4 z-10 flex-shrink-0 border-t-4 border-primary/20">
        <CardContent className="p-4 space-y-4">
            <div className="text-center">
                <p className="font-semibold text-lg">Trip to {ride.destination?.address.split(',')[0]}</p>
                <p className="text-sm text-muted-foreground">
                    {etaMin ? `Arriving in ~${etaMin} min` : 'Calculating ETA...'} • {distKm ? `${distKm.toFixed(1)} km left` : '...'}
                </p>
            </div>
            
            <Card className="shadow-none border">
                <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Avatar className="w-12 h-12">
                            <AvatarImage src={driverDetails?.photoUrl || `https://i.pravatar.cc/150?u=${ride.driverId}`} />
                            <AvatarFallback>{driverDetails?.name?.charAt(0) || 'D'}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-bold">{driverDetails?.name || 'Driver'}</p>
                            <p className="text-xs text-muted-foreground">{driverDetails?.vehicle} • {ride.vehicleNumber}</p>
                        </div>
                    </div>
                     <div className="flex items-center gap-2">
                         <Button asChild variant="outline" size="icon"><a href={`tel:${driverDetails?.phone}`}><Phone className="w-4 h-4"/></a></Button>
                     </div>
                </CardContent>
            </Card>

            <div className="flex gap-4">
                 <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="flex-1 h-12">
                            <Shield className="w-5 h-5 mr-2"/> Safety
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Safety Toolkit</DialogTitle>
                            <DialogDescription>Your safety is our priority. Use these tools if you feel unsafe.</DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-2">
                            <Button variant="outline" className="w-full justify-start gap-2"><Share2 className="w-4 h-4"/> Share Ride Status</Button>
                            <Button variant="outline" className="w-full justify-start gap-2"><a href="tel:112"><Phone className="w-4 h-4"/> Call Emergency Services (112)</a></Button>
                            <Button variant="destructive" className="w-full justify-start gap-2"><Siren className="w-4 h-4"/> Alert Curocity Safety Team</Button>
                        </div>
                    </DialogContent>
                </Dialog>
                <Button variant="outline" className="flex-1 h-12">
                   <Share2 className="w-5 h-5 mr-2" /> Share
                </Button>
            </div>
            
            <p className="text-xs text-center text-muted-foreground pt-2">You are on a safe and insured Curocity ride.</p>

        </CardContent>
      </Card>
    </div>
  );
  
  const renderCompletedView = () => (
     <motion.div
        key="ride-completed"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-background"
    >
        <div className="mx-auto w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center border-4 border-green-500/20 mb-4">
            <PartyPopper className="w-10 h-10 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold">Ride Completed!</h2>
        <p className="text-muted-foreground">Thank you for riding with Curocity.</p>
        <Card className="mt-6 text-left w-full max-w-sm">
            <CardHeader>
                <CardTitle>Trip Summary</CardTitle>
                <CardDescription>Invoice ID: {ride.id.slice(0,8).toUpperCase()}</CardDescription>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableBody>
                        <TableRow><TableCell>Driver</TableCell><TableCell className="text-right font-semibold">{ride.driverDetails?.name}</TableCell></TableRow>
                        <TableRow><TableCell>Vehicle</TableCell><TableCell className="text-right font-semibold">{ride.driverDetails?.vehicle} ({ride.vehicleNumber})</TableCell></TableRow>
                        <TableRow><TableCell>Date</TableCell><TableCell className="text-right font-semibold">{format(ride.createdAt.toDate(), 'PPP')}</TableCell></TableRow>
                        <TableRow className="font-bold text-primary"><TableCell>Total Fare</TableCell><TableCell className="text-right text-xl">₹{ride.fare?.toFixed(2)}</TableCell></TableRow>
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
        <Card className="mt-4 w-full max-w-sm">
            <CardHeader>
                <CardTitle>Rate Your Experience</CardTitle>
            </CardHeader>
             <CardContent className="flex justify-center gap-2 py-4">
                {[1,2,3,4,5].map(star => (
                    <Star 
                        key={star} 
                        onClick={() => setRating(star)} 
                        className={cn("w-10 h-10 cursor-pointer transition-all", rating >= star ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/50')}
                    />
                ))}
            </CardContent>
             <CardFooter>
                 <Button className="w-full" onClick={handleRatingSubmit} disabled={isRatingSubmitting}>
                     {isRatingSubmitting ? "Submitting..." : "Submit Rating & Close"}
                 </Button>
            </CardFooter>
        </Card>
    </motion.div>
  );

  // Main Render Logic
  if (ride.status === 'searching') return renderSearchingView();
  if (ride.status === 'in-progress' || (isAmbulanceCase && ride.status === 'inTransit')) return renderInProgressView();
  if (ride.status === 'completed') return renderCompletedView();
  
  if (!ride?.pickup?.location) return null;

  return (
    <div className="w-full h-full flex flex-col">
      <div className="relative flex-1 w-full">
        <LiveMap
            riderLocation={ride.pickup?.location ? { lat: ride.pickup.location.latitude, lon: ride.pickup.location.longitude } : null}
            driverLocation={driverLocation}
            routeGeometry={{ type: "LineString", coordinates: routeCoords.map(c => [c[1], c[0]]) }}
        />
      </div>

      <Card className="rounded-t-2xl -mt-4 z-10 flex-shrink-0 border-t-4 border-primary/20">
            <CardContent className="p-4 space-y-4">
                <div className="text-center">
                    <p className="font-semibold text-lg">{etaMin ? `Arriving in ~${etaMin} min` : 'Calculating ETA...'}</p>
                     <p className="text-sm text-muted-foreground">
                        {driverDetails?.vehicle} • {ride.vehicleNumber} • {distKm ? `${distKm.toFixed(1)} km away` : '...'}
                    </p>
                </div>

            <Card className="shadow-none border">
                <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Avatar className="w-16 h-16">
                            <AvatarImage src={driverDetails?.photoUrl || `https://i.pravatar.cc/150?u=${ride.driverId}`} />
                            <AvatarFallback>{driverDetails?.name?.charAt(0) || 'D'}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-bold text-lg flex items-center gap-2">
                                {driverDetails?.name || 'Driver'} 
                                <BadgeCheck className="w-5 h-5 text-green-500"/>
                            </p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                    <span>{driverDetails?.rating?.toFixed(1) || '5.0'}</span>
                                </div>
                                {driverAge && <span>{driverAge} yrs</span>}
                            </div>
                        </div>
                    </div>
                    
                    <div className="text-right">
                        <p className="text-4xl font-extrabold tracking-[0.1em]">{ride.otp}</p>
                        <p className="text-xs text-muted-foreground">Share this OTP to start</p>
                    </div>
                </CardContent>
            </Card>

            <div className="flex gap-4">
                <Button variant="outline" className="flex-1 h-12" asChild>
                    <a href={driverDetails?.phone ? `tel:${driverDetails.phone}` : '#'}>
                        <Phone className="w-5 h-5 mr-2" /> Call Driver
                    </a>
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="flex-1 h-12">
                      <Shield className="w-5 h-5 mr-2"/> Safety
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Safety Toolkit</DialogTitle>
                        <DialogDescription>Your safety is our priority. Use these tools if you feel unsafe.</DialogDescription>
                      </DialogHeader>
                      <div className="py-4 space-y-2">
                        <Button variant="outline" className="w-full justify-start gap-2"><Share2 className="w-4 h-4"/> Share Ride Status</Button>
                        <Button variant="outline" className="w-full justify-start gap-2"><a href="tel:112"><Phone className="w-4 h-4"/> Call Emergency Services (112)</a></Button>
                        <Button variant="destructive" className="w-full justify-start gap-2"><Siren className="w-4 h-4"/> Alert Curocity Safety Team</Button>
                      </div>
                  </DialogContent>
                </Dialog>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full h-12" disabled={isCancelling}>
                    {isCancelling ? 'Cancelling...' : 'Cancel Ride'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>A cancellation fee may apply. This action cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Go Back</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCancelClick} className="bg-destructive hover:bg-destructive/90">Confirm Cancellation</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
