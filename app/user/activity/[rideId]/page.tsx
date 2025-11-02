
'use client'

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase/client-provider';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Car, IndianRupee, Star, Calendar, Clock, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import dynamic from 'next/dynamic';
import { RideData } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const LiveMap = dynamic(() => import('@/components/live-map'), {
    ssr: false,
    loading: () => <Skeleton className="w-full h-full bg-muted" />,
});

function RideDetailsContent() {
    const params = useParams();
    const rideId = params.rideId as string;
    const router = useRouter();
    const { db } = useFirebase();

    const [ride, setRide] = useState<RideData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!rideId || !db) {
            setIsLoading(false);
            return;
        }

        const fetchRideData = async () => {
            setIsLoading(true);
            try {
                const rideRef = doc(db, 'rides', rideId);
                const docSnap = await getDoc(rideRef);

                if (docSnap.exists()) {
                    setRide({ id: docSnap.id, ...docSnap.data() } as RideData);
                } else {
                    // Handle case where ride is not found
                    setRide(null);
                }
            } catch (error) {
                console.error("Error fetching ride data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRideData();
    }, [rideId, db]);

    const getStatusBadge = (status?: string) => {
        if (!status) return null;
        const lowerStatus = status.toLowerCase();
        if (lowerStatus.includes('completed')) return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">{status}</Badge>;
        if (lowerStatus.includes('cancel')) return <Badge variant="destructive">{status}</Badge>;
        return <Badge variant="secondary">{status}</Badge>;
    }
    
    const getInitials = (name: string | undefined) => {
        if (!name) return 'D';
        const names = name.split(' ');
        return names.length > 1 ? names[0][0] + names[names.length - 1][0] : name.substring(0, 2);
    }
    
    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-8 w-48" />
                <Card>
                    <CardHeader><Skeleton className="h-40 w-full" /></CardHeader>
                    <CardContent className="pt-6 space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-16 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }
    
    if (!ride) {
        return (
             <div className="text-center">
                <h2 className="text-2xl font-bold">Ride Not Found</h2>
                <p className="text-muted-foreground">The details for this ride could not be found.</p>
                <Button onClick={() => router.back()} variant="outline" className="mt-4">
                    <ArrowLeft className="mr-2 h-4 w-4"/> Back to Activity
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <Button onClick={() => router.back()} variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4"/> Back to Activity
            </Button>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-2xl">Ride Details</CardTitle>
                            <CardDescription>
                                {(ride.createdAt as unknown as Timestamp)?.toDate().toLocaleString()}
                            </CardDescription>
                        </div>
                         {getStatusBadge(ride.status)}
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="h-48 w-full rounded-md overflow-hidden border">
                       <LiveMap 
                           riderLocation={ride.pickup?.location}
                           destinationLocation={ride.destination?.location}
                           routeGeometry={ride.routeGeometry}
                       />
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                           <MapPin className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                           <div>
                               <p className="text-xs text-muted-foreground">PICKUP</p>
                               <p className="font-medium">{ride.pickup.address}</p>
                           </div>
                        </div>
                         <div className="flex items-start gap-3">
                           <MapPin className="w-5 h-5 text-red-500 mt-1 flex-shrink-0" />
                           <div>
                               <p className="text-xs text-muted-foreground">DROP-OFF</p>
                               <p className="font-medium">{ride.destination.address}</p>
                           </div>
                        </div>
                    </div>
                     <Separator />
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">FARE</p>
                            <p className="font-bold text-lg flex items-center gap-1"><IndianRupee className="w-4 h-4" />{ride.fare?.toFixed(2)}</p>
                        </div>
                         <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">DISTANCE</p>
                            <p className="font-bold text-lg">{ride.distance?.toFixed(1)} km</p>
                        </div>
                     </div>
                      {ride.driverDetails && (
                        <>
                            <Separator />
                             <div className="flex items-center gap-4">
                                <Avatar className="w-12 h-12">
                                    <AvatarImage src={ride.driverDetails.photoUrl} />
                                    <AvatarFallback>{getInitials(ride.driverDetails.name)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <p className="font-semibold">{ride.driverDetails.name}</p>
                                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                                        {ride.driverDetails.rating} <Star className="w-3 h-3 text-yellow-400 fill-yellow-400"/>
                                    </p>
                                </div>
                            </div>
                        </>
                     )}
                </CardContent>
            </Card>
        </div>
    )
}

export default function RideDetailsPage() {
    return (
        <div className="p-4 md:p-6">
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                <RideDetailsContent />
            </Suspense>
        </div>
    );
}

