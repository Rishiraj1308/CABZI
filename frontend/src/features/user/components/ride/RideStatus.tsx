
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

const GPayIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 256 256"><path fill="#4285F4" d="M204.3 106.2c0-10-1.6-19.5-4.5-28.3h-70.3v34.4h39.9c-1.6 11.2-6.4 20.8-13.8 26.5v22.2h28.7c16.8-15.5 26.6-38.3 26.6-64.8z"/><path fill="#34A853" d="M129.5 209c25.9 0 47.9-8.5 63.8-23.1l-28.7-22.2c-8.5 5.7-19.6 9-35.1 9-27.1 0-50-18.1-58.2-42.6H42.2v23C58.3 189.5 91.5 209 129.5 209z"/><path fill="#FBBC05" d="M71.3 121.1c-1.9-5.7-3-11.8-3-18s1.1-12.3 3-18V63H42.2C35.9 76.5 32 91.8 32 108.1s3.9 31.6 10.2 45.1l29.1-22.1z"/><path fill="#EA4335" d="M129.5 61.1c14.1 0 26.9 4.8 36.9 14.3l25.5-25.5C177.4 33.4 155.4 23 129.5 23C91.5 23 58.3 42.5 42.2 63l29.1 22.1C79.5 61.2 102.4 43 129.5 61.1z"/></svg>;
const PhonePeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="#5f259f" d="M17.4 14.8c-.8-1.5-2.2-2-3.3-2.9-1-.8-1.2-1.2-1.2-1.9 0-.6.4-1.1 1.2-1.1.9 0 1.9.3 2.5 1l2.2-1.4c-.9-1.5-2.5-2.5-4.7-2.5-2.8 0-4.9 1.6-4.9 4.1 0 2.4 1.5 3.5 3.8 5 .8.6 1.3 1 1.3 1.8 0 .6-.4 1.2-1.3 1.2-1.2 0-2.1-.5-2.8-1.3l-2.2 1.4c1.1 1.8 2.9 2.8 5 2.8 3.2.1 5.3-1.6 5.3-4.2.1-2.2-1-3.6-2.5-4.8z"/><path fill="#5f259f" d="M22.9 13.9h-3.3v-1.9H23v-2.3h-3.3V7.8h-2.3v1.9h-1.6v2.3h1.6v1.9h-1.6v2.3h1.6v1.7h2.3v-1.7h3.3v2.3h2.2V13.9z"/></svg>;
const PaytmIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 118 41"><path fill="#00b9f1" d="M83.1 24.5h-5.2V41H72v-8.2H58.2v8.2h-5.9V16.6h19.7v7.9zm-5.2-2.7h-8.6v2.7h8.6v-2.7zM111.4 24.5h-5.2V41h-5.9v-8.2H86.4v8.2h-5.9V16.6h19.7v7.9zm-5.2-2.7h-8.6v2.7h8.6v-2.7zM42.2 24.5H29.5l6.5-7.9h8.3l-2.1 7.9zM22.9 41l13.2-24.4h-9.7L13.2 41h10.3-.6zM0 41l13.2-24.4H3.5L0 41zM51.9 41l13.2-24.4h-9.7L42.2 41h10.3-.6z"/></svg>;


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
     <div className="w-full h-full flex flex-col">
        <div className="relative flex-1 w-full">
            <MiniMap riderLocation={(ride as RideData).pickup?.location ? { lat: (ride as RideData).pickup.location.latitude, lon: (ride as RideData).pickup.location.longitude } : null} />
        </div>
        <Card className="rounded-t-2xl -mt-4 z-10 flex-shrink-0 border-t-4 border-primary/20">
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
      </div>
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
                        <Separator className="my-4"/>
                        <div className="flex justify-between text-xl font-bold text-primary"><span>Total Amount</span><span>₹{totalAmount.toFixed(2)}</span></div>
                    </CardContent>
                </Card>
                <div className="mt-4 text-center text-sm text-muted-foreground">
                    <p className="font-semibold">Pay driver in cash or use UPI</p>
                    <div className="flex justify-center gap-2 mt-3">
                         <a href={`gpay://upi/pay?pa=driver-upi@oksbi&pn=Driver%20Name&am=${totalAmount.toFixed(2)}&cu=INR`}><Button variant="outline" className="h-12 w-12 p-0"><GPayIcon /></Button></a>
                         <a href={`phonepe://pay?pa=driver-upi@ybl&pn=Driver%20Name&am=${totalAmount.toFixed(2)}&cu=INR`}><Button variant="outline" className="h-12 w-12 p-0"><PhonePeIcon /></Button></a>
                         <a href={`paytmmp://pay?pa=driver-upi@paytm&pn=Driver%20Name&am=${totalAmount.toFixed(2)}&cu=INR`}><Button variant="outline" className="h-12 w-12 p-0"><PaytmIcon /></Button></a>
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
