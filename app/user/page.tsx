
'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Car, Wrench, Ambulance, Calendar, FlaskConical, Search, MapPin, ArrowRight, History, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { AnimatePresence } from 'framer-motion';
import { MotionDiv } from '@/components/ui/motion-div';
import { useFirebase } from '@/firebase/client-provider';
import { getDoc, doc, onSnapshot, query, collection, where } from 'firebase/firestore';
import type { RideData, AmbulanceCase, GarageRequest, ClientSession } from '@/lib/types';
import RideStatus from '@/components/ride-status';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const serviceCards = [
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
        description: 'Consult with verified doctors.',
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
    {
        title: 'Roadside Assistance',
        description: 'Get help for vehicle breakdowns.',
        icon: Wrench,
        href: '/user/resq',
        color: 'text-amber-500',
        category: 'Other Services',
    },
];

const recentTrips = [
    { icon: History, title: "Connaught Place", description: "New Delhi" },
    { icon: History, title: "IGI Airport, Terminal 3", description: "New Delhi" },
    { icon: History, title: "Select Citywalk", description: "Saket, New Delhi" },
]


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
            }, () => setIsLoading(false));
            return () => unsub();
        } else if (!user) {
            setIsLoading(false);
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
            router.push(`/user/book/map?search=${encodeURIComponent(destination)}`);
        } else {
             router.push('/user/book');
        }
    }

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } },
    };
    
    if (isLoading) {
        return null; // Or a skeleton loader
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
                        className="flex justify-center"
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
                    
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-6">
                            <MotionDiv variants={itemVariants}>
                                <Card className="shadow-xl">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2"><Car className="w-6 h-6 text-primary"/> Book a Ride</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <form onSubmit={handleSearch}>
                                            <div className="relative">
                                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                                <Input
                                                    id="destination-search"
                                                    placeholder="Enter destination..."
                                                    className="pl-12 h-14 text-base rounded-full"
                                                    value={destination}
                                                    onChange={(e) => setDestination(e.target.value)}
                                                />
                                                <Button type="submit" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full">
                                                    <ArrowRight className="w-5 h-5"/>
                                                </Button>
                                            </div>
                                        </form>
                                    </CardContent>
                                </Card>
                            </MotionDiv>

                             <MotionDiv variants={itemVariants}>
                                <h3 className="text-lg font-semibold mb-3">Recent Trips</h3>
                                <div className="space-y-2">
                                    {recentTrips.map((trip, index) => (
                                        <div key={index} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors">
                                            <div className="p-3 bg-muted rounded-full border">
                                                <trip.icon className="w-5 h-5 text-muted-foreground" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-semibold">{trip.title}</p>
                                                <p className="text-sm text-muted-foreground">{trip.description}</p>
                                            </div>
                                            <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
                                        </div>
                                    ))}
                                </div>
                            </MotionDiv>
                        </div>
                        
                        <div className="lg:col-span-1 space-y-6">
                            {Object.entries(serviceCards.reduce((acc, service) => {
                                if(service.category !== 'Mobility & Transport') {
                                     if (!acc[service.category]) acc[service.category] = [];
                                     acc[service.category].push(service);
                                }
                                return acc;
                            }, {} as Record<string, typeof serviceCards>)).map(([category, services]) => (
                                <MotionDiv variants={itemVariants} key={category}>
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-lg">{category}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            {services.map(service => (
                                                <Link key={service.title} href={service.href} className="block p-3 rounded-lg hover:bg-muted transition-colors">
                                                    <div className="flex items-center gap-4">
                                                        <div className="p-2 bg-muted rounded-full">
                                                            <service.icon className={`w-5 h-5 ${service.color}`} />
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-sm">{service.title}</p>
                                                            <p className="text-xs text-muted-foreground">{service.description}</p>
                                                        </div>
                                                    </div>
                                                </Link>
                                            ))}
                                        </CardContent>
                                    </Card>
                                </MotionDiv>
                            ))}
                        </div>

                    </div>
                </MotionDiv>
                 )}
            </AnimatePresence>
        </div>
    );
}
