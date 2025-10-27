
'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Star, CheckCircle, Car, Route, Shield, LifeBuoy, Phone, Sparkles, KeyRound, Clock, Pin, User as UserIcon, Send, ScanLine, Wallet, BarChart, Settings, Power, CircleDot, CreditCard, Bot, ChevronsUpDown, AlertCircle, Hand, History, IndianRupee, Eye, Navigation, LocateFixed, HeartHandshake, MessageSquare, Wrench, Ambulance, FileText, PlusCircle, Trash2, Building, Siren, QrCode } from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, } from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import dynamic from 'next/dynamic'
import { useFirebase } from '@/firebase/client-provider'
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc, serverTimestamp, GeoPoint, limit, runTransaction, addDoc, arrayUnion, orderBy, Timestamp, FieldValue } from 'firebase/firestore'
import { useNotifications } from '@/context/NotificationContext'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import BrandLogo from '@/components/brand-logo'
import SearchingIndicator from '@/components/ui/searching-indicator'
import { onMessage } from 'firebase/messaging'


const LiveMap = dynamic(() => import('@/components/live-map'), { 
    ssr: false,
    loading: () => <div className="w-full h-full bg-muted flex items-center justify-center"><p>Loading Map...</p></div>
});
const RideStatus = dynamic(() => import('@/components/ride-status'), { ssr: false });

const QrScanner = dynamic(() => import('@/components/ui/qr-scanner'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center w-full h-full bg-muted"><p>Loading Scanner...</p></div>
})


interface RideRequest {
    id: string;
    pickup: { address: string, location: GeoPoint };
    destination: { address: string, location: GeoPoint };
    fare: number;
    rideType: string;
    status: "searching" | "accepted" | "in-progress" | "completed" | "cancelled_by_driver" | "cancelled_by_rider" | "payment_pending";
    riderName: string;
    riderId: string;
    riderGender: 'male' | 'female' | 'other';
    otp: string;
    rejectedBy?: string[];
    driverDetails?: {
        name: string;
        vehicle: string;
        rating: number;
        photoUrl: string;
        phone: string;
    };
    driverEta?: number | null;
}

interface RouteInfo {
    distance: number; // in km
    duration: number; // in minutes
    geometry?: any;
}

interface BankDetails {
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
}

interface PartnerData {
    id: string;
    partnerId: string;
    name: string;
    phone: string;
    vehicleType: string;
    vehicleName: string;
    vehicleNumber: string;
    rating?: number;
    acceptanceRate?: number;
    ridesToday?: number;
    walletBalance?: number;
    todaysEarnings?: number;
    currentLocation?: { lat: number, lon: number };
    bankDetails?: BankDetails;
    upiId?: string;
    qrCodeUrl?: string;
    isCabziPinkPartner?: boolean;
    subscription?: { planName: string };
    gender?: 'male' | 'female' | 'other';
    status?: string;
    isOnline?: boolean;
}

interface ChatMessage {
    id: string;
    text: string;
    sender: 'rider' | 'driver';
    timestamp: Timestamp;
}

interface GarageRequest {
    id: string;
    driverId: string;
    driverName: string;
    driverPhone: string;
    issue: string;
    location: GeoPoint;
    mechanicId?: string;
    mechanicName?: string;
    mechanicLocation?: GeoPoint;
    eta?: number;
    phone?: string;
    status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled_by_mechanic' | 'cancelled_by_driver' | 'payment_requested' | 'bill_sent';
    otp: string;
    fare?: number;
    paymentMode?: 'cash' | 'wallet';
    billItems?: { description: string, amount: number }[];
    totalAmount?: number;
    invoiceId?: string;
    billDate?: Timestamp;
    billedTo?: string;
}

const commonIssues = [
    { id: 'flat_tyre', label: 'Flat Tyre / Puncture' },
    { id: 'battery_jumpstart', label: 'Battery Jump-Start' },
    { id: 'engine_trouble', label: 'Minor Engine Trouble' },
    { id: 'towing_required', label: 'Towing Required' },
    { id: 'other', label: 'Other Issue' },
]


export default function DriverDashboard({ partnerData, setPartnerData }: { partnerData: PartnerData | null, setPartnerData: (data: PartnerData | null) => void}) {
  const [isMounted, setIsMounted] = useState(false);
  const [activeRideRequest, setActiveRideRequest] = useState<RideRequest | null>(null);
  const [acceptedRide, setAcceptedRide] = useState<RideRequest | null>(null);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [isOnline, setIsOnline] = useState(partnerData?.isOnline || false);
  const [isLoading, setIsLoading] = useState(true);
  const [routeGeometry, setRouteGeometry] = useState<any>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [riderLocation, setRiderLocation] = useState<{lat: number, lon: number} | null>(null);
  const { setNotifications } = useNotifications();
  const [isUpiPayDialogOpen, setIsUpiPayDialogOpen] = useState(false);
  const [isPayNumberDialogOpen, setIsPayNumberDialogOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedUpiId, setScannedUpiId] = useState('');
  const [scannedAmount, setScannedAmount] = useState('');
  const [riderPhoneNumber, setRiderPhoneNumber] = useState<string | null>(null);
  const [paymentStep, setPaymentStep] = useState<'details' | 'pin'>('details');
  const [paymentDetails, setPaymentDetails] = useState({ upiId: '', amount: '' });
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isEarningsVisible, setIsEarningsVisible] = useState(false);
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [requestTimeout, setRequestTimeout] = useState(10);
  const [showPinkGreeting, setShowPinkGreeting] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatSubmitting, setIsChatSubmitting] = useState(false);
  const [activeGarageRequest, setActiveGarageRequest] = useState<GarageRequest | null>(null);
  const [isIssueDialogOpen, setIsIssueDialogOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState('');
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isBankDetailsDialogOpen, setIsBankDetailsDialogOpen] = useState(false);

  const db = useFirestore();
  const messaging = useMessaging();
  
  const acceptedRideRef = useRef(acceptedRide);
  const requestTimerRef = useRef<NodeJS.Timeout | null>(null);
  const earningsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const notificationSoundRef = useRef<HTMLAudioElement | null>(null);

  const { toast } = useToast()

  useEffect(() => {
    notificationSoundRef.current = new Audio('/sounds/notification.mp3');
    setIsMounted(true);
    if(partnerData) {
        setIsOnline(partnerData.isOnline || false);
        setIsLoading(false);
    }
  }, [partnerData]);
  
  useEffect(() => {
    acceptedRideRef.current = acceptedRide;
  }, [acceptedRide]);

  
  // New simplified effect to listen for FCM messages
  useEffect(() => {
    if (!messaging || !isOnline || !partnerData?.id || acceptedRide || activeRideRequest) return;

    const unsubscribe = onMessage(messaging, (payload) => {
        console.log('FCM Message received.', payload);
        const { type, rideId, ...rideData } = payload.data || {};

        if (type === 'new_ride_request' && rideId) {
            const newRide: RideRequest = {
                id: rideId,
                pickup: { address: rideData.pickupAddress, location: JSON.parse(rideData.pickupLocation) },
                destination: { address: rideData.destinationAddress, location: JSON.parse(rideData.destinationLocation) },
                fare: parseFloat(rideData.fare),
                rideType: rideData.rideType,
                status: "searching",
                riderName: rideData.riderName,
                riderId: rideData.riderId,
                riderGender: rideData.riderGender as 'male' | 'female' | 'other',
                otp: rideData.otp,
            };
            
            if (!activeRideRequest && !acceptedRide) {
                setActiveRideRequest(newRide);
                notificationSoundRef.current?.play().catch(e => console.log("Audio play failed:", e));
            }
        }
    });

    return () => unsubscribe();
  }, [isOnline, partnerData, acceptedRide, activeRideRequest, messaging]);
  
  
  useEffect(() => {
    if (partnerData?.isCabziPinkPartner) {
        const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
        const greetingKey = `curocity-pink-greeting-shown-${today}`;

        const hasBeenShownToday = localStorage.getItem(greetingKey);

        if (!hasBeenShownToday) {
            setShowPinkGreeting(true);
            localStorage.setItem(greetingKey, 'true');

            const timer = setTimeout(() => {
                setShowPinkGreeting(false);
            }, 10000); // 10 seconds

            return () => clearTimeout(timer);
        }
    }
  }, [partnerData?.isCabziPinkPartner]);

  const handleAvailabilityChange = async (checked: boolean) => {
    if (!partnerData || !db) return;
    setIsOnline(checked);
    const partnerRef = doc(db, "partners", partnerData.id);
    try {
        await updateDoc(partnerRef, { isOnline: checked });
        toast({
            title: checked ? "You are now Online" : "You are now Offline",
            description: checked ? "Waiting for nearby ride requests." : "You will not receive new ride requests.",
        });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not update your status.' });
        setIsOnline(!checked); // Revert on failure
    }
  }

  const resetRideState = useCallback(async () => {
    if (db && partnerData) {
        const partnerRef = doc(db, 'partners', partnerData.id);
        await updateDoc(partnerRef, { status: 'online' });
    }
    localStorage.removeItem('activeRideId');
    setAcceptedRide(null);
    setRouteGeometry(null);
    setRouteInfo(null);
    setRiderLocation(null);
  }, [db, partnerData]);
  
  // Effect for the 10-second request timer
    useEffect(() => {
        if (activeRideRequest && !requestTimerRef.current) {
            setRequestTimeout(10);
            requestTimerRef.current = setInterval(() => {
                setRequestTimeout(prev => {
                    if (prev <= 1) {
                        handleDeclineRide(true); // Automatically decline
                        if (requestTimerRef.current) clearInterval(requestTimerRef.current);
                        requestTimerRef.current = null;
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else if (!activeRideRequest && requestTimerRef.current) {
            clearInterval(requestTimerRef.current);
            requestTimerRef.current = null;
        }

        return () => {
            if (requestTimerRef.current) {
                clearInterval(requestTimerRef.current);
                requestTimerRef.current = null;
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeRideRequest]);

   // Effect to listen for cancellations on an accepted ride
    useEffect(() => {
        if (!acceptedRide || !db) return;

        const rideRef = doc(db, 'rides', acceptedRide.id);
        const unsubscribe = onSnapshot(rideRef, (docSnap) => {
            if (docSnap.exists()) {
                const rideData = docSnap.data();
                if (rideData.status === 'cancelled_by_rider') {
                    toast({
                        variant: 'destructive',
                        title: 'Ride Cancelled by Rider',
                        description: 'The rider has cancelled the ride. Looking for new rides.'
                    });
                    resetRideState();
                }
            }
        });
        
        return () => unsubscribe();
    }, [acceptedRide, db, toast, resetRideState]);
  
  // Effect to fetch route when a ride has been accepted or started
  useEffect(() => {
    const getRouteInfo = async (startCoords: any, endCoords: any): Promise<RouteInfo | null> => {
        try {
            const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startCoords.lon},${startCoords.lat};${endCoords.lon},${endCoords.lat}?overview=full&geometries=geojson`;
            const response = await fetch(osrmUrl);
            if (!response.ok) {
                 const errorText = await response.text().catch(() => `OSRM API Error`);
                 console.error(`OSRM API Error (${response.status}):`, errorText);
                 return null;
            }
            const data = await response.json();
            if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                return {
                    distance: route.distance / 1000,
                    duration: Math.round(route.duration / 60 * 1.2), // Add 20% buffer for traffic
                    geometry: route.geometry,
                };
            }
            return null;
        } catch (error) {
            console.error('Routing error:', error);
            return null;
        }
    };
    if (!acceptedRide || !partnerData?.currentLocation) return;
    
    if (acceptedRide.status === 'accepted') {
        const riderPickupCoords = {
            lat: acceptedRide.pickup.location.latitude,
            lon: acceptedRide.pickup.location.longitude
        };
        setRiderLocation(riderPickupCoords);
        getRouteInfo(partnerData.currentLocation, riderPickupCoords).then(info => {
            if (info) {
                setRouteGeometry(info.geometry);
                setRouteInfo(info);
            }
        });
    }

    if (acceptedRide.status === 'in-progress') {
        setRiderLocation(null); 
        const destinationCoords = {
            lat: acceptedRide.destination.location.latitude,
            lon: acceptedRide.destination.location.longitude
        }
        const pickupCoords = {
            lat: acceptedRide.pickup.location.latitude,
            lon: acceptedRide.pickup.location.longitude
        }
        getRouteInfo(pickupCoords, destinationCoords).then(info => {
             if (info) {
                setRouteGeometry(info.geometry);
                setRouteInfo(info);
            }
        });
    }

  }, [acceptedRide, partnerData?.currentLocation]);

  // Unified listener for garage requests for the current partner
  useEffect(() => {
    if (!db || !partnerData?.id) return;

    const q = query(
        collection(db, "garageRequests"),
        where("driverId", "==", partnerData.id),
        where("status", "in", ["pending", "accepted", "in_progress", "bill_sent"])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
            const requestDoc = snapshot.docs[0];
            const requestData = requestDoc.data();
            const currentStatus = activeGarageRequest?.status;

            setActiveGarageRequest({ id: requestDoc.id, ...requestData } as GarageRequest);
            localStorage.setItem('activeGarageRequestId', requestDoc.id);

            // Trigger toasts on status changes
            if (requestData.status === 'accepted' && currentStatus !== 'accepted') {
                toast({ title: "ResQ Partner Assigned!", description: `${requestData.mechanicName} is on their way.` });
            }
            if (requestData.status === 'bill_sent' && currentStatus !== 'bill_sent') {
                toast({
                    title: "Bill Received",
                    description: `You have received a bill of ₹${requestData.totalAmount} from ${requestData.mechanicName}.`,
                    duration: 9000
                });
            }
        } else {
            setActiveGarageRequest(null);
            localStorage.removeItem('activeGarageRequestId');
        }
    });

    return () => unsubscribe();
  }, [partnerData?.id, db, toast, activeGarageRequest?.status]);
  
  const handleAcceptRide = async () => {
    if (!activeRideRequest || !db || !partnerData || !partnerData.id) {
        toast({ variant: 'destructive', title: 'Error Accepting Ride' });
        return;
    }
    
    if (requestTimerRef.current) {
        clearInterval(requestTimerRef.current);
        requestTimerRef.current = null;
    }

    const partnerRef = doc(db, 'partners', partnerData.id);
    const rideRef = doc(db, 'rides', activeRideRequest.id);

    try {
        await runTransaction(db, async (transaction) => {
            const partnerDoc = await transaction.get(partnerRef);
            if (!partnerDoc.exists()) throw "Partner document does not exist!";
            
            const livePartnerData = partnerDoc.data();
            if (!livePartnerData || !livePartnerData.currentLocation) {
                throw "Could not get your current location.";
            }

            transaction.update(rideRef, {
                status: 'accepted',
                driverId: partnerData.id,
                driverName: partnerData.name,
                driverPhone: partnerData.phone,
                driverVehicle: `${partnerData.vehicleName} - ${partnerData.vehicleNumber}`,
                driverRating: partnerData.rating,
                driverPhotoUrl: 'https://placehold.co/100x100.png',
                driverLocation: livePartnerData.currentLocation,
                driverUpiId: partnerData.upiId,
                driverQrCodeUrl: partnerData.qrCodeUrl,
            });
            
            // Set partner status to 'on_trip'
            transaction.update(partnerRef, { status: 'on_trip' });
        });
        
        localStorage.setItem('activeRideId', activeRideRequest.id);

        toast({
            title: "Ride Accepted!",
            description: "Navigate to the pickup location. Enter OTP from rider to start.",
        });
        setAcceptedRide({...activeRideRequest, status: 'accepted'});
        setRiderPhoneNumber(activeRideRequest.riderId);
        setActiveRideRequest(null); 
    } catch (error) {
        console.error("Failed to accept ride:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not accept the ride. It might have been taken.'})
    }
  }

  const handleDeclineRide = async (isTimeout = false) => {
     if (!activeRideRequest || !db || !partnerData?.id) return;

     if (requestTimerRef.current) {
         clearInterval(requestTimerRef.current);
         requestTimerRef.current = null;
     }

     const rideRef = doc(db, 'rides', activeRideRequest.id);
     
     await updateDoc(rideRef, {
        rejectedBy: arrayUnion(partnerData.id)
     });

     if (!isTimeout) {
         toast({
            title: "Ride Declined",
            description: "You will be shown the next available ride.",
         });
     } else {
        toast({
            variant: 'destructive',
            title: "Request Timed Out",
            description: "Looking for next available ride.",
        });
     }

     setActiveRideRequest(null); 
     setRouteGeometry(null);
     setRiderLocation(null);
     setRouteInfo(null);
  }

  const handleEndRide = async () => {
      if (!db || !acceptedRide || !partnerData) return;
      const rideRef = doc(db, 'rides', acceptedRide.id);
      const partnerRef = doc(db, 'partners', partnerData.id);

      try {
          await runTransaction(db, async (transaction) => {
              const partnerDoc = await transaction.get(partnerRef);
              if (!partnerDoc.exists()) {
                  throw "Partner document does not exist!";
              }

              const rideFare = acceptedRide.fare || 0;
              const newWalletBalance = (partnerDoc.data().walletBalance || 0) + rideFare;
              const newRidesToday = (partnerDoc.data().ridesToday || 0) + 1;
              const newTodaysEarnings = (partnerDoc.data().todaysEarnings || 0) + rideFare;


              transaction.update(rideRef, { status: 'completed', fare: rideFare });
              transaction.update(partnerRef, { 
                  walletBalance: newWalletBalance, 
                  ridesToday: newRidesToday,
                  todaysEarnings: newTodaysEarnings,
                  status: 'online', // Reset status to online
              });
              
              const transactionRef = doc(collection(db, `partners/${partnerData.id}/transactions`));
              transaction.set(transactionRef, {
                  type: `Ride Fare (ID: ${acceptedRide.id.substring(0, 6)})`,
                  amount: rideFare,
                  status: 'Credit',
                  date: serverTimestamp()
              });
          });
          
          resetRideState();
          toast({ title: 'Trip Completed!', description: `₹${acceptedRide.fare} has been added to your wallet.` });

      } catch (error) {
          console.error("Failed to end ride and update wallet: ", error);
          toast({ variant: 'destructive', title: 'Error', description: 'Could not complete the ride. Please try again.' });
      }
  }

  const handleUpiPaymentSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!db || !partnerData) return;

    const formData = new FormData(event.currentTarget);
    const amountToPay = parseFloat(formData.get('amount') as string);
    const upiId = formData.get('upiId') as string;

    if (isNaN(amountToPay) || amountToPay <= 0 || !upiId) {
      toast({ variant: 'destructive', title: 'Invalid Input', description: 'Please enter a valid amount and UPI ID.' });
      return;
    }

    if (amountToPay > (partnerData.walletBalance || 0)) {
      toast({ variant: 'destructive', title: 'Insufficient Balance', description: 'You do not have enough funds to make this payment.' });
      return;
    }

    setPaymentDetails({ upiId, amount: String(amountToPay) });
    setPaymentStep('pin');
  }

  const handleConfirmPin = async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setIsProcessingPayment(true);
      
      const formData = new FormData(event.currentTarget);
      const pin = formData.get('pin') as string;
      const storedPin = localStorage.getItem('curocity-user-pin');

      if (pin !== storedPin) {
          toast({ variant: 'destructive', title: 'Incorrect PIN', description: 'The UPI PIN you entered is incorrect. Please try again.' });
          setIsProcessingPayment(false);
          return;
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (!db || !partnerData) {
          setIsProcessingPayment(false);
          return;
      }

      const partnerRef = doc(db, 'partners', partnerData.id);
      try {
        await runTransaction(db, async (transaction) => {
          const partnerDoc = await transaction.get(partnerRef);
          if (!partnerDoc.exists()) throw "Partner does not exist!";
          
          const currentBalance = partnerDoc.data().walletBalance || 0;
          const amountToPay = parseFloat(paymentDetails.amount);

          if (amountToPay > currentBalance) throw "Insufficient funds";

          const newBalance = currentBalance - amountToPay;
          transaction.update(partnerRef, { walletBalance: newBalance });

          const transactionRef = doc(collection(db, `partners/${partnerData.id}/transactions`));
          transaction.set(transactionRef, {
              type: `UPI Payment to ${paymentDetails.upiId}`,
              amount: -amountToPay,
              status: 'Debit',
              date: serverTimestamp()
          });
        });

        toast({
          title: 'Payment Successful',
          description: `₹${paymentDetails.amount} has been paid to ${paymentDetails.upiId}.`,
          className: 'bg-green-600 text-white border-green-600'
        });
        setIsUpiPayDialogOpen(false);
        setScannedUpiId('');
        setScannedAmount('');
        setPaymentStep('details');
        setPaymentDetails({upiId: '', amount: ''});

      } catch (error) {
        console.error('UPI Payment failed:', error);
        toast({ variant: 'destructive', title: 'Payment Failed', description: 'The transaction could not be completed.' });
      } finally {
        setIsProcessingPayment(false);
      }
  }
  
  const handleCancelRide = useCallback(async () => {
    if (!db || !acceptedRide) return;
    const rideRef = doc(db, 'rides', acceptedRide.id);
    await updateDoc(rideRef, { status: 'cancelled_by_driver' });
    toast({variant:'destructive', title: 'Ride Cancelled'});
    resetRideState();
  }, [db, acceptedRide, resetRideState, toast]);

  useEffect(() => {
    if (!isUpiPayDialogOpen) {
        setTimeout(() => {
            setPaymentStep('details');
            setPaymentDetails({upiId: '', amount: ''});
        }, 300);
    }
  }, [isUpiPayDialogOpen]);


    useEffect(() => {
        if (!isScannerOpen) return;

        let stream: MediaStream;
        const getCameraPermission = async () => {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            setHasCameraPermission(true);

            if (videoRef.current) {
            videoRef.current.srcObject = stream;
            }
        } catch (error) {
            console.error('Error accessing camera:', error);
            setHasCameraPermission(false);
            toast({
            variant: 'destructive',
            title: 'Camera Access Denied',
            description: 'Please enable camera permissions in your browser settings to use the scanner.',
            });
        }
        };

        getCameraPermission();

        return () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        };
    }, [isScannerOpen, toast]);

  const handleScanResult = (result: any, error: any) => {
    if (result) {
        const textResult = result?.getText();
        if (typeof textResult === 'string' && textResult.startsWith('upi://pay?')) {
            const urlParams = new URLSearchParams(textResult.split('?')[1]);
            const pa = urlParams.get('pa');
            const am = urlParams.get('am');

            if (pa) {
                setScannedUpiId(pa);
                if (am) setScannedAmount(am);
                setIsScannerOpen(false);
                setIsUpiPayDialogOpen(true);
                toast({
                    title: "QR Code Scanned!",
                    description: "Payment details have been filled automatically."
                });
            } else {
                 toast({ variant: 'destructive', title: "Invalid QR", description: "This is not a valid UPI QR code." });
            }
        } else {
             toast({ variant: 'destructive', title: "Not a UPI QR", description: "Please scan a valid UPI QR code." });
        }
    }

    if (error && error.name !== "NotFoundException") {
       console.error("QR Scanner Error:", error);
    }
  }


  const handlePinSubmit = () => {
      const storedPin = localStorage.getItem('curocity-user-pin');
      if (!storedPin) {
          toast({ variant: 'destructive', title: 'PIN Not Set', description: 'Please set a UPI PIN from your profile first.' });
          return;
      }
      if (enteredPin === storedPin) {
          setIsEarningsVisible(true);
          setIsPinDialogOpen(false);
          setEnteredPin('');
          toast({ title: 'Earnings Revealed', description: 'Your earnings for today are now visible.' });

          if (earningsTimerRef.current) clearTimeout(earningsTimerRef.current);
          earningsTimerRef.current = setTimeout(() => {
              setIsEarningsVisible(false);
          }, 10000);
      } else {
          toast({ variant: 'destructive', title: 'Invalid PIN', description: 'Please enter the correct 4-digit PIN.' });
      }
  }

  useEffect(() => {
    return () => {
        if (earningsTimerRef.current) {
            clearTimeout(earningsTimerRef.current);
        }
    };
  }, []);
  
  const handleNavigate = () => {
    if (!acceptedRide) return;

    const isTripInProgress = acceptedRide.status === 'in-progress';
    const destinationCoords = isTripInProgress
      ? acceptedRide.destination.location
      : acceptedRide.pickup.location;

    const url = `https://www.google.com/maps/dir/?api=1&destination=${destinationCoords.latitude},${destinationCoords.longitude}`;
    window.open(url, '_blank');
  };

  useEffect(() => {
    if (!acceptedRide || !db) return;
    const messagesRef = collection(db, 'rides', acceptedRide.id, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
      setChatMessages(messages);
    });

    return () => unsubscribe();

  }, [acceptedRide, db]);

  const handleSendMessage = async () => {
    if (chatInput.trim() === '' || !acceptedRide || !partnerData || isChatSubmitting) return;

    setIsChatSubmitting(true);
    const messagesRef = collection(db, 'rides', acceptedRide.id, 'messages');
    
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
  
  const handleRequestMechanic = async () => {
    if (!db || !partnerData || !partnerData.currentLocation || !selectedIssue) {
        toast({ variant: "destructive", title: "Error", description: "Could not get your location or user details." });
        return;
    }
    const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
    const requestData = {
        driverId: partnerData.id,
        driverName: partnerData.name,
        driverPhone: partnerData.phone,
        issue: selectedIssue,
        location: new GeoPoint(partnerData.currentLocation.lat, partnerData.currentLocation.lon),
        status: 'pending' as const,
        otp: generatedOtp,
        createdAt: serverTimestamp(),
    };
    const requestDocRef = await addDoc(collection(db, 'garageRequests'), requestData);

    localStorage.setItem('activeGarageRequestId', requestDocRef.id);
    setActiveGarageRequest({ id: requestDocRef.id, ...requestData } as GarageRequest);
    toast({ title: "Request Sent!", description: "We are finding a nearby ResQ partner for you." });
    setIsIssueDialogOpen(false);
  }

  const handleCancelServiceRequest = async () => {
    if (!db || !activeGarageRequest) return;
    const requestRef = doc(db, 'garageRequests', activeGarageRequest.id);
    try {
      await updateDoc(requestRef, { status: 'cancelled_by_driver' });
      toast({ variant: 'destructive', title: 'Service Request Cancelled' });
      setActiveGarageRequest(null);
      localStorage.removeItem('activeGarageRequestId');
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not cancel the request.' });
    }
  };
  
  const handleGaragePayment = async (paymentMode: 'cash' | 'wallet') => {
    if (!db || !activeGarageRequest || !partnerData || !activeGarageRequest.mechanicId) return;

    const driverRef = doc(db, 'partners', partnerData.id);
    const garageRequestRef = doc(db, 'garageRequests', activeGarageRequest.id);
    const mechanicRef = doc(db, 'mechanics', activeGarageRequest.mechanicId);

    try {
        await runTransaction(db, async (transaction) => {
            if (paymentMode === 'wallet') {
                const driverDoc = await transaction.get(driverRef);
                const mechanicDoc = await transaction.get(mechanicRef);

                if (!driverDoc.exists() || !mechanicDoc.exists()) {
                    throw new Error("Driver or Mechanic not found");
                }

                const amount = activeGarageRequest.totalAmount || 0;
                const driverBalance = driverDoc.data().walletBalance || 0;

                if (driverBalance < amount) {
                    throw new Error("Insufficient wallet balance");
                }

                // Debit driver
                transaction.update(driverRef, { walletBalance: driverBalance - amount });
                const driverTxRef = doc(collection(db, `partners/${partnerData.id}/transactions`));
                transaction.set(driverTxRef, {
                    type: `ResQ Service Payment to ${activeGarageRequest.mechanicName}`,
                    amount: -amount,
                    status: 'Debit',
                    date: serverTimestamp()
                });
                
                // Credit mechanic
                const mechanicBalance = mechanicDoc.data().walletBalance || 0;
                transaction.update(mechanicRef, { walletBalance: mechanicBalance + amount });
                const mechanicTxRef = doc(collection(db, `mechanics/${activeGarageRequest.mechanicId}/transactions`));
                transaction.set(mechanicTxRef, {
                    type: `Service Payment from ${partnerData.name}`,
                    amount: amount,
                    status: 'Credit',
                    date: serverTimestamp()
                });
            }
            
            // Mark the job as completed
            transaction.update(garageRequestRef, { status: 'completed', paymentMode });
        });

        toast({
            title: `Payment Successful via ${paymentMode}`,
            description: `₹${activeGarageRequest.totalAmount} has been paid.`,
            className: "bg-green-600 text-white border-green-600"
        });

        setActiveGarageRequest(null);
        localStorage.removeItem('activeGarageRequestId');

    } catch (error: any) {
        console.error("Garage payment failed:", error);
        toast({
            variant: 'destructive',
            title: 'Payment Failed',
            description: error.message || 'There was an issue processing the payment.'
        });
    }
  }
  
  const handleBankDetailsSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!partnerData || !db) return;

    const formData = new FormData(event.currentTarget);
    const accountHolderName = formData.get('holderName') as string;
    const accountNumber = formData.get('accountNumber') as string;
    const confirmAccountNumber = formData.get('confirmAccountNumber') as string;
    const ifscCode = formData.get('ifscCode') as string;

    if (accountNumber !== confirmAccountNumber) {
        toast({ variant: 'destructive', title: 'Account Numbers Do Not Match' });
        return;
    }
    
    const bankDetails = { accountHolderName, accountNumber, ifscCode };
    
    try {
        const partnerRef = doc(db, 'partners', partnerData.id);
        await updateDoc(partnerRef, { bankDetails });
        toast({ title: 'Bank Account Linked', description: 'Your bank details have been saved.' });
        setIsBankDetailsDialogOpen(false);
    } catch (error) {
        console.error('Error updating bank details:', error);
        toast({ variant: 'destructive', title: 'Update Failed' });
    }
  };


  if (isLoading || !isMounted) {
    return (
        <div className="h-full w-full flex items-center justify-center bg-muted">
            <SearchingIndicator partnerType="path" />
        </div>
    );
  }

  const renderContent = () => {
    if (activeRideRequest) {
      const { fare, pickup, destination } = activeRideRequest;
      
      return (
        <AlertDialog open={!!activeRideRequest}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-2xl">
                       <div className="p-2 bg-primary/10 rounded-full"><Car className="w-6 h-6 text-primary" /></div>
                        New Ride Request!
                    </AlertDialogTitle>
                </AlertDialogHeader>
                
                <div className="h-32 rounded-lg overflow-hidden border relative">
                    <LiveMap riderLocation={{lat: pickup.location.latitude, lon: pickup.location.longitude}} />
                </div>

                <div className="grid grid-cols-2 text-center gap-4">
                    <div>
                        <p className="text-3xl font-bold">₹{fare.toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">Estimated Fare</p>
                    </div>
                     <div>
                        <p className="text-3xl font-bold">{routeInfo?.distance.toFixed(1) || '...'} <span className="text-lg">km</span></p>
                        <p className="text-sm text-muted-foreground">~{routeInfo?.duration || '...'} min trip</p>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="p-2 bg-muted rounded-md text-sm">
                        <p className="text-muted-foreground">From</p>
                        <p className="font-semibold">{pickup.address}</p>
                    </div>
                    <div className="p-2 bg-muted rounded-md text-sm">
                        <p className="text-muted-foreground">To</p>
                        <p className="font-semibold">{destination.address}</p>
                    </div>
                </div>

                <AlertDialogFooter className="grid grid-cols-2 gap-2 mt-4">
                    <Button variant="destructive" onClick={() => handleDeclineRide()}>Decline ({requestTimeout}s)</Button>
                    <Button className="btn-glow" onClick={handleAcceptRide}>Accept Ride</Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )
    }

    if (acceptedRide) {
        return <RideStatus ride={acceptedRide} isGarageRequest={false} onEndRide={handleEndRide} onCancel={handleCancelRide} />
    }

    if (activeGarageRequest) {
         return <RideStatus ride={activeGarageRequest as any} isGarageRequest onCancel={handleCancelServiceRequest} onPayment={handleGaragePayment} />
    }

     return (
       <div className="flex-1 flex flex-col gap-4">
            {!isOnline ? (
                <Card className="text-center cursor-pointer hover:bg-muted" onClick={() => handleAvailabilityChange(true)}>
                    <CardHeader className="items-center">
                        <Power className="w-12 h-12 text-destructive mb-2"/>
                        <CardTitle className="font-bold text-xl">You are OFFLINE</CardTitle>
                        <CardDescription>Tap to go online and start receiving ride requests.</CardDescription>
                    </CardHeader>
                </Card>
            ) : (
                <Card className="text-center">
                    <CardHeader className="p-3">
                        <SearchingIndicator partnerType="path" className="w-32 h-32" />
                        <CardTitle className="text-xl">You are Online</CardTitle>
                        <CardDescription>Looking for nearby ride requests...</CardDescription>
                    </CardHeader>
                </Card>
            )}
            <div className="grid grid-cols-4 gap-2 text-center">
                <Card><CardContent className="p-2"><div className="text-xs text-muted-foreground">Rides</div><div className="font-bold text-lg flex items-center justify-center gap-1"><History className="w-4 h-4 text-muted-foreground" />{partnerData?.ridesToday || 0}</div></CardContent></Card>
                <Card><CardContent className="p-2"><div className="text-xs text-muted-foreground">Rating</div><div className="font-bold text-lg flex items-center justify-center gap-1"><Star className="w-4 h-4 text-muted-foreground" />{partnerData?.rating || '4.9'}</div></CardContent></Card>
                <Card><CardContent className="p-2"><div className="text-xs text-muted-foreground">Acceptance</div><div className="font-bold text-lg flex items-center justify-center gap-1"><CheckCircle className="w-4 h-4 text-muted-foreground" />{partnerData?.acceptanceRate || '100'}%</div></CardContent></Card>
                <Card>
                    <CardContent className="p-2">
                        <div className="text-xs text-muted-foreground">Earnings</div>
                        {isEarningsVisible ? (
                            <div className="font-bold text-lg flex items-center justify-center gap-1">
                                <IndianRupee className="w-4 h-4 text-muted-foreground" />{partnerData?.todaysEarnings?.toFixed(2) || '0.00'}
                            </div>
                        ) : (
                            <Button variant="ghost" size="sm" className="w-full h-auto py-0.5" onClick={() => setIsPinDialogOpen(true)}>
                                <span className="font-bold text-lg">₹ ****</span>
                                <Eye className="w-4 h-4 ml-2 text-muted-foreground" />
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </div>
            
             <Tabs defaultValue="payments" className="flex-1 flex flex-col">
                <TabsList className="grid w-full grid-cols-1">
                    <TabsTrigger value="payments">Quick Payments</TabsTrigger>
                </TabsList>
                <TabsContent value="payments" className="mt-4 flex-1">
                   <div className="grid grid-cols-2 gap-2">
                       <Button variant="outline" className="flex-col h-20"><Send className="w-4 h-4 mb-2 text-primary" /><span className="text-xs">Pay UPI ID</span></Button>
                       <Button variant="outline" className="flex-col h-20"><Phone className="w-4 h-4 mb-2 text-primary"/><span className="text-xs">Pay Number</span></Button>
                   </div>
                </TabsContent>
            </Tabs>
        </div>
    );
  };

  return (
    <div className="h-full w-full flex flex-col bg-background">
        <div className="h-1/2">
           <LiveMap
              driverLocation={partnerData?.currentLocation}
              riderLocation={riderLocation ?? activeGarageRequest?.location as any}
              routeGeometry={routeGeometry}
           />
           <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
                <Card className="p-2 bg-background/80 backdrop-blur-sm flex items-center gap-2">
                    <div className="flex items-center space-x-2">
                        <Switch id="online-status" checked={isOnline} onCheckedChange={handleAvailabilityChange} className="data-[state=checked]:bg-green-500" />
                        <Label htmlFor="online-status" className={cn("font-medium", isOnline ? 'text-primary' : 'text-muted-foreground')}>{isOnline ? 'Online' : 'Offline'}</Label>
                    </div>
                </Card>
            </div>
        </div>

        <div className="h-1/2 bg-muted/30 rounded-t-2xl shadow-inner-top p-4 flex flex-col gap-4 overflow-y-auto">
            {renderContent()}
        </div>

       <Dialog open={isPinDialogOpen} onOpenChange={setIsPinDialogOpen}>
            <DialogContent className="max-w-xs">
                <DialogHeader>
                    <DialogTitle>Enter PIN to View</DialogTitle>
                    <DialogDescription>For your privacy, please enter your PIN to see today&apos;s earnings.</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center justify-center gap-4 py-4">
                    <Label htmlFor="pin-input-earnings" className="sr-only">Enter PIN</Label>
                    <Input 
                        id="pin-input-earnings" 
                        type="password" 
                        inputMode="numeric" 
                        maxLength={4}
                        value={enteredPin}
                        onChange={(e) => setEnteredPin(e.target.value)}
                        className="text-center text-2xl font-bold tracking-[1em] w-40" 
                        placeholder="••••"
                        autoFocus
                    />
                </div>
                <DialogFooter>
                    <Button type="button" className="w-full" onClick={handlePinSubmit}>Submit</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  )
}
