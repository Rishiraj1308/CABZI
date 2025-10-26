
'use client'

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, MapPin } from 'lucide-react';
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

    return (
        <motion.div 
            className="h-screen w-screen flex flex-col bg-background overflow-hidden"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
        >
            {/* Header Section */}
            <header className="bg-gradient-to-br from-green-500 to-primary p-4 pt-6 relative text-primary-foreground overflow-hidden">
                <div className="container mx-auto">
                    <motion.div variants={itemVariants}>
                        <Button variant="ghost" size="icon" className="hover:bg-white/10" onClick={() => router.back()}>
                            <ArrowLeft className="w-5 h-5"/>
                        </Button>
                    </motion.div>
                    <motion.div variants={itemVariants} className="pt-8 pb-16 text-left">
                        <h1 className="text-4xl font-bold">Transport</h1>
                        <p className="opacity-80 mt-1">Wherever you're going, let's get you there!</p>
                    </motion.div>
                </div>
                 <motion.div
                    initial={{ x: 100, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 50 }}
                    className="absolute -bottom-4 right-0 w-48 h-28"
                 >
                    <Image src="/car.svg" alt="Car" layout="fill" objectFit="contain" className="opacity-90" data-ai-hint="car illustration" />
                </motion.div>
            </header>

            {/* Content Section */}
            <motion.div 
                className="flex-1 bg-muted/30 rounded-t-3xl -mt-8 p-4 space-y-6"
                variants={itemVariants}
            >
                <div className="container mx-auto">
                    {/* Search Card */}
                    <motion.div
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3, type: 'spring' }}
                    >
                        <Card className="shadow-2xl -mt-12">
                            <CardContent className="p-3 space-y-1">
                                <div className="flex items-center gap-4 p-2 rounded-lg">
                                    <div className="w-2.5 h-2.5 rounded-full bg-green-500 ring-4 ring-green-500/20"/>
                                    <p className="font-semibold text-base text-muted-foreground">Current Location</p>
                                </div>
                                <div className="border-l-2 border-dotted border-border h-4 ml-[13px]"></div>
                                <Link href="/user/book/map" className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted">
                                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 ring-4 ring-red-500/20"/>
                                    <p className="font-semibold text-base">Where to?</p>
                                </Link>
                            </CardContent>
                        </Card>
                    </motion.div>
                    
                    {/* Recent Trips */}
                    <motion.div 
                        className="space-y-2 mt-8"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        <h3 className="font-bold text-lg">Recent Trips</h3>
                        {recentTrips.map((trip, index) => (
                            <motion.div 
                                key={trip.title}
                                variants={itemVariants}
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
                    </motion.div>
                </div>
            </motion.div>
        </motion.div>
    );
}
