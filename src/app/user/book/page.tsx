'use client'

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Map, MapPin } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';

const recentTrips = [
    {
        icon: MapPin,
        title: "Connaught Place",
        description: "New Delhi, Delhi",
        distance: "5.2 km",
        time: "15 min"
    },
    {
        icon: MapPin,
        title: "Indira Gandhi International Airport",
        description: "New Delhi, Delhi",
        distance: "18.7 km",
        time: "45 min"
    },
    {
        icon: MapPin,
        title: "Select Citywalk",
        description: "Saket, New Delhi",
        distance: "12.1 km",
        time: "30 min"
    },
]

export default function BookRidePage() {
    const router = useRouter();
    const [destination, setDestination] = useState('');

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };
    
    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    const handleSearch = () => {
        if (destination.trim()) {
            router.push(`/user/book/map?search=${encodeURIComponent(destination)}`);
        }
    }

    return (
        <motion.div 
            className="h-screen w-screen flex flex-col bg-muted/30 overflow-hidden"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
        >
            <header className="bg-gradient-to-br from-green-500 to-primary p-4 relative text-primary-foreground">
                <div className="container mx-auto">
                    <motion.div variants={itemVariants}>
                        <Button variant="ghost" size="icon" className="hover:bg-white/10" onClick={() => router.back()}>
                            <ArrowLeft className="w-5 h-5"/>
                        </Button>
                    </motion.div>
                    <motion.div variants={itemVariants} className="pt-8 pb-24 text-left">
                        <h1 className="text-4xl font-bold">Transport</h1>
                        <p className="opacity-80 mt-1">Wherever you're going, let's get you there!</p>
                    </motion.div>
                </div>
                 <motion.div
                    initial={{ x: 100, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 50 }}
                    className="absolute -bottom-4 right-0 w-48 h-28 z-20"
                 >
                    <Image src="/car.svg" alt="Car" layout="fill" objectFit="contain" className="opacity-90" data-ai-hint="car illustration" />
                </motion.div>
            </header>

            <div className="flex-1 container mx-auto p-4 space-y-6 relative z-10 -mt-20">
                 <motion.div 
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3, type: 'spring' }}
                    className="space-y-6"
                >
                    <Card className="shadow-lg">
                        <CardContent className="p-3 space-y-1">
                            <div className="flex items-center gap-4 p-2 rounded-lg">
                                <div className="w-2.5 h-2.5 rounded-full bg-green-500 ring-4 ring-green-500/20"/>
                                <p className="font-semibold text-base text-muted-foreground">Current Location</p>
                            </div>
                            <div className="border-l-2 border-dotted border-border h-4 ml-[13px]"></div>
                            <div className="flex items-center gap-4 p-2 rounded-lg">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-500 ring-4 ring-red-500/20"/>
                                <Input
                                    placeholder="Where to?"
                                    className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-base font-semibold p-0 h-auto"
                                    value={destination}
                                    onChange={(e) => setDestination(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                />
                            </div>
                        </CardContent>
                    </Card>
                    
                    <div className="space-y-2 mt-8">
                        <h3 className="font-bold text-lg">Recent Trips</h3>
                        {recentTrips.map((trip, index) => (
                            <motion.div 
                                key={trip.title}
                                variants={itemVariants}
                                initial="hidden"
                                animate="visible"
                                transition={{delay: 0.5 + index * 0.1}}
                            >
                                <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-card cursor-pointer transition-colors">
                                    <div className="p-3 bg-card rounded-full border">
                                        <trip.icon className="w-5 h-5 text-muted-foreground" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold">{trip.title}</p>
                                        <p className="text-sm text-muted-foreground">{trip.description}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-semibold">{trip.distance}</p>
                                        <p className="text-xs text-muted-foreground">{trip.time}</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
}
