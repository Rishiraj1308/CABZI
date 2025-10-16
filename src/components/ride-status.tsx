
      "use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { KeyRound, Shield, LifeBuoy, Share2, Phone, Star, Clock, MapPin, MessageSquare, Send, Wrench, IndianRupee, Hand, Navigation, Car, Siren } from "lucide-react";
import { Label } from "./ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel, AlertDialogAction, AlertDialogDescription } from "./ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useFirestore } from '@/firebase/client-provider';
import { collection, doc, onSnapshot, addDoc, serverTimestamp, orderBy, Timestamp, query, updateDoc } from "firebase/firestore";
import { Input } from "./ui/input";
import SearchingIndicator from "./ui/searching-indicator";

interface LocationObject {
  address: string;
  location: { lat: number; lon: number };
}

interface RideType {
  id: string;
  pickup?: LocationObject;
  destination?: LocationObject;
  status: "searching" | "accepted" | "in-progress" | "completed" | "cancelled_by_driver" | "payment_pending" | 'bill_sent' | 'cancelled_by_rider' | 'onTheWay' | 'arrived' | 'inTransit';
  otp?: string;
  driverDetails?: {
      name: string;
      vehicle: string;
      rating: number;
      photoUrl: string;
      phone: string;
  };
  riderName?: string;
  driverName?: string;
  driverEta?: number | null;
  fare?: number;
  issue?: string;
  totalAmount?: number;
  // --- AMBULANCE SPECIFIC ---
  caseId?: string;
  severity?: string;
  assignedPartner?: { name: string; ambulanceName?: string; phone?: string; };
  // --- MECHANIC SPECIFIC ---
  mechanicName?: string;
  mechanicPhone?: string;
}

interface ChatMessage {
    id: string;
    text: string;
    sender: 'rider' | 'driver';
    timestamp: Timestamp;
}

interface Props {
  ride: RideType | null;
  isGarageRequest?: boolean;
  onCancel: () => void;
  onDone?: () => void;
  onPayment?: (paymentMode: 'cash' | 'wallet') => void;
  onEndRide?: () => void;
  rating?: number;
  setRating?: (rating: number) => void;
}

export function RideStatus({ ride, isGarageRequest = false, onCancel, onDone, onPayment, onEndRide, rating, setRating }: Props) {
  const { toast } = useToast();
  const db = useFirestore();
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatSubmitting, setIsChatSubmitting] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [enteredOtp, setEnteredOtp] = useState('');

  const isAmbulanceCase = !!ride?.caseId;

  useEffect(() => {
    if (!ride?.id || !db) return;

    let collectionName = isGarageRequest ? 'garageRequests' : 'rides';
    if(isAmbulanceCase) collectionName = 'emergencyCases';

    const messagesRef = collection(db, collectionName, ride.id, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
        setChatMessages(messages);
    });

    return () => unsubscribe();
  }, [ride?.id, db, isGarageRequest, isAmbulanceCase]);

  if (!ride) return null;
  
  const handleCancelClick = () => {
    if (!db) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not connect to server to cancel.'});
        return;
    }
    onCancel();
  };

  const handleSendMessage = async () => {
    if (chatInput.trim() === '' || !ride || isChatSubmitting || !db) return;

    setIsChatSubmitting(true);
    const collectionName = isGarageRequest ? 'garageRequests' : 'rides';
    const messagesRef = collection(db, collectionName, ride.id, 'messages');
    
    try {
        await addDoc(messagesRef, {
            text: chatInput,
            sender: 'driver', // Assuming this component is always used by a driver-like entity
            timestamp: serverTimestamp()
        });
        setChatInput('');
    } catch (error) {
        console.error("Error sending message:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not send message.' });
    } finally {
        setIsChatSubmitting(false);
    }
  }
  
  const handleShareRide = () => {
    const trackingLink = `https://cabzi.app/track/${ride.id}`;
    const shareText = `I'm taking a Cabzi and I'm on my way! You can track my ride live here: ${trackingLink}`;
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(shareText).then(() => {
            toast({
                title: 'Ride Link Copied!',
                description: 'Your live ride tracking link has been copied to the clipboard.'
            });
        })
    }
  }
  
  const handlePaymentClick = async (paymentMode: 'cash' | 'wallet') => {
      setIsPaying(true);
      if(onPayment) {
        await onPayment(paymentMode);
      }
      setIsPaying(false);
  }

  const handleVerifyOtp = async () => {
    if(enteredOtp === ride?.otp && ride && db && onEndRide) {
        const rideRef = doc(db, 'rides', ride.id);
        await updateDoc(rideRef, { status: 'in-progress' });
    } else {
         toast({
            variant: 'destructive',
            title: "Invalid OTP",
            description: "Please ask the rider for the correct 4-digit OTP.",
         });
    }
  }

  const handleNavigate = () => {
    if (!ride) return;

    const isTripInProgress = ride.status === 'in-progress' || ride.status === 'inTransit';
    let destinationCoords;

    if (isTripInProgress) {
        // @ts-ignore
        destinationCoords = isAmbulanceCase ? ride.hospitalLocation : ride.destination?.location;
    } else {
        // @ts-ignore
        destinationCoords = isAmbulanceCase ? ride.location : ride.pickup?.location;
    }
    
    if(!destinationCoords) {
        toast({variant: 'destructive', title: 'Location Error', description: 'Destination coordinates not found.'});
        return;
    }

    const url = `https://www.google.com/maps/dir/?api=1&destination=${destinationCoords.latitude},${destinationCoords.longitude}`;
    window.open(url, '_blank');
  };

  const renderContent = () => {
    if (isAmbulanceCase) {
         switch(ride.status) {
            case 'searching':
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
                            <CardDescription>Paramedic: {ride.assignedPartner?.name}</CardDescription>
                        </CardHeader>
                        <div className="p-4 rounded-lg bg-muted text-center">
                            <p className="text-sm text-muted-foreground">Estimated Arrival Time</p>
                            <p className="text-4xl font-bold text-primary">{Math.ceil(ride.driverEta || 0)} min</p>
                        </div>
                        <Button className="w-full" asChild><a href={`tel:${ride.assignedPartner?.phone}`}><Phone className="mr-2 h-4 w-4"/> Call Paramedic</a></Button>
                     </div>
                );
            case 'inTransit':
                 return (
                     <div className="space-y-4 animate-fade-in">
                        <CardHeader className="p-0 text-center">
                            <CardTitle>In Transit to Hospital</CardTitle>
                            <CardDescription>{ride.assignedPartner?.name}</CardDescription>
                        </CardHeader>
                        <div className="p-4 rounded-lg bg-muted text-center">
                            <p className="text-sm text-muted-foreground">ETA to Hospital</p>
                            <p className="text-4xl font-bold text-primary">-- min</p>
                        </div>
                     </div>
                 )
            default:
                return null;
        }
    }

    if(isGarageRequest) {
        switch(ride.status) {
            case 'pending':
                return (
                     <div className="text-center py-10">
                        <SearchingIndicator partnerType="resq" />
                        <h3 className="text-2xl font-bold mt-4">Finding you help...</h3>
                        <p className="text-muted-foreground">Contacting nearby ResQ partners.</p>
                    </div>
                )
            case 'accepted':
            case 'in_progress':
                return (
                     <div className="space-y-4 animate-fade-in">
                        <CardHeader className="p-0 text-center">
                            <CardTitle>Mechanic on the way!</CardTitle>
                            <CardDescription>Issue: {ride.issue}</CardDescription>
                        </CardHeader>
                        <div className="flex items-center gap-3 bg-muted p-3 rounded-lg">
                             <Avatar className="w-12 h-12 border-2 border-primary">
                                <AvatarImage src={'https://placehold.co/100x100.png'} alt="Mechanic" data-ai-hint="mechanic portrait" />
                                <AvatarFallback>{ride.mechanicName?.substring(0,2)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <p className="font-bold">{ride.mechanicName}</p>
                                <p className="text-sm text-muted-foreground">OTP: <span className="font-bold text-foreground">{ride.otp}</span></p>
                            </div>
                            <Button asChild variant="outline" size="sm">
                                <a href={`tel:${ride.mechanicPhone}`}><Phone className="mr-2 h-4 w-4" /> Call</a>
                            </Button>
                        </div>
                     </div>
                );
            case 'bill_sent':
                 return (
                     <div className="space-y-4 animate-fade-in">
                        <CardHeader className="p-0 text-center">
                            <CardTitle>Payment Pending</CardTitle>
                            <CardDescription>The mechanic has sent the bill for the service.</CardDescription>
                        </CardHeader>
                        <Card className="bg-primary text-primary-foreground text-center p-4">
                            <CardContent className="p-0">
                                <p className="text-primary-foreground/80 text-sm">Total Amount Due</p>
                                <p className="text-5xl font-bold">₹{ride.totalAmount}</p>
                            </CardContent>
                        </Card>
                        <div className="grid grid-cols-2 gap-2">
                             <Button size="lg" className="w-full" onClick={() => handlePaymentClick('wallet')} disabled={isPaying}>
                                {isPaying ? "Processing..." : "Pay from Wallet"}
                            </Button>
                            <Button size="lg" variant="outline" className="w-full" onClick={() => handlePaymentClick('cash')} disabled={isPaying}>
                                Mark as Paid (Cash)
                            </Button>
                        </div>
                    </div>
                 )
            default:
                return <p>Unknown garage request status: {ride.status}</p>
        }
    }


    // Normal Ride Specific UI
    switch (ride.status) {
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
                        <CardDescription className="flex items-center gap-1"><Clock className="w-3 h-3"/> {ride.driverEta ? `Arriving in ${Math.ceil(ride.driverEta)} min` : 'Calculating ETA...'}</CardDescription>
                    </CardHeader>
                    <div className="p-4 rounded-lg bg-muted flex items-center gap-3">
                         <Avatar className="w-12 h-12"><AvatarImage src={ride.driverDetails?.photoUrl} alt={ride.driverDetails?.name} /><AvatarFallback>{ride.driverDetails?.name?.substring(0,2)}</AvatarFallback></Avatar>
                         <div className="flex-1">
                             <p className="font-bold">{ride.driverDetails?.name}</p>
                             <p className="text-sm text-muted-foreground">{ride.driverDetails?.vehicle} &bull; {ride.driverDetails?.rating} <Star className="w-3 h-3 inline-block -mt-1 ml-0.5" /></p>
                         </div>
                         <p className="font-bold text-lg">OTP: {ride.otp}</p>
                    </div>
                </div>
             );
      case "in-progress":
        return (
          <div className="space-y-4 animate-fade-in">
              <CardHeader className="p-0">
                <CardTitle>Trip to Destination</CardTitle>
                <CardDescription className="flex items-center gap-1"><Clock className="w-3 h-3"/>ETA: {ride.driverEta ? `${Math.ceil(ride.driverEta)} min` : 'Calculating...'}</CardDescription>
              </CardHeader>
                <div className="p-4 rounded-lg bg-muted flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                    <div><p className="font-semibold">{ride.destination?.address}</p></div>
                </div>
          </div>
        );
      case "payment_pending":
        return (
          <div className="text-center space-y-4 animate-fade-in">
            <Card className="bg-primary text-primary-foreground text-center">
                <CardContent className="p-4">
                  <p className="text-primary-foreground/80 text-sm">Total Fare</p>
                  <p className="text-5xl font-bold">₹{ride.fare}</p>
                </CardContent>
            </Card>
            <p className="text-muted-foreground text-sm">Please choose a payment method.</p>
            <div className="grid grid-cols-2 gap-2">
                <Button size="lg" className="w-full" onClick={onPayment} disabled={isPaying}>{isPaying ? 'Processing...' : 'Pay from Wallet'}</Button>
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
                <CardDescription>Please rate your experience with {ride.driverDetails?.name || 'the driver'}.</CardDescription>
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
        return null;
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
        {ride.status !== 'completed' && ride.status !== 'payment_pending' && ride.status !== 'bill_sent' && (
             <CardFooter className="p-2">
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="link" size="sm" className="w-full text-muted-foreground">Cancel {isGarageRequest ? 'Request' : 'Ride'}</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will cancel the current {isGarageRequest ? 'service request' : 'ride'}. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Go Back</AlertDialogCancel>
                            <AlertDialogAction variant="destructive" onClick={handleCancelClick}>Yes, Cancel</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardFooter>
        )}
    </Card>
  );
}

export default RideStatus;
