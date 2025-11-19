
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

const GPayIcon = () => (
    <svg width="32" height="32" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M10.385 10.052v3.917h5.9c-.25 1.55-1.733 3.916-5.9 3.916-3.55 0-6.45-2.933-6.45-6.5S6.835 4.885 10.385 4.885c2.017 0 3.3.85 4.067 1.583l2.55-2.583C15.118 2.085 12.985 1 10.385 1 5.318 1 1.452 4.817 1.452 9.833c0 5.017 3.866 8.834 8.933 8.834 5.3 0 8.6-3.55 8.6-8.633 0-.85-.1-1.483-.233-2.034h-8.367z" fill="#FFF"/>
    </svg>
);
const PhonePeIcon = () => (
    <svg width="32" height="32" viewBox="0 0 73 73" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5.961 46.543l3.327 3.327a3.414 3.414 0 004.828 0l8.653-8.654a23.328 23.328 0 01-13.48-13.48l-8.653 8.653a3.414 3.414 0 000 4.827z" fill="#9554C8"/>
        <path d="M10.789 67.21l16.142-16.142a23.41 23.41 0 00-6.195-23.953L4.593 53.257a3.414 3.414 0 000 4.827l6.196 6.196a3.414 3.414 0 002.413.93z" fill="#9554C8"/>
        <path d="M43.714 5.258l-3.326-3.327a3.414 3.414 0 00-4.828 0L26.906 10.585a23.327 23.327 0 0113.48 13.48l8.654-8.654a3.414 3.414 0 000-4.826z" fill="#AF65E0"/>
        <path d="M23.633 26.906L10.585 13.858a23.327 23.327 0 0123.953-6.195L50.68 23.805a23.41 23.41 0 01-6.195 23.953l-2.414-2.414a19.98 19.98 0 005.258-14.417c0-5.44-2.127-10.354-5.696-14.017z" fill="#AF65E0"/>
        <path d="M67.939 42.777l-6.196-6.196a3.414 3.414 0 00-4.827 0l-6.196 6.196-2.414 2.414 8.61 8.61a3.414 3.414 0 004.828 0l6.195-6.195z" fill="#9554C8"/>
    </svg>
);
const PaytmIcon = () => (
    <svg width="50" height="18" viewBox="0 0 50 18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M34.11 0H16.16L0 18h16.03l8.02-8.91L32.1 18H48L34.11 0z" fill="#00B9F1"/>
        <path d="M16.16 0L0 18h8.02l16.15-18H16.16z" fill="#002970"/>
    </svg>
);


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
                    <div className="flex justify-center gap-4 mt-3">
                         <a href={`upi://pay?pa=driver-upi@oksbi&pn=${driverDetails?.name || 'Driver'}&am=${totalAmount.toFixed(2)}&cu=INR`}><Button variant="outline" className="h-14 w-14 p-0 flex items-center justify-center bg-white"><GPayIcon /></Button></a>
                         <a href={`phonepe://pay?pa=driver-upi@ybl&pn=${driverDetails?.name || 'Driver'}&am=${totalAmount.toFixed(2)}&cu=INR`}><Button variant="outline" className="h-14 w-14 p-0 flex items-center justify-center bg-white"><PhonePeIcon /></Button></a>
                         <a href={`paytmmp://pay?pa=driver-upi@paytm&pn=${driverDetails?.name || 'Driver'}&am=${totalAmount.toFixed(2)}&cu=INR`}><Button variant="outline" className="h-14 w-14 p-0 flex items-center justify-center bg-white"><PaytmIcon /></Button></a>
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
