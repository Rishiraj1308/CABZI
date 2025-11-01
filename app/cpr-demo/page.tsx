'use client'

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Car, User, PlayCircle } from 'lucide-react';

const LiveMap = dynamic(() => import('@/components/live-map'), {
    ssr: false,
    loading: () => <div className="w-full h-full bg-muted flex items-center justify-center"><p>Loading Map...</p></div>
});

// Define the type for our map entities
interface ActiveEntity {
    id: string;
    name: string;
    type: 'driver' | 'rider';
    status: 'online' | 'on_trip';
    location: {
        lat: number;
        lon: number;
    };
    vehicle?: string;
}

// Mock Data for the Demo
const initialRider: ActiveEntity = {
    id: 'rider_priya',
    name: 'Priya (Rider)',
    type: 'rider',
    status: 'online',
    location: { lat: 28.4595, lon: 77.0266 } // Gurgaon
};

const initialPartners: ActiveEntity[] = [
    { id: 'driver_ramesh', name: 'Ramesh', type: 'driver', status: 'online', location: { lat: 28.4650, lon: 77.0310 }, vehicle: 'Maruti Swift' },
    { id: 'driver_sunil', name: 'Sunil', type: 'driver', status: 'online', location: { lat: 28.4550, lon: 77.0200 }, vehicle: 'Hyundai i20' },
    { id: 'driver_vikas', name: 'Vikas', type: 'driver', status: 'online', location: { lat: 28.4600, lon: 77.0400 }, vehicle: 'Toyota Innova' },
];

export default function CprDemoPage() {
    const [rider, setRider] = useState<ActiveEntity>(initialRider);
    const [partners, setPartners] = useState<ActiveEntity[]>(initialPartners);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        // In a future step, we can add logic here to simulate movement.
    }, []);

    if (!isMounted) {
        return null; // Or a loading skeleton
    }

    return (
        <div className="relative w-full h-screen">
            <LiveMap
                activeRiders={[rider]}
                activePartners={partners}
            />

            <div className="absolute top-4 left-4 z-[1000]">
                <Card className="w-full max-w-sm shadow-2xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           <PlayCircle className="w-6 h-6 text-primary" />
                           CPR Demo Control Panel
                        </CardTitle>
                        <CardDescription>
                            This is a live simulation of the Path Ecosystem.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 rounded-lg bg-muted">
                           <h4 className="font-semibold text-lg mb-2">Live Actors</h4>
                           <div className="space-y-2 text-sm">
                               <div className="flex items-center gap-2">
                                   <User className="w-4 h-4 text-green-500" />
                                   <span>1 Rider Online (Priya)</span>
                               </div>
                               <div className="flex items-center gap-2">
                                   <Car className="w-4 h-4 text-primary" />
                                   <span>3 Drivers Online</span>
                               </div>
                           </div>
                        </div>
                        <Button className="w-full" disabled>
                            Simulate Ride Request (Coming Soon)
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
