
'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Car, Wrench, Ambulance, Calendar, FlaskConical } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useFirebase } from '@/firebase/client-provider';
import { getDoc, doc, onSnapshot, query, collection, where } from 'firebase/firestore';
import type { RideData, AmbulanceCase, GarageRequest, ClientSession } from '@/lib/types';
import RideStatus from '@/components/ride-status';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

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
        href: '/user/book-appointment',
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
                 setIsLoading(false); // Set loading to false after session is fetched or fails
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

    // Effect to check for any active service on load and listen for updates
    useEffect(() => {
        if (!db || !session) {
            return;
        };

        let unsubscribe: (() => void) | null = null;
        
        const checkAndSubscribe = () => {
            // Check for active ride
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
            
            // Check for active emergency case
            const qCure = query(collection(db, "emergencyCases"), where("riderId", "==", session.userId), where("status", "in", ["pending", "accepted", "onTheWay", "arrived", "inTransit"]));
            unsubscribe = onSnapshot(qCure, (snapshot) => {
                if (!snapshot.empty) {
                    const caseDoc = snapshot.docs[0];
                    setActiveAmbulanceCase({ id: caseDoc.id, ...caseDoc.data() } as AmbulanceCase);
                } else if (activeAmbulanceCase) {
                    resetFlow();
                }
            });
            
             // Check for active ResQ request
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
        return () => {
            if (unsubscribe) unsubscribe();
        };

    }, [db, session, resetFlow, activeAmbulanceCase, activeGarageRequest]);

    const servicesByCat = serviceCards.reduce((acc, service) => {
        if (!acc[service.category]) {
            acc[service.category] = [];
        }
        acc[service.category].push(service);
        return acc;
    }, {} as Record<string, typeof serviceCards>);

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
        <div className="h-full w-full flex flex-col">
            <div className="flex-1 relative">
                <div className="absolute inset-0 z-0">
                    <LiveMap
                        ref={liveMapRef}
                        driverLocation={activeRide?.driverDetails?.location as any}
                        riderLocation={activeRide?.pickup?.location as any}
                        routeGeometry={activeRide?.routeGeometry}
                        isTripInProgress={activeRide?.status === 'in-progress'}
                    />
                </div>
            </div>
            <div className="z-10 p-4">
                <AnimatePresence mode="wait">
                    {activeService ? (
                        <RideStatus 
                            key="ride-status"
                            ride={activeService} 
                            isGarageRequest={!!activeGarageRequest}
                            onCancel={resetFlow} 
                            onDone={resetFlow}
                        />
                    ) : (
                        <MotionDiv 
                            key="selection"
                            className="space-y-8"
                            initial={{y: 200, opacity: 0}}
                            animate={{y: 0, opacity: 1}}
                            exit={{y: 200, opacity: 0}}
                            transition={{type: 'spring', stiffness: 100, damping: 20}}
                        >
                            <Card className="shadow-2xl">
                                <CardHeader className="text-center">
                                    <CardTitle>How can we help you today?</CardTitle>
                                    <CardDescription>Choose a service to get started.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {serviceCards.map((service, index) => (
                                             <Link key={service.title} href={service.href} legacyBehavior>
                                                <a onClick={(e) => {
                                                    if (service.href === '#') {
                                                        e.preventDefault();
                                                        toast({ title: 'Coming Soon!', description: 'This feature is under development.' });
                                                    }
                                                }}>
                                                    <Card className="h-full transition-all text-center bg-background/80 backdrop-blur-sm hover:shadow-lg hover:border-primary/50">
                                                        <CardContent className="p-4 flex flex-col items-center justify-center gap-2">
                                                            <div className="p-3 bg-muted rounded-full">
                                                            <service.icon className={`w-6 h-6 ${service.color}`} />
                                                            </div>
                                                            <p className="font-semibold text-sm">{service.title}</p>
                                                        </CardContent>
                                                    </Card>
                                                </a>
                                            </Link>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </MotionDiv>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
