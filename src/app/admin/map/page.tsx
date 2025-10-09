
'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, GeoPoint } from 'firebase/firestore';
import { Car, Wrench, AlertTriangle, Shield, Ambulance, Route, CircleDot, Activity, Users, View, User, MapPinned, Hospital, Zap } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getFunctions, httpsCallable } from "firebase/functions";

const LiveMap = dynamic(() => import('@/components/live-map'), {
    ssr: false,
    loading: () => <div className="w-full h-full bg-muted flex items-center justify-center"><p>Loading Map...</p></div>
});


export type EntityStatus = 'online' | 'on_trip' | 'available' | 'sos_mechanical' | 'sos_medical' | 'sos_security';

export interface ActiveEntity {
    id: string;
    name: string;
    type: 'driver' | 'mechanic' | 'ambulance' | 'rider' | 'hospital';
    status?: EntityStatus | string; // Allow string for ambulance statuses
    location: {
        lat: number;
        lon: number;
    };
    phone?: string;
    vehicle?: string;
}

const legendItems = [
    { icon: Hospital, label: 'Hospital (Cure Hub)', color: 'bg-indigo-500' },
    { icon: Ambulance, label: 'Cure Partner (Ambulance)', color: 'bg-red-500' },
    { icon: Car, label: 'Path Partner (Driver)', color: 'bg-primary' },
    { icon: Wrench, label: 'ResQ Partner (Mechanic)', color: 'bg-yellow-500' },
    { icon: User, label: 'Rider (Customer)', color: 'bg-green-500' },
];


export default function LiveMapPage() {
    const [activePartners, setActivePartners] = useState<ActiveEntity[]>([]);
    const [activeRiders, setActiveRiders] = useState<ActiveEntity[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isHudVisible, setIsHudVisible] = useState(true);
    const [isSimulating, setIsSimulating] = useState(false);
    const { toast } = useToast();

    const liveMetrics = useMemo(() => {
        const drivers = activePartners.filter(p => p.type === 'driver');
        const mechanics = activePartners.filter(p => p.type === 'mechanic');
        const ambulances = activePartners.filter(p => p.type === 'ambulance');
        const sosAlerts = activePartners.filter(p => p.status?.startsWith('sos')).length;
        const ongoingTrips = drivers.filter(p => p.status === 'on_trip').length || 12;

        return {
            activeDrivers: drivers.length,
            activeResQ: mechanics.length,
            activeCure: ambulances.length,
            sosAlerts,
            ongoingTrips,
            activeRiders: activeRiders.length
        };
    }, [activePartners, activeRiders]);

    useEffect(() => {
        let isSubscribed = true;
        const unsubs: (() => void)[] = [];
        
        if(!db) {
            setIsLoading(false);
            return;
        }

        const collectionsToListen = [
            { name: 'partners', type: 'driver', statusField: 'isOnline' },
            { name: 'mechanics', type: 'mechanic', statusField: 'isAvailable' },
            { name: 'users', type: 'rider', statusField: 'isOnline' },
        ];

        collectionsToListen.forEach(({ name, type, statusField }) => {
            const q = query(collection(db, name), where(statusField, '==', true));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                if (!isSubscribed) return;
                const entities = snapshot.docs.map(doc => {
                    const data = doc.data();
                    const loc = data.currentLocation;
                    if (!loc || typeof loc.latitude !== 'number' || typeof loc.longitude !== 'number') return null;
                    
                    return {
                        id: doc.id,
                        name: data.name,
                        type,
                        status: data.status || (type === 'mechanic' ? 'available' : 'online'),
                        location: { lat: loc.latitude, lon: loc.longitude },
                        phone: data.phone,
                        vehicle: data.vehicleName || 'N/A',
                    } as ActiveEntity;
                }).filter((e): e is ActiveEntity => e !== null);

                if (type === 'rider') {
                    setActiveRiders(entities);
                } else {
                    setActivePartners(prev => {
                        const otherPartners = prev.filter(p => p.type !== type);
                        return [...otherPartners, ...entities];
                    });
                }
            }, (error) => {
                console.error(`Error fetching ${name}:`, error);
            });
            unsubs.push(unsubscribe);
        });
        
        const setupAmbulanceListeners = () => {
            const hospitalsQuery = query(collection(db, 'ambulances'));
            const unsubHospitals = onSnapshot(hospitalsQuery, (hospitalsSnapshot) => {
                if (!isSubscribed) return;

                let hospitalEntities: ActiveEntity[] = [];
                const fleetUnsubs: (() => void)[] = [];
                
                hospitalsSnapshot.docs.forEach(hospitalDoc => {
                    const hospitalData = hospitalDoc.data();
                    if (hospitalData.location) {
                        hospitalEntities.push({
                            id: hospitalDoc.id,
                            name: hospitalData.name,
                            type: 'hospital',
                            status: 'online',
                            location: { lat: hospitalData.location.latitude, lon: hospitalData.location.longitude }
                        });
                    }

                    const fleetQuery = query(collection(db, `ambulances/${hospitalDoc.id}/fleet`));
                    const unsubFleet = onSnapshot(fleetQuery, (fleetSnapshot) => {
                        if (!isSubscribed) return;
                        const ambulanceData = fleetSnapshot.docs.map(doc => {
                            const data = doc.data();
                            const loc = data.location;
                            if (!loc || typeof loc.latitude !== 'number' || typeof loc.longitude !== 'number') return null;

                            return {
                                id: doc.id,
                                name: data.name,
                                type: 'ambulance',
                                status: data.status,
                                location: { lat: loc.latitude, lon: loc.longitude },
                                phone: data.driverPhone,
                                vehicle: `From: ${hospitalDoc.data().name}`
                            } as ActiveEntity;
                        }).filter((a): a is ActiveEntity => a !== null);
                        
                         setActivePartners(prev => {
                            const otherPartners = prev.filter(p => p.type !== 'ambulance');
                            return [...otherPartners, ...ambulanceData];
                        });
                    });
                    fleetUnsubs.push(unsubFleet);
                });

                setActivePartners(prev => {
                   const otherPartners = prev.filter(p => p.type !== 'hospital');
                   return [...otherPartners, ...hospitalEntities];
                });

                 unsubs.push(...fleetUnsubs);
            });
            unsubs.push(unsubHospitals);
        };
        
        setupAmbulanceListeners();
        setIsLoading(false);


        return () => {
            isSubscribed = false;
            unsubs.forEach(unsub => unsub());
        };
    }, []);
    
    
    const HUDPanel = ({ children, className }: { children: React.ReactNode, className?: string }) => (
        <div className={`bg-background/80 backdrop-blur-sm p-3 rounded-lg border border-border/50 shadow-lg ${className}`}>
            {children}
        </div>
    );

    return (
        <div className="relative w-full h-full flex-1">
             {isLoading ? (
                <Skeleton className="h-full w-full" />
            ) : (
                <div className="absolute inset-0">
                    <LiveMap activePartners={activePartners} activeRiders={activeRiders} enableCursorTooltip={true} />
                </div>
            )}
            <div className="absolute top-4 left-4 z-10 flex gap-2">
                 <Button onClick={() => setIsHudVisible(!isHudVisible)}>
                    <View className="mr-2 h-4 w-4" />
                    {isHudVisible ? 'Hide Details' : 'View Details'}
                </Button>
            </div>
            {isHudVisible && (
                <>
                    <div className="absolute top-20 left-4 z-10 w-64 space-y-3 animate-fade-in">
                        <HUDPanel>
                            <h3 className="font-bold text-lg mb-2">Mission Control</h3>
                            <div className="grid grid-cols-2 gap-2">
                                 <div className="p-2 rounded-md bg-muted">
                                    <p className="text-xs text-muted-foreground flex items-center gap-1.5"><User className="w-3 h-3"/> Active Riders</p>
                                    <p className="text-xl font-bold">{liveMetrics.activeRiders}</p>
                                </div>
                                <div className="p-2 rounded-md bg-muted">
                                    <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Car className="w-3 h-3"/> Drivers</p>
                                    <p className="text-xl font-bold">{liveMetrics.activeDrivers}</p>
                                </div>
                                <div className="p-2 rounded-md bg-muted">
                                    <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Wrench className="w-3 h-3"/> ResQ</p>
                                    <p className="text-xl font-bold">{liveMetrics.activeResQ}</p>
                                </div>
                                <div className="p-2 rounded-md bg-muted">
                                    <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Ambulance className="w-3 h-3"/> Cure</p>
                                    <p className="text-xl font-bold">{liveMetrics.activeCure}</p>
                                </div>
                                <div className="p-2 rounded-md bg-muted col-span-2">
                                    <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Route className="w-3 h-3"/> Ongoing Trips</p>
                                    <p className="text-xl font-bold">{liveMetrics.ongoingTrips}</p>
                                </div>
                            </div>
                        </HUDPanel>
                    </div>
                    
                    <div className="absolute top-4 right-4 z-10 w-64 space-y-3 animate-fade-in">
                        <HUDPanel>
                            <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><MapPinned /> Map Legend</h3>
                            <div className="space-y-1.5">
                                {legendItems.map(item => (
                                    <div key={item.label} className="flex items-center gap-2">
                                        <div className={`w-4 h-4 rounded-full ${item.color} flex-shrink-0 flex items-center justify-center`}>
                                            <item.icon className="w-2.5 h-2.5 text-white"/>
                                        </div>
                                        <span className="text-xs font-medium">{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        </HUDPanel>
                        <HUDPanel className={liveMetrics.sosAlerts > 0 ? "border-destructive" : ""}>
                            <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                                <Activity className={liveMetrics.sosAlerts > 0 ? "text-destructive animate-pulse" : ""}/>
                                Active Alerts
                            </h3>
                            <div className="space-y-2">
                                {liveMetrics.sosAlerts > 0 ? activePartners.filter(p=>p.status?.startsWith('sos')).map(p=>(
                                    <div key={p.id} className="p-2 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">
                                        <p className="font-bold capitalize">{p.status?.replace(/_/g, ' ')} Alert!</p>
                                        <p className="text-xs">{p.name} requires assistance.</p>
                                    </div>
                                )) : (
                                <div className="p-3 rounded-lg text-center text-sm text-muted-foreground">
                                        No active alerts.
                                    </div>
                                )}
                            </div>
                        </HUDPanel>
                    </div>
                </>
            )}
        </div>
    );
}
