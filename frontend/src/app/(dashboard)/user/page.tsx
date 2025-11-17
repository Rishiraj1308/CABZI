
'use client'

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Mic, MapPin, History, Car, Ambulance, FlaskConical, Wrench, Calendar, Clock, Hospital, UserCheck, HeartPulse, ArrowRight, Map as MapIcon, Home } from 'lucide-react';
import { ServiceCard } from '@/features/user/components/ServiceCard';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useFirebase } from '@/lib/firebase/client-provider';
import Link from 'next/link';
import { collection, query, where, getDocs, GeoPoint } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

interface Partner {
    id: string;
    currentLocation?: GeoPoint;
    isOnline?: boolean;
}

// Haversine distance formula
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
};

export default function UserDashboard() {
    const [session, setSession] = React.useState<{ name: string } | null>(null);
    const router = useRouter();
    const { db } = useFirebase();

    const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
    const [nearestDriverEta, setNearestDriverEta] = useState<number | null>(null);
    const [isLoadingEta, setIsLoadingEta] = useState(true);
    const [nearestMechanicEta, setNearestMechanicEta] = useState<number | null>(null);
    const [isLoadingMechanicEta, setIsLoadingMechanicEta] = useState(true);

    useEffect(() => {
        const sessionData = localStorage.getItem('curocity-session');
        if (sessionData) {
            setSession(JSON.parse(sessionData));
        }
    }, []);

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({
                        lat: position.coords.latitude,
                        lon: position.coords.longitude,
                    });
                },
                () => {
                    console.error("Location access denied.");
                    // Fallback location if permission is denied
                    setUserLocation({ lat: 28.6139, lon: 77.2090 });
                    setIsLoadingEta(false);
                    setIsLoadingMechanicEta(false);
                }
            );
        } else {
             setIsLoadingEta(false);
             setIsLoadingMechanicEta(false);
        }
    }, []);
    
    useEffect(() => {
        if (!db || !userLocation) return;

        const fetchNearestPartner = async (collectionName: string, speedKph: number, setter: (eta: number | null) => void, loadingSetter: (loading: boolean) => void) => {
            loadingSetter(true);
            try {
                const partnersQuery = query(collection(db, collectionName), where('isOnline', '==', true));
                const querySnapshot = await getDocs(partnersQuery);
                const onlinePartners: Partner[] = [];
                querySnapshot.forEach((doc) => {
                    onlinePartners.push({ id: doc.id, ...doc.data() } as Partner);
                });

                if (onlinePartners.length === 0) {
                    setter(null);
                    return;
                }

                let closestDistance = Infinity;
                for (const partner of onlinePartners) {
                    if (partner.currentLocation) {
                        const distance = getDistance(userLocation.lat, userLocation.lon, partner.currentLocation.latitude, partner.currentLocation.longitude);
                        if (distance < closestDistance) closestDistance = distance;
                    }
                }
                
                if (closestDistance !== Infinity) {
                    const etaMinutes = (closestDistance / speedKph) * 60;
                    setter(Math.round(etaMinutes) + 2); // Add buffer
                }
            } catch (error) {
                console.error(`Error fetching nearest ${collectionName}:`, error);
            } finally {
                loadingSetter(false);
            }
        };

        fetchNearestPartner('partners', 25, setNearestDriverEta, setIsLoadingEta);
        fetchNearestPartner('mechanics', 20, setNearestMechanicEta, setIsLoadingMechanicEta);

    }, [db, userLocation]);
    
    const name = session ? session.name.split(' ')[0] : '';
    const greetingText = `Hi, ${name}! What you need?`;
    
    const sentenceVariants = {
        hidden: { opacity: 1 },
        visible: { opacity: 1, transition: { delay: 0.2, staggerChildren: 0.04 } },
    };
    const letterVariants = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } };

    const services = [
      {
        icon: Car,
        title: "Ride",
        description: "Fair fares for your daily commute.",
        tag: isLoadingEta ? '...' : nearestDriverEta ? `~${nearestDriverEta} min` : '~7 min',
        tagIcon: Clock,
        href: "/user/ride-booking",
        iconBgClass: "bg-green-100 dark:bg-green-900/50",
        iconColorClass: "text-green-600 dark:text-green-400",
        tagBgClass: "bg-green-100 dark:bg-green-900/50",
        tagColorClass: "text-green-700 dark:text-green-300",
        className: "md:col-span-2",
        glowColor: "hsl(142 71% 45%)",
      },
      {
        icon: Wrench,
        title: "ResQ",
        description: "On-site assistance for minor issues.",
        tag: isLoadingMechanicEta ? '...' : nearestMechanicEta ? `~${nearestMechanicEta} min` : 'On-Demand',
        tagIcon: Clock,
        href: "/user/resq",
        iconBgClass: "bg-amber-100 dark:bg-amber-900/50",
        iconColorClass: "text-amber-600 dark:text-amber-400",
        tagBgClass: "bg-amber-100 dark:bg-amber-900/50",
        tagColorClass: "text-amber-700 dark:text-amber-300",
        glowColor: "hsl(48 95% 55%)",
      },
      {
        icon: Ambulance,
        title: "Emergency SOS",
        description: "Connect to 24/7 emergency line.",
        tag: "~15 min",
        tagIcon: Clock,
        href: "/user/cure-booking",
        iconBgClass: "bg-red-100 dark:bg-red-900/50",
        iconColorClass: "text-red-600 dark:text-red-400",
        tagBgClass: "bg-red-100 dark:bg-red-900/50",
        tagColorClass: "text-red-700 dark:text-red-300",
        glowColor: "hsl(0 84% 60%)",
      },
      {
        icon: Calendar,
        title: "Book Appointment",
        description: "Clinics, specialists, telehealth.",
        tag: "Next: 1-2d",
        tagIcon: Calendar,
        href: "/user/appointment-booking",
        iconBgClass: "bg-blue-100 dark:bg-blue-900/50",
        iconColorClass: "text-blue-600 dark:text-blue-400",
        tagBgClass: "bg-blue-100 dark:bg-blue-900/50",
        tagColorClass: "text-blue-700 dark:text-blue-300",
        glowColor: "hsl(221 83% 53%)",
      },
      {
        icon: FlaskConical,
        title: "Lab Tests",
        description: "Home sample pickup available.",
        tag: "Home pickup",
        tagIcon: MapPin,
        href: "/user/lab-tests",
        iconBgClass: "bg-purple-100 dark:bg-purple-900/50",
        iconColorClass: "text-purple-600 dark:text-purple-400",
        tagBgClass: "bg-purple-100 dark:bg-purple-900/50",
        tagColorClass: "text-purple-700 dark:text-purple-300",
        glowColor: "hsl(262 84% 59%)",
      },
      {
        icon: Home,
        title: "Home Services",
        description: "Plumber, Electrician, Salon.",
        tag: "~45 min",
        href: "#",
        iconBgClass: "bg-orange-100 dark:bg-orange-900/50",
        iconColorClass: "text-orange-600 dark:text-orange-400",
        tagBgClass: "bg-orange-100 dark:bg-orange-900/50",
        tagColorClass: "text-orange-700 dark:text-orange-300",
        glowColor: "hsl(25 95% 53%)",
      }
    ]

    return (
        <div className="container mx-auto max-w-4xl py-12">
            <div className="text-center mb-8">
                 <motion.h1
                    className="text-xl md:text-2xl font-bold tracking-tight"
                    variants={sentenceVariants}
                    initial="hidden"
                    animate="visible"
                 >
                    {greetingText.split("").map((char, index) => (
                        <motion.span key={char + "-" + index} variants={letterVariants} style={{display: 'inline-block'}}>
                            {char === ' ' ? '\u00A0' : char}
                        </motion.span>
                    ))}
                </motion.h1>
                <p className="text-muted-foreground mt-2">Choose a service to get started.</p>
            </div>

            <div className="mb-6 relative max-w-2xl mx-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search services (e.g., ride, lab, appointment)"
                    className="w-full pl-12 pr-12 h-12 text-sm sm:text-base rounded-full bg-background/80 backdrop-blur-sm border focus-visible:border-primary transition-colors"
                />
                <Button variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full">
                    <Mic className="h-5 w-5 text-muted-foreground" />
                </Button>
            </div>
            
            <div className="space-y-4">
                 <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold">All Services</h2>
                    <Button asChild variant="outline" size="icon">
                        <Link href="/user/map">
                            <MapIcon className="w-5 h-5" />
                        </Link>
                    </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {services.map(service => (
                        <ServiceCard
                            key={service.title}
                            icon={service.icon}
                            title={service.title}
                            description={service.description}
                            tag={service.tag}
                            tagIcon={service.tagIcon}
                            href={service.href}
                            iconBgClass={service.iconBgClass}
                            iconColorClass={service.iconColorClass}
                            tagBgClass={service.tagBgClass}
                            tagColorClass={service.tagColorClass}
                            className={service.className}
                            glowColor={service.glowColor}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
