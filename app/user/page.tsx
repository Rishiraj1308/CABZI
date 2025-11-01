
'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Car, Wrench, Ambulance, Calendar, FlaskConical, Search, MapPin, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { AnimatePresence } from 'framer-motion';
import { MotionDiv } from '@/components/ui/motion-div';
import { useFirebase } from '@/firebase/client-provider';
import { getDoc, doc, onSnapshot, query, collection, where } from 'firebase/firestore';
import type { RideData, AmbulanceCase, GarageRequest, ClientSession } from '@/lib/types';
import RideStatus from '@/components/ride-status';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const LiveMap = dynamic(() => import('@/components/live-map'), {
    ssr: false,
    loading: () => <div className="w-full h-full bg-muted flex items-center justify-center"><p>Loading Map...</p></div>
});


const serviceCards = [
    {
        title: 'Ride',
        description: 'Fair fares for your daily commute.',
        icon: Car,
        href: '/user/book',
        color: 'text-primary',
        category: 'Mobility & Transport',
    },
     {
        title: 'ResQ',
        description: 'Get help for vehicle breakdowns.',
        icon: Wrench,
        href: '/user/resq',
        color: 'text-amber-500',
        category: 'Mobility & Transport',
    },
    {
        title: 'Emergency SOS',
        description: 'Dispatch the nearest ambulance.',
        icon: Ambulance,
        href: '/user/book?sos=true',
        color: 'text-red-500',
        category: 'Health & Safety',
    },
     {
        title: 'Book Appointment',
        description: 'Consult with doctors at partner hospitals.',
        icon: Calendar,
        href: '/user/appointments',
        color: 'text-blue-500',
        category: 'Health & Safety',
    },
    {
        title: 'Lab Tests',
        description: 'Book tests from certified labs.',
        icon: FlaskConical,
        href: '/user/lab-tests',
        color: 'text-purple-500',
        category: 'Health & Safety',
    },
];

export default function UserDashboard() {
    const { toast } = useToast();
    const router = useRouter();
    const { user, db } = useFirebase();
    const [destination, setDestination] = useState('');

    const [activeRide, setActiveRide] = useState<RideData | null>(null);
    const [activeAmbulanceCase, setActiveAmbulanceCase] = useState<AmbulanceCase | null>(null);
    const [activeGarageRequest, setActiveGarageRequest] = useState<GarageRequest | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [session, setSession] = useState<ClientSession | null>(null);
    const liveMapRef = useRef<any>(null);

     useEffect(() => {
        if (user && db) {
            const userDocRef = doc(db, 'users', user.uid);
            const unsub = onSnapshot(userDocRef, (docSnap) => {
                if (docSnap.exists()) {
                    const userData = docSnap.data();
                    setSession({
                        userId: user.uid,
                        name: userData.name,
                        phone: userData.phone,
                        gender: userData.gender
                    });
                }
                 setIsLoading(false); 
            }, () => setIsLoading(false)); // Also set loading to false on error
            return () => unsub();
        } else if (!user) {
            setIsLoading(false); // If there's no user, we're not loading
        }
    }, [user, db]);

    const resetFlow = useCallback(() => {
        setActiveRide(null);
        setActiveAmbulanceCase(null);
        setActiveGarageRequest(null);
        localStorage.removeItem('activeRideId');
        localStorage.removeItem('activeGarageRequestId');
    }, []);

    useEffect(() => {
        if (!db || !session) return;
        let unsubscribe: (() => void) | null = null;
        
        const checkAndSubscribe = () => {
            const rideId = localStorage.getItem('activeRideId');
            if (rideId) {
                const rideRef = doc(db, 'rides', rideId);
                unsubscribe = onSnapshot(rideRef, (docSnap) => {
                    if (docSnap.exists() && !['completed', 'cancelled_by_driver', 'cancelled_by_rider'].includes(docSnap.data().status)) {
                        setActiveRide({ id: docSnap.id, ...docSnap.data() } as RideData);
                    } else {
                       resetFlow();
                    }
                });
                return;
            }
            
            const qCure = query(collection(db, "emergencyCases"), where("riderId", "==", session.userId), where("status", "in", ["pending", "accepted", "onTheWay", "arrived", "inTransit"]));
            unsubscribe = onSnapshot(qCure, (snapshot) => {
                if (!snapshot.empty) {
                    const caseDoc = snapshot.docs[0];
                    setActiveAmbulanceCase({ id: caseDoc.id, ...caseDoc.data() } as AmbulanceCase);
                } else if (activeAmbulanceCase) {
                    resetFlow();
                }
            });
            
            const qResq = query(collection(db, "garageRequests"), where("driverId", "==", session.userId), where("status", "not-in", ["completed", "cancelled_by_driver", "cancelled_by_mechanic"]));
             unsubscribe = onSnapshot(qResq, (snapshot) => {
                if (!snapshot.empty) {
                    const reqDoc = snapshot.docs[0];
                    setActiveGarageRequest({ id: reqDoc.id, ...reqDoc.data() } as GarageRequest);
                } else if (activeGarageRequest) {
                    resetFlow();
                }
            });
        }
        
        checkAndSubscribe();
        return () => { if (unsubscribe) unsubscribe(); };
    }, [db, session, resetFlow, activeAmbulanceCase, activeGarageRequest]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (destination.trim()) {
            router.push(`/user/book?destination=${encodeURIComponent(destination)}`);
        } else {
            router.push('/user/book');
        }
    }

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 15 },
        visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } },
    };
    
    if (isLoading) {
        return null;
    }
    
    const activeService = activeRide || activeAmbulanceCase || activeGarageRequest;

    return (
        <div className="p-4 md:p-6 space-y-8">
            <AnimatePresence mode="wait">
                {activeService ? (
                     <MotionDiv
                        key="ride-status"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                    >
                         <RideStatus 
                            ride={activeService} 
                            isGarageRequest={!!activeGarageRequest}
                            onCancel={resetFlow} 
                            onDone={resetFlow}
                        />
                    </MotionDiv>
                ) : (
                <MotionDiv 
                    key="dashboard"
                    className="space-y-8"
                    initial="hidden"
                    animate="visible"
                    variants={containerVariants}
                >
                    <MotionDiv variants={itemVariants}>
                        <h1 className="text-3xl font-bold tracking-tight">How can we help you today, {session?.name}?</h1>
                    </MotionDiv>
                    
                    <MotionDiv variants={itemVariants}>
                         <form onSubmit={handleSearch}>
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input
                                    id="destination-search"
                                    placeholder="Enter destination to book a ride..."
                                    className="pl-12 h-14 text-base rounded-full shadow-lg"
                                    value={destination}
                                    onChange={(e) => setDestination(e.target.value)}
                                />
                                <Button type="submit" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full">
                                    <ArrowRight className="w-5 h-5"/>
                                </Button>
                            </div>
                        </form>
                    </MotionDiv>

                    {Object.entries(serviceCards.reduce((acc, service) => {
                        if (!acc[service.category]) acc[service.category] = [];
                        acc[service.category].push(service);
                        return acc;
                    }, {} as Record<string, typeof serviceCards>)).map(([category, services]) => (
                        <MotionDiv key={category} variants={itemVariants}>
                            <h3 className="text-lg font-semibold mb-3">{category}</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {services.map((service) => (
                                    <Link key={service.title} href={service.href} passHref>
                                        <Card className="h-full transition-all hover:shadow-lg hover:-translate-y-1 hover:border-primary/50 text-center cursor-pointer">
                                            <CardContent className="p-4 flex flex-col items-center justify-center gap-2">
                                                <div className="p-3 bg-muted rounded-full">
                                                    <service.icon className={`w-6 h-6 ${service.color}`} />
                                                </div>
                                                <p className="font-semibold text-sm">{service.title}</p>
                                                <p className="text-xs text-muted-foreground">{service.description}</p>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                ))}
                            </div>
                        </MotionDiv>
                    ))}
                </MotionDiv>
                )}
            </AnimatePresence>
        </div>
    );
}
