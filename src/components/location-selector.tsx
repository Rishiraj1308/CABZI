
'use client'

import React from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { ArrowLeft, Plus, Star } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface LocationSelectorProps {
  pickup: { address: string };
  setPickup: (value: { address: string }) => void;
  destination: { address: string };
  setDestination: (value: { address: string }) => void;
  onBack: () => void;
}

const recentLocations = [
    { name: 'Home', address: '123, Lajpat Nagar, New Delhi' },
    { name: 'Work', address: 'Cyber Hub, Gurgaon, Haryana' },
];

const suggestedLocations = [
    { name: 'NAIA Terminal 2', distance: '1.23km', address: 'Barangay 197, Pasay City, Metro Manila' },
    { name: 'One Ayala', distance: '3.65km', address: '1, Ayala Avenue cor EDSA, San Lorenzo' },
    { name: 'Mall Entrance', distance: '3.6km', address: 'One Ayala, Makati City' },
];


export default function LocationSelector({
  pickup,
  setPickup,
  destination,
  setDestination,
  onBack
}: LocationSelectorProps) {
  return (
    <div className="p-4">
      <div className="relative mb-4">
        <Button onClick={onBack} variant="ghost" size="icon" className="absolute top-1/2 -translate-y-1/2 left-0 h-8 w-8">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="pl-10 pr-6">
            <div className="relative">
                <Input 
                    value={pickup.address}
                    onChange={e => setPickup({ address: e.target.value })}
                    placeholder="Current Location"
                    className="bg-muted border-0 focus-visible:ring-0 text-base font-semibold"
                />
            </div>
             <div className="border-l-2 border-dotted border-border h-4 ml-[13px] my-1"></div>
             <div className="relative">
                <Input 
                    value={destination.address}
                    onChange={e => setDestination({ address: e.target.value })}
                    placeholder="Where to?"
                    className="bg-muted border-primary focus-visible:ring-primary text-base font-semibold"
                />
             </div>
        </div>
      </div>

       <Tabs defaultValue="suggested" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="recent">Recent</TabsTrigger>
                <TabsTrigger value="suggested">Suggested</TabsTrigger>
                <TabsTrigger value="saved">Saved</TabsTrigger>
            </TabsList>
            <TabsContent value="recent" className="mt-4 space-y-2">
                 {recentLocations.map(loc => (
                    <div key={loc.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                        <div className="p-2 bg-muted rounded-full"><Star className="w-4 h-4 text-amber-500 fill-amber-400" /></div>
                        <div>
                            <p className="font-semibold text-sm">{loc.name}</p>
                            <p className="text-xs text-muted-foreground">{loc.address}</p>
                        </div>
                    </div>
                ))}
            </TabsContent>
            <TabsContent value="suggested" className="mt-4 space-y-2">
                 {suggestedLocations.map(loc => (
                    <div key={loc.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                        <div className="p-2 bg-muted rounded-full"><MapPin className="w-4 h-4 text-primary" /></div>
                        <div className="flex-1">
                            <p className="font-semibold text-sm">{loc.name}</p>
                            <p className="text-xs text-muted-foreground">{loc.distance} • {loc.address}</p>
                        </div>
                    </div>
                ))}
            </TabsContent>
            <TabsContent value="saved">
                 <div className="text-center py-8 text-muted-foreground">
                    <p>No saved places yet.</p>
                </div>
            </TabsContent>
        </Tabs>
    </div>
  )
}
