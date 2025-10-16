'use client'

import React, { useState, useEffect, useMemo } from 'react';
import { Car, Wrench, Shield, Ambulance, Route, CircleDot, Activity, Users, View, User as UserIcon, MapPinned, Hospital, Zap } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { useFirestore, useFunctions } from '@/firebase/client-provider';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useToast } from '@/hooks/use-toast';

const LiveMap = dynamic(() => import('@/components/live-map'), {
    ssr: false,
    loading: () => <div className="w-full h-full bg-muted flex items-center justify-center"><p>Loading Map...</p></div>
});

export type EntityStatus = 'online' | 'on_trip' | 'available' | 'sos_mechanical' | 'sos_medical' | 'sos_security';

export interface ActiveEntity {
    id: string;
    name: string;
    type: 'driver' | 'mechanic' | 'ambulance' | 'rider' | 'hospital';
    status?: EntityStatus | string;
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
    { icon: UserIcon, label: 'Rider (Customer)', color: 'bg-green-500' },
];

export default function LiveMapPage() {
    const [allPartners, setAllPartners] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isHudVisible, setIsHudVisible] = useState(true);
    const db = useFirestore();
    const functions = useFunctions();
    const { toast } = useToast();

    useEffect(() => {
      async function fetchData() {
        if (!db) return;
        setIsLoading(true);
        const collections = ['partners', 'mechanics', 'ambulances', 'users'];
        const types: ActiveEntity['type'][] = ['driver', 'mechanic', 'ambulance', 'rider'];
        
        try {
            const allEntitiesData: ActiveEntity[] = [];
            const queries = collections.map((collName, i) => {
                const typeName = types[i];
                const q = query(collection(db, collName), where('isOnline', '==', true));
                return getDocs(q).then(snapshot => {
                    snapshot.forEach(doc => {
                        const data = doc.data();
                        if (data.currentLocation) {
                            allEntitiesData.push({
                                id: doc.id,
                                name: data.name,
                                type: typeName,
                                status: data.status,
                                location: {
                                    lat: data.currentLocation.latitude,
                                    lon: data.currentLocation.longitude,
                                },
                                phone: data.phone,
                                vehicle: data.vehicleName
                            });
                        }
                    });
                });
            });

            await Promise.all(queries);
            setAllPartners(allEntitiesData);

        } catch(error) {
            console.error("Error fetching live map data:", error);
        } finally {
            setIsLoading(false);
        }
      }
      fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [db]);

    const liveMetrics = useMemo(() => {
        return {
            activeDrivers: allPartners.filter(p => p.type === 'driver').length,
            activeResQ: allPartners.filter(p => p.type === 'mechanic').length,
            activeCure: allPartners.filter(p => p.type === 'ambulance').length,
            activeRiders: allPartners.filter(p => p.type === 'rider').length,
            sosAlerts: 0,
            ongoingTrips: 0,
        };
    }, [allPartners]);

    const handleSimulateDemand = async () => {
        if (!functions) {
            toast({ variant: 'destructive', title: 'Functions not available.' });
            return;
        }
        
        const simulateHighDemand = httpsCallable(functions, 'simulateHighDemand');
        try {
            await simulateHighDemand({ zoneName: 'Cyber Hub, Gurgaon' });
            toast({
                title: 'Demand Simulated!',
                description: 'A high-demand alert has been triggered for automation workflows.',
            });
        } catch (error) {
            console.error("Error calling simulateHighDemand function:", error);
            toast({
                variant: 'destructive',
                title: 'Simulation Failed',
                description: 'Could not trigger the high-demand alert.',
            });
        }
    };
    
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
                   <LiveMap activePartners={allPartners} enableCursorTooltip={true} />
               </div>
           )}
            <div className="absolute top-4 left-4 z-10 flex gap-2">
                 <Button onClick={() => setIsHudVisible(!isHudVisible)}>
                    <View className="mr-2 h-4 w-4" />
                    {isHudVisible ? 'Hide Details' : 'View Details'}
                </Button>
                 <Button onClick={handleSimulateDemand} variant="outline">
                    <Zap className="mr-2 h-4 w-4 text-amber-500" />
                    Simulate High Demand
                </Button>
            </div>
            {isHudVisible && (
                <>
                    <div className="absolute top-20 left-4 z-10 w-64 space-y-3 animate-fade-in">
                        <HUDPanel>
                            <h3 className="font-bold text-lg mb-2">Mission Control</h3>
                            <div className="grid grid-cols-2 gap-2">
                                 <div className="p-2 rounded-md bg-muted">
                                    <p className="text-xs text-muted-foreground flex items-center gap-1.5"><UserIcon className="w-3 h-3"/> Active Riders</p>
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
                                {liveMetrics.sosAlerts > 0 ? (
                                  <p>SOS alerts will appear here.</p>
                                ) : (
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

    