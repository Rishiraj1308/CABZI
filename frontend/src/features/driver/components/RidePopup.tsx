
'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { RideData } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MapPin, Route, Clock, IndianRupee, PersonStanding, Bike, Car } from 'lucide-react';
import { useDriver } from '@/app/(dashboard)/driver/layout';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { getRoute } from '@/lib/routing';
import { getDistance } from '@/lib/utils';
import { toast } from 'sonner';


const LiveMap = dynamic(() => import('@/features/user/components/ride/LiveMap'), { 
    ssr: false,
    loading: () => <Skeleton className="h-full w-full bg-muted" />
});


interface RidePopupProps {
  jobRequest: RideData | null;
  onAccept: () => void;
  onDecline: (isTimeout?: boolean) => void;
}

export const RidePopup: React.FC<RidePopupProps> = ({ jobRequest, onAccept, onDecline }) => {
  const [requestTimeout, setRequestTimeout] = useState(15);
  const { partnerData } = useDriver();
  const requestTimerRef = useRef<NodeJS.Timeout | null>(null);
  const notificationSoundRef = useRef<HTMLAudioElement | null>(null);
  
  const [distance, setDistance] = useState<string | null>(null);
  const [eta, setEta] = useState<string | null>(null);

  const clearTimer = () => {
    if (requestTimerRef.current) {
        clearInterval(requestTimerRef.current);
        requestTimerRef.current = null;
    }
  };

  const handleDeclineWithCleanup = (isTimeout = false) => {
    clearTimer();
    onDecline(isTimeout);
  };

  const handleAcceptWithCleanup = () => {
      clearTimer();
      onAccept();
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
        notificationSoundRef.current = new Audio('/notification.mp3');
    }
  }, []);

  useEffect(() => {
    if (jobRequest) {
      setRequestTimeout(15); 
      notificationSoundRef.current?.play().catch(e => console.log("Audio play failed:", e));

      requestTimerRef.current = setInterval(() => {
        setRequestTimeout(prev => {
          if (prev <= 1) {
            handleDeclineWithCleanup(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
        clearTimer();
    }

    return () => clearTimer();
  }, [jobRequest]);


  useEffect(() => {
    const calculateRouteInfo = async () => {
      if (jobRequest?.pickup?.location && partnerData?.currentLocation) {
        const start = { lat: partnerData.currentLocation.latitude, lon: partnerData.currentLocation.longitude };
        const end = { lat: jobRequest.pickup.location.latitude, lon: jobRequest.pickup.location.longitude };
        
        try {
          const routeData = await getRoute(start, end);
          if (routeData && routeData.routes && routeData.routes[0]) {
            const route = routeData.routes[0];
            const distKm = route.distance / 1000;
            const durationMin = route.duration / 60;
            setDistance(distKm.toFixed(1));
            setEta(Math.ceil(durationMin).toString());
          }
        } catch (error) {
            // Fallback to Haversine if OSRM fails
            const distKm = getDistance(start.lat, start.lon, end.lat, end.lon);
            setDistance(distKm.toFixed(1));
            setEta(Math.ceil(distKm * 2.5).toString()); // Estimate ETA
        }
      }
    };
    calculateRouteInfo();
  }, [jobRequest, partnerData]);


  if (!jobRequest) return null;

  return (
    <>
      <AlertDialog open={!!jobRequest}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>New Ride Request!</AlertDialogTitle>
            <AlertDialogDescription>A new ride is available. Please review and respond quickly.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="absolute top-4 right-4 w-12 h-12 flex items-center justify-center rounded-full border-4 border-primary text-primary font-bold text-2xl">
            {requestTimeout}
          </div>
          
           <div className="relative h-40 w-full rounded-lg overflow-hidden border">
                <LiveMap 
                    riderLocation={jobRequest.pickup?.location ? { lat: jobRequest.pickup.location.latitude, lon: jobRequest.pickup.location.longitude } : null}
                    driverLocation={partnerData?.currentLocation ? { lat: partnerData.currentLocation.latitude, lon: partnerData.currentLocation.longitude } : null}
                />
          </div>

          <div className="flex items-center gap-4">
            <Avatar className="w-12 h-12">
              <AvatarImage src={(jobRequest as any).riderPhotoUrl || `https://i.pravatar.cc/100?u=${jobRequest.riderId}`} alt={jobRequest.riderName} />
              <AvatarFallback>{jobRequest?.riderName?.[0] || 'R'}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-bold">{jobRequest?.riderName}</p>
              <p className="text-sm text-muted-foreground capitalize flex items-center gap-1">
                <PersonStanding className="w-4 h-4"/> {jobRequest.riderGender}
              </p>
            </div>
            <Badge variant="outline">{jobRequest.rideType}</Badge>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 mt-1 text-green-500 flex-shrink-0" />
              <p><span className="font-semibold">FROM:</span> {jobRequest.pickup?.address}</p>
            </div>
            <div className="flex items-start gap-2">
              <Route className="w-4 h-4 mt-1 text-red-500 flex-shrink-0" />
              <p><span className="font-semibold">TO:</span> {jobRequest.destination?.address}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center mt-3">
            <div className="p-2 bg-muted rounded-md">
              <p className="text-xs text-muted-foreground">Est. Fare</p>
              <p className="font-bold text-lg text-green-600">₹{jobRequest.fare}</p>
            </div>
            <div className="p-2 bg-muted rounded-md">
              <p className="text-xs text-muted-foreground">To Pickup</p>
              <p className="font-bold text-lg">{distance ? `${distance} km` : '...'}</p>
            </div>
            <div className="p-2 bg-muted rounded-md">
              <p className="text-xs text-muted-foreground">Est. Arrival</p>
              <p className="font-bold text-lg">~{eta ? eta : '...'} min</p>
            </div>
          </div>
          <AlertDialogFooter className="grid grid-cols-2 gap-2">
            <Button variant="destructive" onClick={() => handleDeclineWithCleanup(false)}>Decline</Button>
            <Button onClick={handleAcceptWithCleanup}>Accept Ride</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
