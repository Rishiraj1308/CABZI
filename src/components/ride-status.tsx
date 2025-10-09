
      "use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { KeyRound, Shield, LifeBuoy, Share2, Phone, Star, Clock, MapPin, MessageSquare, Send, Wrench, IndianRupee, Hand, Navigation } from "lucide-react";
import { Label } from "./ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel, AlertDialogAction, AlertDialogDescription } from "./ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
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
  status: "searching" | "accepted" | "in-progress" | "completed" | "cancelled_by_driver" | "payment_pending" | 'bill_sent' | 'cancelled_by_rider';
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
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatSubmitting, setIsChatSubmitting] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [enteredOtp, setEnteredOtp] = useState('');

  useEffect(() => {
    if (!ride?.id || !db) return;

    const collectionName = isGarageRequest ? 'garageRequests' : 'rides';
    const messagesRef = collection(db, collectionName, ride.id, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
        setChatMessages(messages);
    });

    return () => unsubscribe();
  }, [ride?.id, db, isGarageRequest]);

  if (!ride) return null;
  
  const handleCancelClick = () => {
    if (!db) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not connect to server to cancel.'});
        return;
    }
    onCancel();
  };

  const handleSendMessage = async () => {
    if (chatInput.trim() === '' || !ride || isChatSubmitting) return;

    setIsChatSubmitting(true);
    const collectionName = isGarageRequest ? 'garageRequests' : 'rides';
    const messagesRef = collection(db, collectionName, ride.id, 'messages');
    
    try {
        await addDoc(messagesRef, {
            text: chatInput,
            sender: 'driver',
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
        localStorage.setItem('activeRideId', ride.id);
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

    const isTripInProgress = ride.status === 'in-progress';
    const destinationCoords = isTripInProgress
      ? ride.destination?.location
      : ride.pickup?.location;
    
    if(!destinationCoords) {
        toast({variant: 'destructive', title: 'Location Error', description: 'Destination coordinates not found.'});
        return;
    }

    const url = `https://www.google.com/maps/dir/?api=1&destination=${destinationCoords.lat},${destinationCoords.lon}`;
    window.open(url, '_blank');
  };

  const renderContent = () => {
    if(isGarageRequest) {
        switch(ride.status) {
            case 'accepted':
            case 'in_progress':
                return (
                     <div className="space-y-4 animate-fade-in">
                        <CardHeader className="p-0 text-center">
                            <CardTitle>Driver needs help!</CardTitle>
                            <CardDescription>Issue: {ride.issue}</CardDescription>
                        </CardHeader>
                        <div className="flex items-center gap-3 bg-muted p-3 rounded-lg">
                            <div className="flex-1">
                                <p className="font-bold">{ride.driverName}</p>
                                <p className="text-sm text-muted-foreground">OTP: <span className="font-bold text-foreground">{ride.otp}</span></p>
                            </div>
                            <Button asChild variant="outline" size="sm">
                                <a href={`tel:${ride.driverDetails?.phone}`}><Phone className="mr-2 h-4 w-4" /> Call</a>
                            </Button>
                        </div>
                     </div>
                );
            case 'bill_sent':
                 return (
                     <div className="space-y-4 animate-fade-in">
                        <CardHeader className="p-0 text-center">
                            <CardTitle>Payment Pending</CardTitle>
                            <CardDescription>The mechanic has sent the bill.</CardDescription>
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
                        <CardTitle>Navigate to Pickup</CardTitle>
                        <CardDescription className="flex items-center gap-1"><Clock className="w-3 h-3"/> {ride.driverEta ? `Est. arrival in ${Math.ceil(ride.driverEta)} min` : 'Calculating ETA...'}</CardDescription>
                    </CardHeader>
                    <div className="p-4 rounded-lg bg-muted flex items-center gap-3">
                         <Avatar className="w-12 h-12"><AvatarImage src={ride.driverDetails?.photoUrl} alt={ride.driverDetails?.name} /><AvatarFallback>{ride.driverDetails?.name?.substring(0,2)}</AvatarFallback></Avatar>
                         <div className="flex-1">
                             <p className="font-bold">{ride.driverDetails?.name}</p>
                             <p className="text-sm text-muted-foreground">{ride.driverDetails?.vehicle} &bull; {ride.driverDetails?.rating} <Star className="w-3 h-3 inline-block -mt-1 ml-0.5" /></p>
                         </div>
                    </div>
                    <div className="p-4 rounded-lg bg-muted flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                        <div><p className="font-semibold">{ride.pickup?.address}</p></div>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-accent/20 border-2 border-dashed border-accent">
                        <Label>Enter this OTP after pickup</Label>
                        <Input className="mt-1 text-4xl font-bold tracking-[0.5em] text-accent-foreground text-center bg-transparent border-0 h-auto" placeholder="••••" value={enteredOtp} onChange={(e) => setEnteredOtp(e.target.value)} maxLength={4} />
                    </div>
                    <Button size="lg" className="w-full" onClick={handleVerifyOtp}>Verify OTP & Start Ride</Button>
                </div>
             );
      case "in-progress":
        return (
          <div className="space-y-4 animate-fade-in">
              <CardHeader className="p-0">
                <CardTitle>Trip to Destination</CardTitle>
                <CardDescription className="flex items-center gap-1"><Clock className="w-3 h-3"/>{ride.driverEta ? `Est. arrival in ${Math.ceil(ride.driverEta)} min` : 'Calculating ETA...'}</CardDescription>
              </CardHeader>
                <div className="p-4 rounded-lg bg-muted flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                    <div><p className="font-semibold">{ride.destination?.address}</p></div>
                </div>
             <Button size="lg" className="w-full bg-destructive hover:bg-destructive/90" onClick={onEndRide}>End Ride</Button>
          </div>
        );
      case "payment_pending":
      case "completed":
        return (
             <div className="text-center space-y-4 animate-fade-in p-6">
                <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                    <IndianRupee className="w-8 h-8 text-green-600" />
                </div>
                <CardTitle>Trip Completed</CardTitle>
                <CardDescription>Payment of ₹{ride.fare} has been received.</CardDescription>
                <Button onClick={onDone} className="w-full">Done</Button>
            </div>
        );
      default:
        return null;
    }
  };

  const getActiveRideTitle = () => {
    if (!ride) return "Loading...";
    if (isGarageRequest) return "Service Request";

    switch(ride.status) {
        case 'accepted': return 'Partner is on the way';
        case 'in-progress': return 'Trip in Progress';
        case 'payment_pending': return 'Payment & Rating';
        case 'completed': return 'Trip Finished';
        default: return 'Ride Status';
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto shadow-2xl animate-fade-in">
        <CardHeader className="p-4 flex-row items-center justify-between">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-full"><Car className="w-5 h-5 text-primary"/></div>
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
        {!isGarageRequest && ride.status !== 'searching' && ride.status !== 'completed' && ride.status !== 'payment_pending' && (
             <CardFooter className="p-2">
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="link" size="sm" className="w-full text-muted-foreground">Cancel Ride</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will cancel the current ride. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Go Back</AlertDialogCancel>
                            <AlertDialogAction variant="destructive" onClick={handleCancelClick}>Yes, Cancel Ride</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardFooter>
        )}
    </Card>
  );
}

export default RideStatus;

    