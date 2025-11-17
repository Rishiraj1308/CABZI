
'use client'

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, GeoPoint } from 'firebase/firestore';
import { useFirebase } from '@/lib/firebase/client-provider';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Hospital, Wrench, UserCheck, MapPin, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

const LiveMap = dynamic(() => import('@/features/user/components/ride/LiveMap'), {
    ssr: false,
    loading: () => <Skeleton className="h-full w-full" />,
});

interface Partner {
    id: string;
    name: string;
    type: 'hospital' | 'mechanic' | 'doctor';
    location: GeoPoint;
    specialization?: string;
    distance?: number;
    eta?: number;
}

export default function FullMapPage() {
    const router = useRouter();
    const { db } = useFirebase();
    const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
    const [partners, setPartners] = useState<Partner[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => setUserLocation({ lat: position.coords.latitude, lon: position.coords.longitude }),
                () => setUserLocation({ lat: 28.6139, lon: 77.2090 })
            );
        }
    }, []);

    const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; 
    };

    useEffect(() => {
        if (!db || !userLocation) return;

        const fetchPartners = async () => {
            setIsLoading(true);
            const allPartners: Partner[] = [];
            const radiusKm = 10;

            try {
                const partnerCollections = [
                    { name: 'ambulances', type: 'hospital' as const, locationField: 'location' },
                    { name: 'mechanics', type: 'mechanic' as const, locationField: 'currentLocation' },
                ];
                
                for (const { name, type, locationField } of partnerCollections) {
                    const q = query(collection(db, name), where('isOnline', '==', true));
                    const snapshot = await getDocs(q);
                    snapshot.forEach(doc => {
                        const data = doc.data();
                        const loc = data[locationField];
                        if (loc) {
                            const distance = getDistance(userLocation.lat, userLocation.lon, loc.latitude, loc.longitude);
                            if (distance < radiusKm) {
                                allPartners.push({ id: doc.id, name: data.name, type, location: loc, distance, eta: Math.round(distance * 2.5) });
                            }
                        }
                    });
                }
                
                setPartners(allPartners.sort((a,b) => (a.distance || 99) - (b.distance || 99)));

            } catch (error) {
                console.error("Error fetching partners:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPartners();

    }, [db, userLocation]);

    const partnerIcons = {
        hospital: Hospital,
        mechanic: Wrench,
        doctor: UserCheck,
    };
    
    const partnerColors = {
        hospital: 'text-destructive',
        mechanic: 'text-amber-600',
        doctor: 'text-blue-500',
    };


    return (
        <div className="h-screen w-screen flex flex-col">
            <div className="absolute top-4 left-4 z-[1000]">
                 <Button variant="outline" size="icon" className="h-10 w-10 rounded-full shadow-lg" onClick={() => router.back()}>
                    <ArrowLeft className="w-5 h-5"/>
                </Button>
            </div>
            <div className="h-1/2 md:h-2/3 w-full">
                <LiveMap riderLocation={userLocation} partners={partners} />
            </div>
            <div className="h-1/2 md:h-1/3 w-full flex flex-col">
                <Card className="rounded-t-2xl border-t-4 border-primary/20 flex-1 flex flex-col">
                    <CardHeader>
                        <CardTitle>Nearby Services ({partners.length})</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto space-y-3 pr-3">
                        {isLoading ? (
                            Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
                        ) : partners.length > 0 ? (
                           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                                {partners.map((partner) => {
                                    const Icon = partnerIcons[partner.type];
                                    const color = partnerColors[partner.type];
                                    return (
                                        <Card key={partner.id} className="p-3">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-md bg-muted"><Icon className={`w-5 h-5 ${color}`}/></div>
                                                <div className="flex-1">
                                                    <p className="font-bold text-sm">{partner.name}</p>
                                                    <p className="text-xs text-muted-foreground capitalize">{partner.type}</p>
                                                </div>
                                                <div className="text-right text-sm">
                                                    <div className="flex items-center justify-end gap-1 font-semibold"><MapPin className="w-3 h-3"/> {partner.distance?.toFixed(1)} km</div>
                                                    <div className="flex items-center justify-end gap-1 text-muted-foreground"><Clock className="w-3 h-3"/> ~{partner.eta} min</div>
                                                </div>
                                            </div>
                                        </Card>
                                    );
                                })}
                           </motion.div>
                        ) : (
                             <div className="flex flex-col items-center justify-center h-full text-center">
                                <MapPin className="w-12 h-12 text-muted-foreground mb-4"/>
                                <p className="font-semibold">No partners found nearby.</p>
                                <p className="text-sm text-muted-foreground">Try again in a few moments.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

