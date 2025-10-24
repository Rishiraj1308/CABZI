'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin, History } from 'lucide-react'
import { useFirebase } from '@/firebase/client-provider'
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'

interface Ride {
    id: string;
    pickup: { address: string };
    destination: { address: string };
    fare?: number;
    createdAt: Timestamp;
}

export default function MyRidesPage() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { db, user } = useFirebase();
  const { toast } = useToast();

  useEffect(() => {
    if (!db || !user) {
        setIsLoading(false);
        return;
    }
    
    // The user's phone number is the riderId in the rides collection
    const userPhone = user.phoneNumber?.replace('+91', '');
    if (!userPhone) {
        toast({ variant: 'destructive', title: "Authentication Error", description: "Could not verify your phone number." });
        setIsLoading(false);
        return;
    }

    const q = query(collection(db, 'rides'), where('riderId', '==', userPhone), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const ridesData: Ride[] = [];
        querySnapshot.forEach((doc) => {
            ridesData.push({ id: doc.id, ...doc.data() } as Ride);
        });
        setRides(ridesData);
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching ride history:", error);
        toast({ variant: 'destructive', title: "Error", description: "Could not load your ride history."});
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [db, user, toast]);

  return (
    <div className="p-4 md:p-6 space-y-6">
        <div className="animate-fade-in">
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <History className="w-8 h-8 text-primary" /> 
                My Rides
            </h2>
            <p className="text-muted-foreground">A history of all your past trips with Cabzi.</p>
        </div>
        
        <div className="space-y-4 animate-fade-in">
            {isLoading ? (
                Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
            ) : rides.length > 0 ? (
                rides.map(trip => (
                <Card key={trip.id} className="hover:bg-muted/50 cursor-pointer">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 bg-muted rounded-lg"><MapPin className="w-6 h-6 text-muted-foreground"/></div>
                        <div className="flex-1">
                            <p className="font-semibold text-sm line-clamp-1">{trip.pickup?.address}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">to {trip.destination?.address}</p>
                             <p className="text-xs text-muted-foreground">{trip.createdAt.toDate().toLocaleDateString()}</p>
                        </div>
                        <p className="font-bold text-lg">~₹{trip.fare?.toFixed(0)}</p>
                    </CardContent>
                </Card>
                ))
            ) : (
                <Card className="h-48 flex items-center justify-center">
                    <p className="text-muted-foreground">You haven&apos;t taken any rides yet.</p>
                </Card>
            )}
        </div>
    </div>
  )
}
