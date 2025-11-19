
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Siren, Star, Wrench, Car, IndianRupee, MapPin, Route, PartyPopper } from 'lucide-react';
import type { RideData, GarageRequest, AmbulanceCase } from '@/lib/types';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
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
import dynamic from 'next/dynamic';
import MiniMap from '@/features/user/components/ride/MiniMap';
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';
import BrandLogo from '@/components/shared/brand-logo';

const DriverArriving = dynamic(() => import('@/features/user/components/ride/DriverArriving'), {
    ssr: false,
    loading: () => <div className="h-full w-full flex items-center justify-center"><Skeleton className="h-full w-full" /></div>
});
const SearchingIndicator = dynamic(() => import('@/components/ui/searching-indicator'), { ssr: false });


interface RideStatusProps {
    ride: RideData | GarageRequest | AmbulanceCase;
    isGarageRequest?: boolean;
    isAmbulanceCase?: boolean;
    onCancel: () => void;
    onDone: () => void;
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

export default function RideStatus({ ride, onCancel, isGarageRequest, isAmbulanceCase, onDone }: RideStatusProps) {
  const [isCancelling, setIsCancelling] = useState(false);
  const [rating, setRating] = useState(0);
  const [isRatingSubmitting, setIsRatingSubmitting] = useState(false);

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
      setTimeout(() => {
        toast.success("Thank you for your feedback!");
        onDone();
        setIsRatingSubmitting(false);
      }, 1000);
  }

  const driverDetails = isGarageRequest 
    ? { name: (ride as GarageRequest).mechanicName, phone: (ride as GarageRequest).mechanicPhone, vehicle: 'Service Bike', rating: 4.8, dob: '', photoUrl: '' }
    : isAmbulanceCase 
    ? { name: "Paramedic Team", phone: (ride as AmbulanceCase).assignedPartner?.phone, vehicle: (ride as AmbulanceCase).assignedAmbulanceName || 'Ambulance', rating: 5.0, dob: '', photoUrl: ''}
    : (ride as RideData).driverDetails;

  const partnerType = isGarageRequest ? 'resq' : isAmbulanceCase ? 'cure' : 'path';

  const renderSearchingView = () => (
     <Card className="w-full max-w-md mx-auto h-full flex flex-col shadow-2xl">
        <CardContent className="p-6 flex flex-col items-center justify-center text-center flex-1">
          <SearchingIndicator partnerType={partnerType} />
          <p className="mt-4 font-semibold text-lg">Finding your partner...</p>
          <p className="text-sm text-muted-foreground">Connecting you to a nearby {isAmbulanceCase ? 'hospital' : 'partner'}.</p>
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
  );
  
  const renderPaymentView = () => {
    const r = ride as RideData;
    const totalAmount = r.fare || 0;
    const rideType = r.rideType || 'Cab (Lite)';
    const config = fareConfig[rideType] || fareConfig['Cab (Lite)'];
    
    // Consistent invoice ID logic
    const rideCount = (r.driverDetails?.jobsToday || 0) + 1;
    const formattedRideCount = rideCount.toString().padStart(3, '0');
    const partnerIdentifier = r.driverDetails?.partnerId?.split('-')[1] || '0000';
    const invoiceId = `${partnerIdentifier}-${formattedRideCount}`;

    const taxesAndFees = 5.00;
    const baseFare = config.base;
    const distanceCharge = totalAmount - baseFare - taxesAndFees;
    const distanceKm = r.distance || (distanceCharge / config.perKm) || 0;
    const perKmRate = distanceKm > 0 ? (distanceCharge / distanceKm) : config.perKm;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md mx-auto h-full flex flex-col justify-center space-y-4"
        >
            <Card className="bg-primary text-primary-foreground text-center">
                <CardHeader>
                    <div className="mx-auto"><BrandLogo className="[&>span]:text-white" iconClassName="[&>svg>path]:stroke-white [&>svg>circle]:fill-white"/></div>
                    <CardTitle className="text-2xl pt-2">Payment Due</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-5xl font-bold">₹{totalAmount.toFixed(2)}</p>
                    <p className="text-primary-foreground/80 mt-1">Payable to {driverDetails?.name}</p>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle className="text-base">Invoice Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Invoice ID:</span><span className="font-mono">{invoiceId}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Date:</span><span className="font-semibold">{format(new Date(), 'PPP')}</span></div>
                    <Separator/>
                    <div className="flex justify-between"><span className="text-muted-foreground">Vehicle:</span><span className="font-semibold">{driverDetails?.vehicle} ({r.vehicleNumber})</span></div>
                    <Separator/>
                    <div className="space-y-1"><p className="text-muted-foreground">Trip Details:</p>
                        <p className="font-semibold text-xs">FROM: {r.pickup?.address}</p>
                        <p className="font-semibold text-xs">TO: {r.destination?.address}</p>
                    </div>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Fare Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Base Fare</span><span>₹{baseFare.toFixed(2)}</span></div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Distance Charge</span>
                        <div className="text-right">
                            <span>₹{distanceCharge.toFixed(2)}</span>
                            <p className="text-xs text-muted-foreground">({distanceKm.toFixed(1)} km @ ₹{perKmRate.toFixed(1)}/km)</p>
                        </div>
                    </div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Taxes & Fees</span><span>₹{taxesAndFees.toFixed(2)}</span></div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Payment Methods</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm font-semibold text-center mb-4">Pay driver in cash or use UPI</p>
                    <div className="flex justify-center gap-4">
                        <a href={`upi://pay?pa=${driverDetails?.phone}@ybl&pn=${driverDetails?.name || 'Driver'}&am=${totalAmount.toFixed(2)}&cu=INR`} className="flex flex-col items-center gap-2 p-2 rounded-lg hover:bg-muted">
                           <Image src="https://i.ibb.co/68Z4C9v/gpay.png" alt="Google Pay" width={48} height={48} />
                           <span className="text-xs font-semibold">GPay</span>
                        </a>
                        <a href={`phonepe://pay?pa=${driverDetails?.phone}@ybl&pn=${driverDetails?.name || 'Driver'}&am=${totalAmount.toFixed(2)}&cu=INR`} className="flex flex-col items-center gap-2 p-2 rounded-lg hover:bg-muted">
                           <Image src="https://i.ibb.co/VvZB2B0/phonepe.png" alt="PhonePe" width={48} height={48} />
                             <span className="text-xs font-semibold">PhonePe</span>
                        </a>
                        <a href={`paytmmp://pay?pa=${driverDetails?.phone}@paytm&pn=${driverDetails?.name || 'Driver'}&am=${totalAmount.toFixed(2)}&cu=INR`} className="flex flex-col items-center gap-2 p-2 rounded-lg hover:bg-muted">
                           <Image src="https://i.ibb.co/D5b2z8R/paytm.png" alt="Paytm" width={48} height={48} />
                            <span className="text-xs font-semibold">Paytm</span>
                        </a>
                    </div>
                </CardContent>
                 <CardFooter>
                    <p className="text-xs text-muted-foreground text-center w-full">Waiting for driver to confirm cash payment...</p>
                 </CardFooter>
            </Card>
        </motion.div>
    );
  }

  const renderCompletedView = () => (
     <Card className="w-full max-w-md mx-auto h-full flex flex-col shadow-2xl justify-center">
        <div className="text-center p-4">
            <div className="mx-auto w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center border-4 border-green-500/20 mb-4">
               {isAmbulanceCase ? <Siren className="w-10 h-10 text-green-500"/> : isGarageRequest ? <Wrench className="w-10 h-10 text-green-500"/> : <Car className="w-10 h-10 text-green-500" />}
            </div>
            <h2 className="text-2xl font-bold">Service Completed!</h2>
            <p className="text-muted-foreground">Thank you for using Curocity.</p>
            <Card className="mt-6 text-left w-full">
                <CardHeader>
                    <CardTitle>Summary</CardTitle>
                    <CardDescription>ID: {ride.id.slice(0,8).toUpperCase()}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableBody>
                            <TableRow><TableCell>Partner</TableCell><TableCell className="text-right font-semibold">{driverDetails?.name}</TableCell></TableRow>
                            <TableRow><TableCell>Date</TableCell><TableCell className="text-right font-semibold">{format(ride.createdAt.toDate(), 'PPP')}</TableCell></TableRow>
                            {!isAmbulanceCase && 
                                <TableRow className="font-bold text-primary"><TableCell>Total Fare</TableCell><TableCell className="text-right text-xl">₹{(isGarageRequest ? (ride as GarageRequest).totalAmount : (ride as RideData).fare)?.toFixed(2) || '0.00'}</TableCell></TableRow>
                            }
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <Card className="mt-4 w-full">
                <CardHeader><CardTitle>Rate Your Experience</CardTitle></CardHeader>
                <CardContent className="flex justify-center gap-2 py-4">
                    {[1,2,3,4,5].map(star => <Star key={star} onClick={() => setRating(star)} className={`w-10 h-10 cursor-pointer transition-all ${rating >= star ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/50'}`}/>)}
                </CardContent>
                <CardFooter>
                     <Button className="w-full" onClick={handleRatingSubmit} disabled={isRatingSubmitting}>
                         {isRatingSubmitting ? "Submitting..." : "Submit Rating & Close"}
                     </Button>
                </CardFooter>
            </Card>
        </div>
      </Card>
  );

  // Main Render Logic
  if (ride.status === 'searching' || ride.status === 'pending') return renderSearchingView();
  if (ride.status === 'payment_pending') return renderPaymentView();
  if (ride.status === 'completed') return renderCompletedView();
  
  const pickupLocation = (ride as RideData).pickup?.location;
  if (!pickupLocation) return null;

  return (
    <DriverArriving ride={ride as RideData} onCancel={onCancel} />
  );
}
