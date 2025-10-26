
'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Star, MapPin, HeartHandshake, IndianRupee, Clock, Calendar, Search } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import Image from 'next/image'

export default function BookRidePage() {
    
  return (
    <div className="flex flex-col h-screen bg-muted/20">
        {/* Header Section */}
        <div className="bg-green-100 dark:bg-green-900/30 p-6 pt-12 relative overflow-hidden">
            <div className="flex justify-between items-center mb-4">
                <Button variant="ghost" size="icon"><ArrowLeft className="w-6 h-6"/></Button>
                <h1 className="text-2xl font-bold">Transport</h1>
                <Button variant="outline" className="bg-white/80 backdrop-blur-sm"><MapPin className="w-4 h-4 mr-2"/> Map</Button>
            </div>
            <p className="text-lg text-foreground/80 mb-6">Wherever you&apos;re going, let&apos;s get you there!</p>

            <div className="absolute -right-10 -bottom-5 w-48 h-24">
                 <Image src="/images/curocity-car-illustration.svg" alt="Car Illustration" width={192} height={96} data-ai-hint="car illustration" />
            </div>
        </div>

        {/* Content Section */}
        <div className="flex-1 bg-background rounded-t-3xl -mt-4 p-4 space-y-6">
            {/* Search Card */}
            <Card className="shadow-lg">
                <CardContent className="p-4 flex items-center gap-2">
                     <div className="relative flex-1">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-red-500 ring-2 ring-red-200"></div>
                        <Input placeholder="Where to?" className="pl-8 h-11 border-0 focus-visible:ring-0 text-base font-semibold"/>
                     </div>
                     <Button variant="outline"><Calendar className="w-4 h-4 mr-2"/> Later</Button>
                </CardContent>
            </Card>

            {/* Saved Locations */}
            <div className="space-y-4">
                 <div className="flex items-center gap-4 cursor-pointer">
                    <div className="p-2.5 bg-muted rounded-full">
                        <MapPin className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 border-b pb-4">
                        <p className="font-semibold">Cebu South Bus Terminal</p>
                        <p className="text-xs text-muted-foreground">Natalio Bacalso Avenue, Pahina Central...</p>
                    </div>
                </div>
                 <div className="flex items-center gap-4 cursor-pointer">
                    <div className="p-2.5 bg-muted rounded-full">
                        <MapPin className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 border-b pb-4">
                        <p className="font-semibold">Cebu Pier 1</p>
                        <p className="text-xs text-muted-foreground">Quezon Boulevard, San Roque (Ciudad)...</p>
                    </div>
                </div>
                 <div className="flex items-center gap-4 cursor-pointer">
                    <div className="p-2.5 bg-muted rounded-full">
                        <MapPin className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                        <p className="font-semibold">Shangri-La Mactan, Cebu</p>
                        <p className="text-xs text-muted-foreground">Punta Engano Rd, Mactan, Lapu-Lapu City...</p>
                    </div>
                </div>
            </div>
            
            {/* More Ways to Travel */}
            <div className="pt-4">
                <h3 className="font-bold mb-2">More ways to travel</h3>
                 <Card className="bg-blue-100/50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-900">
                    <CardContent className="p-4 flex items-center gap-3">
                         <div className="p-2 bg-blue-200/50 dark:bg-blue-500/30 rounded-full">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-blue-600"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                         </div>
                        <p className="font-semibold">Travel with friends in group rides!</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    </div>
  );
}
