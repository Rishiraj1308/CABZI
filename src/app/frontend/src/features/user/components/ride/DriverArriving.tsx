
'use client';

import React, { useEffect, useState, useRef } from 'react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { differenceInYears, format } from 'date-fns';
import { motion } from 'framer-motion';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableRow, TableFooter, TableHead } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';


const LiveMap = dynamic(() => import('@/features/user/components/ride/LiveMap'), {
    ssr: false,
    loading: () => <div className="h-full w-full bg-muted animate-pulse" />
});


interface DriverArrivingProps {
    ride: RideData;
    onCancel: () => void;
}

export default function DriverArriving({ ride, onCancel }: DriverArrivingProps) {
  const { db } = useFirebase();
  const [driverLocation, setDriverLocation] = useState<{lat: number, lon: number} | null>(null);
  const [etaMin, setEtaMin] = useState<number | null>(null);
  const [distKm, setDistKm] = useState<number | null>(null);
  const [routeGeometry, setRouteGeometry] = useState<any | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  
  // Watch driver's live location
  useEffect(() => {
    if (!db || !ride?.driverId) return;

    const unsub = onSnapshot(doc(db, 'pathPartners', ride.driverId), (snap) => {
      const d = snap.data();
      const loc = d?.currentLocation;
      if (loc) {
        setDriverLocation({ lat: loc.latitude, lon: loc.longitude });
      }
    });

    return () => unsub();
  }, [db, ride?.driverId]);


  const computeRoute = React.useCallback(async () => {
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
        setRouteGeometry(route.geometry);
      }
    } catch (error) {
        console.error("Error computing route:", error);
    }
  }, [driverLocation, ride.status, ride.pickup?.location, ride.destination?.location]);
  
  useEffect(() => {
    if (ride.status === 'searching' || !driverLocation) return;

    computeRoute();

  }, [driverLocation, computeRoute, ride.status]);


  const handleCancelClick = async () => {
    setIsCancelling(true);
    try {
        await onCancel(); 
    } finally {
        setIsCancelling(false);
    }
  }

  const driverDetails = ride.driverDetails;

  const calculateAge = (dobString?: string): number | null => {
      if (!dobString) return null;
      try {
          return differenceInYears(new Date(), new Date(dobString));
      } catch {
          return null;
      }
  }

  const driverAge = calculateAge(driverDetails?.dob);

  const navigateUrl = isTripInProgress && ride.destination?.location
    ? `https://www.google.com/maps/dir/?api=1&destination=${ride.destination.location.latitude},${ride.destination.location.longitude}`
    : ride.pickup?.location
    ? `https://www.google.com/maps/dir/?api=1&destination=${ride.pickup.location.latitude},${ride.pickup.location.longitude}`
    : '#';

  const isTripInProgress = ride.status === 'in-progress';


  const renderSearchingView = () => (
    <div className="w-full h-full flex flex-col">
      <div className="relative flex-1 w-full">
        <LiveMap riderLocation={ride.pickup?.location ? { lat: ride.pickup.location.latitude, lon: ride.pickup.location.longitude } : null} />
      </div>
      <Card className="rounded-t-2xl -mt-4 z-10 flex-shrink-0 border-t-4 border-primary/20">
        <CardContent className="p-6 flex flex-col items-center justify-center text-center flex-1">
          <SearchingIndicator partnerType="path" />
          <p className="mt-4 font-semibold text-lg">Finding your ride...</p>
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
                <AlertDialogDescription>This will cancel your ride search. You can always book a new ride.</AlertDialogDescription>
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
            routeGeometry={routeGeometry}
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


  if (ride.status === 'searching') {
    return renderSearchingView();
  }

  if (ride.status === 'in-progress') {
    return renderInProgressView();
  }

  if (!ride?.pickup?.location) return null;

  return (
    <div className="w-full h-full flex flex-col">
      <div className="relative flex-1 w-full">
        <LiveMap
            riderLocation={ride.pickup?.location ? { lat: ride.pickup.location.latitude, lon: ride.pickup.location.longitude } : null}
            driverLocation={driverLocation}
            routeGeometry={routeGeometry}
        />
      </div>

      <Card className="rounded-t-2xl -mt-4 z-10 flex-shrink-0 border-t-4 border-primary/20">
            <CardContent className="p-4 space-y-4">
                <div className="text-center">
                    <p className="font-semibold text-lg">{etaMin ? `Arriving in ~${etaMin} min` : 'Calculating ETA...'}</p>
                     <p className="text-sm text-muted-foreground">
                        {driverDetails?.vehicle || 'Vehicle'} • {distKm ? `${distKm.toFixed(1)} km away` : '...'}
                    </p>
                </div>

            <Card className="shadow-none border">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
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
                                <p className="text-sm text-muted-foreground font-semibold">{ride.vehicleNumber}</p>
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
                    </div>
                     <Accordion type="single" collapsible className="w-full mt-2">
                      <AccordionItem value="item-1">
                        <AccordionTrigger>View Trip Details</AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3 pt-2">
                            <div className="flex items-start gap-3 text-sm">
                                <MapPin className="w-4 h-4 mt-1 text-green-500"/>
                                <div><p className="font-semibold text-muted-foreground text-xs">FROM</p><p>{ride.pickup?.address}</p></div>
                            </div>
                            <div className="flex items-start gap-3 text-sm">
                                <Route className="w-4 h-4 mt-1 text-red-500"/>
                                <div><p className="font-semibold text-muted-foreground text-xs">TO</p><p>{ride.destination?.address}</p></div>
                            </div>
                            <div className="flex items-start gap-3 text-sm">
                                <IndianRupee className="w-4 h-4 mt-1 text-primary"/>
                                <div><p className="font-semibold text-muted-foreground text-xs">FARE</p><p className="font-bold text-base">₹{ride.fare}</p></div>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                </CardContent>
            </Card>

            <div className="flex gap-4">
                <Button variant="outline" className="flex-1 h-12" asChild>
                    <a href={driverDetails?.phone ? `tel:${driverDetails.phone}` : '#'}>
                        <Phone className="w-5 h-5 mr-2" /> Call Driver
                    </a>
                </Button>
                 <Button asChild size="sm" className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white">
                    <a href={navigateUrl} target="_blank" rel="noopener noreferrer">
                        <Navigation className="w-4 h-4 mr-2" /> Navigate
                    </a>
                </Button>
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

