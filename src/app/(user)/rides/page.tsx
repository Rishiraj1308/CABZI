
'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin, History } from 'lucide-react'

// This is the mock data moved from the main user page
const recentTrips = [
    { id: 1, from: 'Cyber Hub, Gurgaon', to: 'Noida Film City', fare: '₹650', date: 'Yesterday' },
    { id: 2, from: 'Select Citywalk, Saket', to: 'Home (Lajpat Nagar)', fare: '₹250', date: '2 days ago' },
    { id: 3, from: 'IGI Airport, T3', to: 'Work (Connaught Place)', fare: '₹450', date: 'Last week' },
    { id: 4, from: 'Sector 18, Noida', to: 'Khan Market, Delhi', fare: '₹380', date: 'Last week' },
]

export default function MyRidesPage() {
  return (
    <div className="p-4 md:p-6 space-y-6">
        <div className="animate-fade-in">
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <History className="w-8 h-8 text-primary" /> 
                My Rides
            </h2>
            <p className="text-muted-foreground">A history of all your past trips with Cabzi.</p>
        </div>
        
        <div className="space-y-4 animate-fade-in">
            {recentTrips.map(trip => (
            <Card key={trip.id} className="hover:bg-muted/50 cursor-pointer">
                <CardContent className="p-4 flex items-center gap-4">
                    <div className="p-3 bg-muted rounded-lg"><MapPin className="w-6 h-6 text-muted-foreground"/></div>
                    <div className="flex-1">
                        <p className="font-semibold text-sm line-clamp-1">{trip.from}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">to {trip.to}</p>
                         <p className="text-xs text-muted-foreground">{trip.date}</p>
                    </div>
                    <p className="font-bold text-lg">~{trip.fare}</p>
                </CardContent>
            </Card>
            ))}
        </div>

        {recentTrips.length === 0 && (
            <Card className="h-48 flex items-center justify-center">
                <p className="text-muted-foreground">You haven't taken any rides yet.</p>
            </Card>
        )}
    </div>
  )
}
