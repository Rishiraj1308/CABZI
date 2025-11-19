
'use client';

import React, { useState, Dispatch, SetStateAction, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Navigation, CheckCircle, Phone, Route, Clock, MessageSquare, MapPin, IndianRupee, Star, PartyPopper, XCircle, User, BadgeCheck } from 'lucide-react';
import { RideData } from '@/lib/types';
import { useFirebase } from '@/lib/firebase/client-provider';
import { doc, updateDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { useDriver } from '@/app/(dashboard)/driver/ClientLayout';
import { useRoute } from '../hooks/useRoute';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { motion, AnimatePresence } from 'framer-motion';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
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
import { format } from 'date-fns';
import dynamic from 'next/dynamic';
import { Table, TableBody, TableCell, TableRow, TableFooter } from '@/components/ui/table';

const LiveMap = dynamic(() => import('@/features/user/components/ride/LiveMap'), { 
    ssr: false,
    loading: () => <Skeleton className="h-full w-full bg-muted" />
});

interface ActiveRideViewProps {
  activeRide: RideData;
  setActiveRide: Dispatch<SetStateAction<RideData | null>>;
}

// Define fare configuration for consistent calculation
const fareConfig: {[key: string]: { base: number, perKm: number, serviceFee: number }} = {
    'Bike': { base: 20, perKm: 5, serviceFee: 0 },
    'Auto': { base: 30, perKm: 8, serviceFee: 0 }, 
    'Cab (Lite)': { base: 40, perKm: 12, serviceFee: 20 },
    'Cab (Prime)': { base: 50, perKm: 15, serviceFee: 25 },
    'Cab (XL)': { base: 60, perKm: 18, serviceFee: 30 },
    'Curocity Pink': { base: 50, perKm: 12, serviceFee: 30 },
}

export function ActiveRideView({ activeRide, setActiveRide }: ActiveRideViewProps) {
  const { db } = useFirebase();
  const { partnerData } = useDriver();
  const [enteredOtp, setEnteredOtp] = useState('');

  const driverLocation = partnerData?.currentLocation ? { lat: partnerData.currentLocation.latitude, lon: partnerData.currentLocation.longitude } : null;
  const riderLocation = activeRide.pickup?.location ? { lat: activeRide.pickup.location.latitude, lon: activeRide.pickup.location.longitude } : null;
  const destinationLocation = activeRide.destination?.location ? { lat: activeRide.destination.location.latitude, lon: activeRide.destination.location.longitude } : null;

  const isNavigatingToRider = ['accepted', 'arrived'].includes(activeRide.status);
  
  const { route, distance, duration } = useRoute(
      driverLocation, 
      isNavigatingToRider ? riderLocation : destinationLocation
  );

  const handleRideStatusUpdate = async (newStatus: RideData['status']) => {
    if (!db || !activeRide || !partnerData?.id) return;
    const rideRef = doc(db, 'rides', activeRide.id);
    const partnerRef = doc(db, 'pathPartners', partnerData.id);

    try {
        const updates: any = { status: newStatus };
        // When trip ends, set partner liveStatus back to online
        if (newStatus === 'payment_pending' || newStatus === 'completed' || newStatus.includes('cancelled')) {
            await updateDoc(partnerRef, { liveStatus: 'online' });
        }
        
        await updateDoc(rideRef, updates);
        
        // Optimistically update the local state
        setActiveRide(prev => prev ? { ...prev, status: newStatus } : null);

        toast.info("Status Updated", { description: `Ride is now ${newStatus.replace(/_/g, ' ')}` });
    } catch (error) {
        toast.error("Update Failed", { description: "Could not update ride status." });
    }
  };
  
  const handleCancelRide = async () => {
    await handleRideStatusUpdate('cancelled_by_driver');
  };

  const handleVerifyOtp = async () => {
    if (enteredOtp !== activeRide?.otp) {
      toast.error('Invalid OTP');
      return;
    }
    await handleRideStatusUpdate('in-progress');
  };

  const handleEndRide = async () => {
    await handleRideStatusUpdate('payment_pending');
  };
  
  const handleConfirmPayment = async () => {
    await handleRideStatusUpdate('completed');
  };

  const handleDone = useCallback(() => {
    localStorage.removeItem('activeRideId');
    setActiveRide(null);
  }, [setActiveRide]);
  
  // This effect will run whenever the activeRide status changes
  React.useEffect(() => {
    if (activeRide.status.includes('cancelled')) {
      toast.error("Ride Cancelled", { description: "This ride has been cancelled." });
      handleDone();
    }
  }, [activeRide.status, handleDone]);


  if (!activeRide) return null;
    
  const riderDetails = {
    name: activeRide.riderName,
    phone: (activeRide as any).riderPhone,
    rating: (activeRide as any).riderRating || 4.8, 
    photoUrl: (activeRide as any).riderPhotoUrl || `https://i.pravatar.cc/100?u=${activeRide.riderId}`,
  };

  const navigateUrl = isNavigatingToRider && riderLocation
    ? `https://www.google.com/maps/dir/?api=1&destination=${riderLocation.lat},${riderLocation.lon}`
    : destinationLocation
    ? `https://www.google.com/maps/dir/?api=1&destination=${destinationLocation.lat},${destinationLocation.lon}`
    : '#';
    
   const renderActionButton = () => {
        switch (activeRide.status) {
            case 'accepted':
                return <Button className="w-full h-14 text-base" size="lg" onClick={() => handleRideStatusUpdate('arrived')}>Arrived at Pickup</Button>;
            case 'arrived':
                return <Button className="w-full h-14 text-base" size="lg" onClick={handleVerifyOtp} disabled={enteredOtp.length !== 4}>Verify & Start Trip</Button>
            case 'in-progress':
                 return <Button className="w-full bg-destructive hover:bg-destructive/80 h-14 text-base" size="lg" onClick={handleEndRide}>End Trip</Button>;
            default:
                return null;
        }
    }

    const renderPaymentView = () => {
        const totalAmount = activeRide.fare || 0;
        const rideType = activeRide.rideType || 'Cab (Lite)';
        const config = fareConfig[rideType] || fareConfig['Cab (Lite)'];
        
        // New Invoice ID Logic
        const rideCount = (partnerData?.jobsToday || 0) + 1;
        const formattedRideCount = rideCount.toString().padStart(3, '0');
        const partnerIdentifier = partnerData?.partnerId?.split('-')[1] || '0000';
        const invoiceId = `${partnerIdentifier}-${formattedRideCount}`;

        // Derive other components from the total fare for consistency
        const taxesAndFees = 5.00;
        const baseFare = config.base;
        const distanceCharge = totalAmount - baseFare - taxesAndFees;
        const distanceKm = activeRide.distance || (distanceCharge / config.perKm) || 0;
        const perKmRate = distanceKm > 0 ? (distanceCharge / distanceKm) : config.perKm;

         return (
            <motion.div
                key="payment-pending"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full p-4"
            >
                <Card className="shadow-lg">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl">Collect Payment</CardTitle>
                        <CardDescription>Please show the bill to the rider and collect the cash payment.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                       <Card className="text-left bg-muted/50 p-4 space-y-3">
                            <div className="flex justify-between items-center text-xs text-muted-foreground">
                                <span className="font-mono">Invoice: {invoiceId}</span>
                                <span>{format(new Date(), 'Pp')}</span>
                            </div>
                            <Separator/>
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">Billed to:</p>
                                <p className="font-semibold">{activeRide.riderName}</p>
                            </div>
                            <Separator/>
                             <div className="space-y-3 text-sm">
                                <div className="flex items-start gap-3"><MapPin className="w-4 h-4 mt-1 text-green-500 flex-shrink-0"/><p><span className="font-medium text-muted-foreground text-xs">FROM: </span>{activeRide.pickup?.address}</p></div>
                                <div className="flex items-start gap-3"><Route className="w-4 h-4 mt-1 text-red-500 flex-shrink-0"/><p><span className="font-medium text-muted-foreground text-xs">TO: </span>{activeRide.destination?.address}</p></div>
                            </div>
                            <Separator/>
                            <div className="space-y-2">
                                <div className="flex justify-between"><span className="text-muted-foreground">Base Fare</span><span>₹{baseFare.toFixed(2)}</span></div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Distance Charge</span>
                                    <div className="text-right">
                                        <span>₹{distanceCharge.toFixed(2)}</span>
                                        <p className="text-xs text-muted-foreground">({distanceKm.toFixed(1)} km @ ₹{perKmRate.toFixed(1)}/km)</p>
                                    </div>
                                </div>
                                <div className="flex justify-between"><span className="text-muted-foreground">Taxes & Fees</span><span>₹{taxesAndFees.toFixed(2)}</span></div>
                            </div>
                            <Separator className="my-2"/>
                            <div className="flex justify-between text-lg font-bold text-primary"><span>Total to Collect</span><span>₹{totalAmount.toFixed(2)}</span></div>
                       </Card>
                    </CardContent>
                     <CardFooter>
                        <Button className="w-full h-14 text-lg" onClick={handleConfirmPayment}>
                            Confirm Cash Received
                        </Button>
                    </CardFooter>
                </Card>
            </motion.div>
        )
    }

    if (activeRide.status === 'payment_pending') {
        return renderPaymentView();
    }

    if (activeRide.status === 'completed') {
        const rideFare = activeRide.fare || 0;
        return (
            <motion.div
                key="ride-completed"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full text-center p-4"
            >
                <div className="mx-auto w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center border-4 border-green-500/20 mb-4">
                    <PartyPopper className="w-10 h-10 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold">Ride Completed!</h2>
                <p className="text-muted-foreground">Your earnings have been credited to your wallet.</p>
                <Card className="mt-6 text-left w-full max-w-sm mx-auto">
                    <CardHeader>
                        <CardTitle>Trip Summary</CardTitle>
                        <CardDescription>Invoice ID: {activeRide.id.slice(0,8).toUpperCase()}</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Table>
                            <TableBody>
                                <TableRow><TableCell>Rider</TableCell><TableCell className="text-right font-semibold">{activeRide.riderName}</TableCell></TableRow>
                                <TableRow><TableCell>Date</TableCell><TableCell className="text-right font-semibold">{format(activeRide.createdAt.toDate(), 'PPP')}</TableCell></TableRow>
                                <TableRow className="font-bold text-primary"><TableCell>Total Fare</TableCell><TableCell className="text-right text-xl">₹{rideFare.toFixed(2)}</TableCell></TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                <Button className="mt-6 w-full max-w-sm h-12 text-base" onClick={handleDone}>
                    Done
                </Button>
            </motion.div>
        )
    }

  return (
    <motion.div 
        className="w-full space-y-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
    >
        <Card className="overflow-hidden">
            <CardHeader className="p-4">
                 <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                         <Avatar className="w-12 h-12">
                            <AvatarImage src={riderDetails.photoUrl} alt={riderDetails.name} />
                            <AvatarFallback>{riderDetails?.name?.[0] || 'R'}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-bold">{riderDetails.name}</p>
                             <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                                <span>{riderDetails.rating.toFixed(1)}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                       <Button asChild variant="outline" size="icon"><a href={`tel:${riderDetails?.phone}`}><Phone className="w-4 h-4"/></a></Button>
                       <Button variant="outline" size="icon"><MessageSquare className="w-4 h-4"/></Button>
                    </div>
                </div>
            </CardHeader>
             <CardContent className="p-4 pt-0">
                <Accordion type="single" collapsible>
                    <AccordionItem value="item-1">
                        <AccordionTrigger>View Trip Details</AccordionTrigger>
                        <AccordionContent className="pt-2">
                             <div className="space-y-3 text-sm">
                                <div className="flex items-start gap-3">
                                    <MapPin className="w-4 h-4 text-green-500 mt-1"/>
                                    <div><p className="font-semibold text-muted-foreground text-xs">PICKUP</p><p>{activeRide.pickup?.address}</p></div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Route className="w-4 h-4 text-red-500 mt-1"/>
                                    <div><p className="font-semibold text-muted-foreground text-xs">DROP</p><p>{activeRide.destination?.address}</p></div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <IndianRupee className="w-4 h-4 text-primary mt-1"/>
                                    <div><p className="font-semibold text-muted-foreground text-xs">FARE</p><p className="font-bold text-base">₹{activeRide.fare}</p></div>
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
             </CardContent>
        </Card>

        <Card>
             <CardContent className="p-0">
                <div className="h-48 w-full rounded-t-lg overflow-hidden">
                <LiveMap 
                    riderLocation={isNavigatingToRider ? riderLocation : null}
                    driverLocation={driverLocation}
                    driverVehicleType={partnerData?.vehicleType}
                    destinationLocation={!isNavigatingToRider ? destinationLocation : null}
                    routeGeometry={route}
                    isTripInProgress={activeRide.status === 'in-progress'}
                />
                </div>
                <div className="p-3 grid grid-cols-2 gap-3 text-center">
                    <div className="bg-muted p-2 rounded-lg">
                        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Route className="w-3 h-3"/> Distance</p>
                        <p className="font-bold text-lg">{distance ? `${distance.toFixed(1)} km` : '...'}</p>
                    </div>
                    <div className="bg-muted p-2 rounded-lg">
                        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Clock className="w-3 h-3"/> ETA</p>
                        <p className="font-bold text-lg">{duration ? `~${duration} min` : '...'}</p>
                    </div>
                </div>
             </CardContent>
        </Card>
        
        <AnimatePresence>
         {activeRide.status === 'arrived' && (
          <motion.div
            key="otp-card"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
                <CardHeader>
                    <CardTitle>Verify to Start Trip</CardTitle>
                    <CardDescription>Enter the 4-digit OTP from the rider to begin the trip.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Input id="otp" value={enteredOtp} onChange={(e) => setEnteredOtp(e.target.value)} placeholder="4-Digit OTP" maxLength={4} className="text-2xl tracking-[0.5em] text-center font-mono h-14"/>
                </CardContent>
            </Card>
          </motion.div>
        )}
        </AnimatePresence>

        <div className="grid grid-cols-1 gap-2 pt-2">
            {renderActionButton()}
        </div>

        {['accepted', 'arrived'].includes(activeRide.status) && (
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                        <XCircle className="w-4 h-4 mr-2" />
                        Cancel Ride
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure you want to cancel?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will cancel the current ride. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Go Back</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCancelRide} className="bg-destructive hover:bg-destructive/90">
                            Confirm Cancellation
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        )}
    </motion.div>
  );
};
