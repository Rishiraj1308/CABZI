
'use client';

import React, { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Phone, Shield, Share2, Siren, Star, XCircle, Route, Clock, MapPin, CheckCircle, Navigation, User, BadgeCheck, PartyPopper, IndianRupee } from 'lucide-react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useFirebase } from '@/lib/firebase/client-provider';
import type { RideData, GarageRequest, AmbulanceCase } from '@/lib/types';
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
import { useRoute } from '@/features/driver/hooks/useRoute';

const DriverArriving = dynamic(() => import('@/features/user/components/ride/DriverArriving'), {
    ssr: false,
    loading: () => <div className="h-full w-full flex items-center justify-center"><Skeleton className="h-full w-full" /></div>
});

const LiveMap = dynamic(() => import('@/features/user/components/ride/LiveMap'), {
    ssr: false,
    loading: () => <div className="h-full w-full bg-muted animate-pulse" />
});

const MiniMap = dynamic(() => import('@/features/user/components/ride/MiniMap'), {
    ssr: false,
    loading: () => <Skeleton className="h-full w-full" />
});

interface RideStatusProps {
    ride: RideData | GarageRequest | AmbulanceCase;
    isGarageRequest?: boolean;
    isAmbulanceCase?: boolean;
    onCancel: () => void;
    onDone: () => void;
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

  const calculateAge = (dobString?: string): number | null => {
      if (!dobString) return null;
      try {
          return differenceInYears(new Date(), new Date(dobString));
      } catch {
          return null;
      }
  }

  const partnerType = isGarageRequest ? 'resq' : isAmbulanceCase ? 'cure' : 'path';

  const renderSearchingView = () => (
     <Card className="w-full max-w-md mx-auto h-full flex flex-col shadow-2xl">
        <CardContent className="p-6 flex flex-col items-center justify-center text-center flex-1">
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
  );
  
  const renderCompletedView = () => (
     <Card className="w-full max-w-md mx-auto h-full flex flex-col shadow-2xl justify-center">
        <div className="text-center p-4">
            <div className="mx-auto w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center border-4 border-green-500/20 mb-4">
                <PartyPopper className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold">Ride Completed!</h2>
            <p className="text-muted-foreground">Thank you for riding with Curocity.</p>
            <Card className="mt-6 text-left w-full">
                <CardHeader>
                    <CardTitle>Trip Summary</CardTitle>
                    <CardDescription>Invoice ID: {ride.id.slice(0,8).toUpperCase()}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableBody>
                            <TableRow><TableCell>Driver</TableCell><TableCell className="text-right font-semibold">{driverDetails?.name}</TableCell></TableRow>
                            <TableRow><TableCell>Vehicle</TableCell><TableCell className="text-right font-semibold">{driverDetails?.vehicle} ({(ride as RideData).vehicleNumber})</TableCell></TableRow>
                            <TableRow><TableCell>Date</TableCell><TableCell className="text-right font-semibold">{format(ride.createdAt.toDate(), 'PPP')}</TableCell></TableRow>
                            <TableRow className="font-bold text-primary"><TableCell>Total Fare</TableCell><TableCell className="text-right text-xl">₹{(ride as RideData).fare?.toFixed(2)}</TableCell></TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <Card className="mt-4 w-full">
                <CardHeader><CardTitle>Rate Your Experience</CardTitle></CardHeader>
                <CardContent className="flex justify-center gap-2 py-4">
                    {[1,2,3,4,5].map(star => <Star key={star} onClick={() => setRating(star)} className={cn("w-10 h-10 cursor-pointer transition-all", rating >= star ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/50')}/>)}
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
  if (ride.status === 'completed') return renderCompletedView();
  
  if (!(ride as RideData).pickup?.location) return null;

  return (
    <DriverArriving ride={ride as RideData} onCancel={handleCancelClick} />
  );
}
