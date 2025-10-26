
'use client';

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import {
  KeyRound,
  Shield,
  LifeBuoy,
  Share2,
  Phone,
  Star,
  Clock,
  MapPin,
  MessageSquare,
  Send,
  Wrench,
  IndianRupee,
  Hand,
  Navigation,
  Car,
  Siren,
  CheckCircle,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import SearchingIndicator from '@/components/ui/searching-indicator';
import type { RideData } from '@/lib/types';
import type { AmbulanceCase } from '@/lib/types';


interface Props {
  ride: RideData | AmbulanceCase | any;
  isGarageRequest?: boolean;
  onCancel: () => void;
  onDone?: () => void;
  onPayment?: (paymentMode: 'cash' | 'wallet') => void;
  onEndRide?: () => void;
  rating?: number;
  setRating?: (rating: number) => void;
}

export default function RideStatus({
  ride,
  isGarageRequest,
  onCancel,
  onDone,
  onPayment,
  onEndRide,
  rating,
  setRating,
}: Props) {
  const { toast } = useToast();
  const [isPaying, setIsPaying] = useState(false);

  if (!ride) return null;

  const isAmbulanceCase = 'caseId' in ride;

  const handleShareRide = () => {
    toast({
        title: "Share Ride Details",
        description: "This feature will be available soon!",
    });
  };

  const handlePaymentClick = async (paymentMode: 'cash' | 'wallet') => {
    setIsPaying(true);
    if (onPayment) {
      await onPayment(paymentMode);
    }
    setIsPaying(false);
  };

  const renderContent = () => {
    if (isAmbulanceCase) {
      const caseData = ride as AmbulanceCase;
       switch(caseData.status) {
            case 'pending':
                return (
                    <div className="text-center py-10">
                        <SearchingIndicator partnerType="cure" />
                        <h3 className="text-2xl font-bold mt-4">Finding Help...</h3>
                        <p className="text-muted-foreground">Contacting nearby hospitals for dispatch.</p>
                    </div>
                )
            case 'accepted':
            case 'onTheWay':
                return (
                     <div className="space-y-4 animate-fade-in">
                        <CardHeader className="p-0 text-center">
                            <CardTitle>Ambulance En-Route</CardTitle>
                            <CardDescription>Paramedic: {caseData.assignedPartner?.name}</CardDescription>
                        </CardHeader>
                        <div className="p-4 rounded-lg bg-muted text-center">
                            <p className="text-sm text-muted-foreground">Estimated Arrival Time</p>
                            <p className="text-4xl font-bold text-primary">{caseData.partnerEta ? `${Math.ceil(caseData.partnerEta)} min` : '...'}</p>
                        </div>
                        <Button className="w-full" asChild><a href={`tel:${caseData.assignedPartner?.phone}`}><Phone className="mr-2 h-4 w-4"/> Call Paramedic</a></Button>
                     </div>
                );
            case 'inTransit':
                 return (
                     <div className="space-y-4 animate-fade-in">
                        <CardHeader className="p-0 text-center">
                            <CardTitle>In Transit to Hospital</CardTitle>
                            <CardDescription>{caseData.assignedPartner?.name}</CardDescription>
                        </CardHeader>
                        <div className="p-4 rounded-lg bg-muted text-center">
                            <p className="text-sm text-muted-foreground">ETA to Hospital</p>
                            <p className="text-4xl font-bold text-primary">{caseData.hospitalEta ? `${Math.ceil(caseData.hospitalEta)} min` : 'Calculating...'}</p>
                        </div>
                     </div>
                 );
             case 'completed':
                 return (
                    <div className="text-center space-y-4 animate-fade-in p-6">
                        <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                            <CheckCircle className="w-8 h-8 text-green-600" />
                        </div>
                        <CardTitle>Case Completed</CardTitle>
                        <CardDescription>You have safely arrived at the hospital. Please rate the ambulance service.</CardDescription>
                        <div className="flex justify-center gap-2 py-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                    key={star}
                                    className={cn(
                                        'w-8 h-8 text-muted-foreground cursor-pointer',
                                        (rating || 0) >= star && 'text-yellow-400 fill-yellow-400'
                                    )}
                                    onClick={() => setRating && setRating(star)}
                                />
                            ))}
                        </div>
                        <Button onClick={onDone} className="w-full">Done</Button>
                    </div>
                 );
            default:
                return <p>Unknown ambulance status: {caseData.status}</p>;
        }
    }

    const rideData = ride as RideData;
    
    if (isGarageRequest) {
        switch(rideData.status) {
            case 'pending':
                return (
                    <div className="text-center py-10">
                        <SearchingIndicator partnerType="resq" />
                        <h3 className="text-2xl font-bold mt-4">Finding a Mechanic...</h3>
                        <p className="text-muted-foreground">Contacting nearby ResQ partners.</p>
                    </div>
                );
            case 'accepted':
                return (
                     <div className="space-y-4 animate-fade-in">
                        <CardHeader className="p-0 text-center">
                            <CardTitle>Mechanic is on the way</CardTitle>
                            <CardDescription>{ride.mechanicName}</CardDescription>
                        </CardHeader>
                         <div className="p-4 rounded-lg bg-muted text-center">
                            <p className="text-sm text-muted-foreground">Estimated Arrival Time</p>
                            <p className="text-4xl font-bold text-primary">{ride.eta ? `${Math.ceil(ride.eta)} min` : '...'}</p>
                        </div>
                         <Button className="w-full" asChild><a href={`tel:${ride.mechanicPhone}`}><Phone className="mr-2 h-4 w-4"/> Call Mechanic</a></Button>
                     </div>
                );
            case 'bill_sent':
                return (
                    <div className="text-center space-y-4 animate-fade-in">
                        <Card>
                            <CardHeader>
                                <CardTitle>Job Card Approval</CardTitle>
                                <CardDescription>Please review the estimated cost and approve to start the work.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {ride.billItems?.map((item: any, index: number) => (
                                    <div key={index} className="flex justify-between text-sm py-2 border-b">
                                        <span>{item.description}</span>
                                        <span className="font-medium">₹{item.amount.toFixed(2)}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between font-bold text-lg pt-2">
                                    <span>Total Amount:</span>
                                    <span>₹{ride.totalAmount?.toFixed(2)}</span>
                                </div>
                            </CardContent>
                        </Card>
                        <div className="grid grid-cols-2 gap-2">
                            <Button size="lg" className="w-full" onClick={() => onPayment && onPayment('wallet')} disabled={isPaying}>{isPaying ? 'Approving...' : 'Approve & Pay from Wallet'}</Button>
                            <Button size="lg" variant="outline" className="w-full" onClick={() => toast({title: "Please approve and pay the mechanic in cash."})}>Approve & Pay Cash</Button>
                        </div>
                    </div>
                );
             case 'completed':
                 return (
                    <div className="text-center space-y-4 animate-fade-in p-6">
                        <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                            <CheckCircle className="w-8 h-8 text-green-600" />
                        </div>
                        <CardTitle>Service Completed</CardTitle>
                        <CardDescription>Please rate your experience with {ride.mechanicName || 'the mechanic'}.</CardDescription>
                        <div className="flex justify-center gap-2 py-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                    key={star}
                                    className={cn(
                                        'w-8 h-8 text-muted-foreground cursor-pointer',
                                        (rating || 0) >= star && 'text-yellow-400 fill-yellow-400'
                                    )}
                                    onClick={() => setRating && setRating(star)}
                                />
                            ))}
                        </div>
                        <Button onClick={onDone} className="w-full">Done</Button>
                    </div>
                 );
            default:
                return <p>Unknown garage status: {ride.status}</p>;
        }
    }


    switch (rideData.status) {
        case "searching":
            return (
                <div className="text-center py-10">
                    <SearchingIndicator partnerType="path" />
                    <h3 className="text-2xl font-bold mt-4">Finding you a ride...</h3>
                    <p className="text-muted-foreground">This will only take a moment.</p>
                </div>
            );
        case "accepted":
             return (
                 <div className="space-y-4 animate-fade-in">
                    <CardHeader className="p-0">
                        <CardTitle>Driver is on the way</CardTitle>
                        <CardDescription className="flex items-center gap-1"><Clock className="w-3 h-3"/> {rideData.driverEta ? `Arriving in ${Math.ceil(rideData.driverEta)} min` : 'Calculating ETA...'}</CardDescription>
                    </CardHeader>
                    <div className="p-4 rounded-lg bg-muted flex items-center gap-3">
                         <Avatar className="w-12 h-12"><AvatarImage src={rideData.driverDetails?.photoUrl} alt={rideData.driverDetails?.name} /><AvatarFallback>{rideData.driverDetails?.name?.substring(0,2)}</AvatarFallback></Avatar>
                         <div className="flex-1">
                             <p className="font-bold">{rideData.driverDetails?.name}</p>
                             <p className="text-sm text-muted-foreground">{rideData.driverDetails?.vehicle} &bull; {rideData.driverDetails?.rating} <Star className="w-3 h-3 inline-block -mt-1 ml-0.5" /></p>
                         </div>
                         <p className="font-bold text-lg">OTP: {rideData.otp}</p>
                    </div>
                </div>
             );
      case "in-progress":
        return (
          <div className="space-y-4 animate-fade-in">
              <CardHeader className="p-0">
                <CardTitle>Trip to Destination</CardTitle>
                <CardDescription className="flex items-center gap-1"><Clock className="w-3 h-3"/>ETA: {rideData.driverEta ? `${Math.ceil(rideData.driverEta)} min` : 'Calculating...'}</CardDescription>
              </CardHeader>
                <div className="p-4 rounded-lg bg-muted flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                    <div><p className="font-semibold">{rideData.destination?.address}</p></div>
                </div>
          </div>
        );
      case "payment_pending":
        return (
          <div className="text-center space-y-4 animate-fade-in">
            <Card className="bg-primary text-primary-foreground text-center">
                <CardContent className="p-4">
                  <p className="text-primary-foreground/80 text-sm">Total Fare</p>
                  <p className="text-5xl font-bold">₹{rideData.fare}</p>
                </CardContent>
            </Card>
            <p className="text-muted-foreground text-sm">Please choose a payment method.</p>
            <div className="grid grid-cols-2 gap-2">
                <Button size="lg" className="w-full" onClick={() => handlePaymentClick('wallet')} disabled={isPaying}>{isPaying ? 'Processing...' : 'Pay from Wallet'}</Button>
                <Button size="lg" variant="outline" className="w-full" onClick={() => toast({title: "Please pay the driver in cash."})}>Pay with Cash</Button>
            </div>
          </div>
        );
      case "completed":
        return (
             <div className="text-center space-y-4 animate-fade-in p-6">
                <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <CardTitle>Trip Completed</CardTitle>
                <CardDescription>Please rate your experience with {rideData.driverDetails?.name || 'the driver'}.</CardDescription>
                <div className="flex justify-center gap-2 py-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                            key={star}
                            className={cn(
                                'w-8 h-8 text-muted-foreground cursor-pointer',
                                (rating || 0) >= star && 'text-yellow-400 fill-yellow-400'
                            )}
                            onClick={() => setRating && setRating(star)}
                        />
                    ))}
                </div>
                <Button onClick={onDone} className="w-full">Done</Button>
            </div>
        );
      default:
        // This handles any status not explicitly covered, including 'arrived' for a regular ride
        return <p>Current status: {ride.status}</p>;
    }
  };

  const getActiveRideTitle = () => {
    if (!ride) return "Loading...";
    if (isAmbulanceCase) return 'Emergency Case';
    if (isGarageRequest) return 'Service Request';
    
    switch(ride.status) {
        case 'searching': return 'Finding you a ride...';
        case 'accepted': return 'Partner is on the way';
        case 'in-progress': return 'Trip in Progress';
        case 'payment_pending': return 'Payment & Rating';
        case 'completed': return 'Trip Finished';
        default: return 'Ride Status';
    }
  }

  const getActiveRideIcon = () => {
      if(isAmbulanceCase) return <Siren className="w-5 h-5 text-destructive" />;
      if(isGarageRequest) return <Wrench className="w-5 h-5 text-amber-600" />;
      return <Car className="w-5 h-5 text-primary"/>;
  }

  return (
    <Card className="w-full max-w-md mx-auto shadow-2xl animate-fade-in">
        <CardHeader className="p-4 flex-row items-center justify-between">
             <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-full", isAmbulanceCase ? 'bg-destructive/10' : isGarageRequest ? 'bg-amber-500/10' : 'bg-primary/10')}>
                  {getActiveRideIcon()}
                </div>
                <div>
                   <CardTitle className="text-lg">{getActiveRideTitle()}</CardTitle>
                   <CardDescription>ID: {ride.id.substring(0, 8)}...</CardDescription>
                </div>
             </div>
             <Dialog>
                <DialogTrigger asChild>
                    <Button variant="ghost" size="icon"><Shield className="w-5 h-5 text-muted-foreground"/></Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader><DialogTitle>Safety Toolkit</DialogTitle></DialogHeader>
                    <div className="py-4 space-y-2">
                        <Button variant="outline" className="w-full justify-start gap-2" onClick={handleShareRide}><Share2 className="w-4 h-4"/> Share Ride Details</Button>
                        <Button variant="outline" className="w-full justify-start gap-2"><LifeBuoy className="w-4 h-4"/> Contact Support</Button>
                        <Button variant="destructive" className="w-full justify-start gap-2"><Siren className="w-4 h-4"/> Emergency SOS</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 bg-muted/30">
          {renderContent()}
        </CardContent>
        {ride.status !== 'completed' && ride.status !== 'payment_pending' && (ride as any).status !== 'bill_sent' && (
             <CardFooter className="p-2">
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="link" size="sm" className="w-full text-muted-foreground">Cancel {isGarageRequest ? 'Request' : isAmbulanceCase ? 'Case' : 'Ride'}</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will cancel the current {isGarageRequest ? 'service request' : isAmbulanceCase ? 'emergency case' : 'ride'}. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Go Back</AlertDialogCancel>
                            <AlertDialogAction onClick={onCancel} className="bg-destructive hover:bg-destructive/80">Yes, Cancel</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardFooter>
        )}
    </Card>
  );
}
