'use client';

import React, { useEffect, useState } from 'react';
import { Phone, Shield, Share2, Siren, Star, XCircle, Route, Clock, MapPin, CheckCircle, Navigation, User, BadgeCheck, PartyPopper, IndianRupee } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { useFirebase } from '@/lib/firebase/client-provider';
import type { RideData } from '@/lib/types';
import { getRoute } from '@/lib/routing';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { differenceInYears } from 'date-fns';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import dynamic from 'next/dynamic';

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
      console.error('Error computing route:', error);
    }
  }, [driverLocation, ride.status, ride.pickup?.location, ride.destination?.location]);

  useEffect(() => {
    if (ride.status === 'searching' || !driverLocation) return;
    computeRoute();
    const interval = setInterval(() => computeRoute(), 10000);
    return () => clearInterval(interval);
  }, [driverLocation, computeRoute, ride.status]);

  const handleCancelClick = async () => {
    setIsCancelling(true);
    try {
      await onCancel();
    } finally {
      setIsCancelling(false);
    }
  };

  const driverDetails = ride.driverDetails;

  const calculateAge = (dobString?: string): number | null => {
    if (!dobString) return null;
    try {
      return differenceInYears(new Date(), new Date(dobString));
    } catch {
      return null;
    }
  };

  const driverAge = calculateAge(driverDetails?.dob);

  const isTripInProgress = ride.status === 'in-progress';

  const navigateUrl = isTripInProgress && ride.destination?.location
    ? `https://www.google.com/maps/dir/?api=1&destination=${ride.destination.location.latitude},${ride.destination.location.longitude}`
    : ride.pickup?.location
      ? `https://www.google.com/maps/dir/?api=1&destination=${ride.pickup.location.latitude},${ride.pickup.location.longitude}`
      : '#';

  // Deep link / public tracking URL
  const publicTrackUrl = (): string => {
    const base = (process.env.NEXT_PUBLIC_APP_URL || 'https://curocity.com').replace(/\/$/, '');
    const id = (ride as any)?.id || (ride as any)?.rideId || '';
    return id ? `${base}/track/${id}` : window.location.href;
  };

  // Rich WhatsApp template
  const buildWhatsAppMessage = (includeDeepLink = true) => {
    const link = includeDeepLink ? `\nTrack: ${publicTrackUrl()}` : '';
    return `🚗 *Curocity Ride Update*\nDriver: ${driverDetails?.name || 'Driver'} (${driverDetails?.vehicle || 'Vehicle'})\nOTP: ${ride.otp}\n${link}\n\nShared via Curocity`;
  };

  // Comprehensive share handler (Native, WhatsApp, Copy, Deep link)
  const handleShareRide = async (opts?: { via?: 'native' | 'whatsapp' | 'copy' }) => {
    const shareMessage = buildWhatsAppMessage(true);
    const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    const shareData = {
      title: 'Curocity Ride Status',
      text: shareMessage,
      url: publicTrackUrl(),
    };

    // If caller requested a specific via, prefer that
    if (opts?.via === 'whatsapp') {
      window.open('https://wa.me/?text=' + encodeURIComponent(shareMessage), '_blank');
      return;
    }
    if (opts?.via === 'copy') {
      try {
        await navigator.clipboard.writeText(shareMessage);
        toast.success('Link copied to clipboard!');
      } catch {
        toast.error('Failed to copy. Please copy manually.');
      }
      return;
    }

    // 1. Native share on mobile
    if (isMobile && navigator.share) {
      try {
        await navigator.share(shareData as any);
        toast.success('Ride status shared!');
        return;
      } catch (e) {
        console.error('Native share failed:', e);
        // fall through to WhatsApp
      }
    }

    // 2. WhatsApp
    try {
      window.open('https://wa.me/?text=' + encodeURIComponent(shareMessage), '_blank');
      return;
    } catch (e) {
      console.error('WhatsApp open failed', e);
    }

    // 3. Copy fallback
    try {
      await navigator.clipboard.writeText(shareMessage);
      toast.success('Link copied to clipboard!');
    } catch {
      toast.error('Failed to share. Copy manually instead.');
    }
  };

  // Render when trip in-progress
  const renderInProgressView = () => (
    <div className="w-full h-full flex flex-col">
      <div className="relative flex-1 w-full">
        <LiveMap
          driverLocation={driverLocation}
          destinationLocation={
            ride.destination?.location
              ? { lat: ride.destination.location.latitude, lon: ride.destination.location.longitude }
              : null
          }
          routeGeometry={routeGeometry}
          isTripInProgress={true}
        />
      </div>

      <Card className="rounded-t-2xl -mt-4 z-10 flex-shrink-0 border-t-4 border-primary/20">
        <CardContent className="p-4 space-y-4">
          <div className="text-center">
            <p className="font-semibold text-lg">Trip to {ride.destination?.address?.split(',')[0]}</p>
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
                  <Shield className="w-5 h-5 mr-2" /> Safety
                </Button>
              </DialogTrigger>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Safety Toolkit</DialogTitle>
                  <DialogDescription>Your safety is our priority. Use these tools if you feel unsafe.</DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-2">
                  <Button onClick={() => handleShareRide({ via: 'native' })} variant="outline" className="w-full justify-start gap-2"><Share2 className="w-4 h-4"/> Native Share</Button>

                  <Button onClick={() => handleShareRide({ via: 'whatsapp' })} variant="outline" className="w-full justify-start gap-2"><Share2 className="w-4 h-4"/> Share on WhatsApp</Button>

                  <Button onClick={() => handleShareRide({ via: 'copy' })} variant="outline" className="w-full justify-start gap-2"><Share2 className="w-4 h-4"/> Copy Ride Link</Button>

                  <Button asChild variant="outline" className="w-full justify-start gap-2"><a href="tel:112"><Phone className="w-4 h-4"/> Call Emergency (112)</a></Button>

                  <Button variant="destructive" className="w-full justify-start gap-2"><Siren className="w-4 h-4"/> Alert Curocity Safety Team</Button>
                </div>

                <p className="text-xs text-center text-muted-foreground pt-2">You are on a safe and insured Curocity ride.</p>

              </DialogContent>
            </Dialog>

            <Button asChild size="sm" className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white">
              <a href={navigateUrl} target="_blank" rel="noreferrer noopener">
                <Navigation className="w-4 h-4 mr-2" /> Navigate
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (isTripInProgress) return renderInProgressView();

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
            <p className="text-sm text-muted-foreground">{driverDetails?.vehicle || 'Vehicle'} • {distKm ? `${distKm.toFixed(1)} km away` : '...'}</p>
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
                    <p className="font-bold text-lg flex items-center gap-2">{driverDetails?.name || 'Driver'} <BadgeCheck className="w-5 h-5 text-green-500"/></p>
                    <p className="text-sm text-muted-foreground font-semibold">{ride.vehicleNumber}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-400 fill-amber-400" /><span>{driverDetails?.rating?.toFixed(1) || '5.0'}</span></div>
                      {driverAge && <span>{driverAge} yrs</span>}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-4xl font-extrabold tracking-[0.1em]">{ride.otp}</p>
                  <p className="text-xs text-muted-foreground">Share this OTP to start</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Accordion type="single" collapsible className="w-full mt-2 border rounded-lg px-4">
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

          <div className="flex gap-4">
            <Button variant="outline" className="flex-1 h-12" asChild>
              <a href={driverDetails?.phone ? `tel:${driverDetails.phone}` : '#'}>
                <Phone className="w-5 h-5 mr-2" /> Call Driver
              </a>
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="flex-1 h-12" disabled={isCancelling}>
                  <XCircle className="w-5 h-5 mr-2" />
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
