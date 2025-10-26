
'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Map, Clock, MapPin } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

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
    
    return (
        <div className="h-screen w-screen flex flex-col bg-background overflow-hidden">
            {/* Header Section */}
            <div className="bg-green-500 text-white p-4 pt-6 relative">
                <div className="container mx-auto">
                    <div className="flex justify-between items-center">
                        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => router.back()}>
                            <ArrowLeft className="w-5 h-5"/>
                        </Button>
                        <Button asChild variant="ghost" className="text-white hover:bg-white/10">
                            <Link href="/user/book/map">
                                <Map className="w-5 h-5 mr-2"/> Map
                            </Link>
                        </Button>
                    </div>
                    <div className="pt-8 pb-16 text-left">
                        <h1 className="text-3xl font-bold">Transport</h1>
                        <p className="opacity-80">Wherever you're going, let's get you there!</p>
                    </div>
                </div>
                 <div className="absolute -bottom-1 right-4 w-40 h-24">
                    <Image src="/car.svg" alt="Car" layout="fill" objectFit="contain" className="opacity-90" data-ai-hint="car illustration" />
                </div>
            </div>

            {/* Content Section */}
            <div className="flex-1 bg-background rounded-t-3xl -mt-8 p-4 space-y-6">
                <div className="container mx-auto">
                    {/* Search Card */}
                    <Card className="shadow-lg -mt-12">
                        <CardContent className="p-3 flex items-center gap-3">
                             <div className="flex items-center gap-3 p-2 flex-1">
                                 <div className="w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-red-500/30"/>
                                 <p className="font-semibold text-base text-muted-foreground">Where to?</p>
                            </div>
                            <Button variant="secondary" className="h-full">
                                <Clock className="w-4 h-4 mr-2"/>
                                Later
                            </Button>
                        </CardContent>
                    </Card>
                    
                    {/* Recent Trips */}
                    <div className="space-y-2 mt-8">
                        <h3 className="font-bold text-lg">Recent Trips</h3>
                        {recentTrips.map((trip) => (
                            <div key={trip.title} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted cursor-pointer">
                                <div className="p-3 bg-muted rounded-full">
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
                        ))}
                    </div>

                    {/* More ways to travel */}
                     <div className="pt-4">
                        <div className="p-4 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center gap-4">
                            <div className="text-4xl">👨‍👩‍👧‍👦</div>
                            <div>
                                <p className="font-bold">Travel with friends in group rides!</p>
                                <p className="text-sm text-blue-800/80 dark:text-blue-200/80">Save money and the environment.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
