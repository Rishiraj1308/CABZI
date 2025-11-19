
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
    const totalAmount = (ride as RideData).fare || 0;
    const rideType = (ride as RideData).rideType || 'Cab (Lite)';
    const config = fareConfig[rideType] || fareConfig['Cab (Lite)'];
    
    const taxesAndFees = 5.00;
    const baseFare = config.base;
    const distanceCharge = totalAmount - baseFare - taxesAndFees;
    const distanceKm = (ride as RideData).distance || (distanceCharge / config.perKm) || 0;
    const perKmRate = distanceKm > 0 ? (distanceCharge / distanceKm) : config.perKm;

    return (
        <Card className="w-full max-w-md mx-auto h-full flex flex-col shadow-2xl justify-center">
            <div className="text-center p-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center border-4 border-primary/20 mb-4">
                   <IndianRupee className="w-8 h-8 text-primary"/>
                </div>
                <h2 className="text-2xl font-bold">Payment Due</h2>
                <p className="text-muted-foreground">Please complete the payment to your driver.</p>
                <Card className="mt-6 text-left w-full">
                    <CardHeader>
                        <CardTitle>Final Bill</CardTitle>
                        <CardDescription>Ride with {driverDetails?.name}</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <div className="text-left bg-muted/50 p-3 rounded-lg space-y-3">
                            <div className="flex justify-between items-center text-xs text-muted-foreground">
                                <span className="font-mono">Invoice: RIDE-{ride.id.slice(0, 8).toUpperCase()}</span>
                                <span>{format(new Date(), 'Pp')}</span>
                            </div>
                             <Separator/>
                             <div className="space-y-3 text-sm">
                                <div className="flex items-start gap-3"><MapPin className="w-4 h-4 mt-1 text-green-500 flex-shrink-0"/><p><span className="font-medium text-muted-foreground text-xs">FROM: </span>{(ride as RideData).pickup?.address}</p></div>
                                <div className="flex items-start gap-3"><Route className="w-4 h-4 mt-1 text-red-500 flex-shrink-0"/><p><span className="font-medium text-muted-foreground text-xs">TO: </span>{(ride as RideData).destination?.address}</p></div>
                            </div>
                            <Separator/>
                            <div className="space-y-2 text-sm">
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
                         </div>
                        <Separator className="my-4"/>
                        <div className="flex justify-between text-xl font-bold text-primary"><span>Total Amount</span><span>₹{totalAmount.toFixed(2)}</span></div>
                    </CardContent>
                </Card>
                <div className="mt-4 text-center text-sm text-muted-foreground">
                    <p className="font-semibold">Pay driver in cash or use UPI</p>
                    <div className="flex justify-center gap-2 mt-3">
                        <Button asChild variant="outline" className="h-14 w-14 p-2 flex items-center justify-center bg-white hover:bg-gray-100">
                             <a href={`upi://pay?pa=${driverDetails?.phone}@ybl&pn=${driverDetails?.name || 'Driver'}&am=${totalAmount.toFixed(2)}&cu=INR`}>
                                 <Image src="/images/upi/gpay.png" alt="Google Pay" width={40} height={40} />
                             </a>
                        </Button>
                        <Button asChild variant="outline" className="h-14 w-14 p-2 flex items-center justify-center bg-white hover:bg-gray-100">
                            <a href={`phonepe://pay?pa=${driverDetails?.phone}@ybl&pn=${driverDetails?.name || 'Driver'}&am=${totalAmount.toFixed(2)}&cu=INR`}>
                                <Image src="/images/upi/phonepe.png" alt="PhonePe" width={40} height={40} />
                            </a>
                        </Button>
                         <Button asChild variant="outline" className="h-14 w-14 p-2 flex items-center justify-center bg-white hover:bg-gray-100">
                           <a href={`paytmmp://pay?pa=${driverDetails?.phone}@paytm&pn=${driverDetails?.name || 'Driver'}&am=${totalAmount.toFixed(2)}&cu=INR`}>
                                <Image src="/images/upi/paytm.png" alt="Paytm" width={40} height={40} />
                            </a>
                        </Button>
                    </div>
                    <p className="text-xs mt-4">Waiting for driver to confirm payment...</p>
                </div>
            </div>
        </Card>
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
