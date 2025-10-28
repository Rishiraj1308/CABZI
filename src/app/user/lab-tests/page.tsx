
'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Search, SlidersHorizontal, ArrowLeft, FlaskConical, MapPin, Activity, HeartPulse, Droplets, Thermometer, User, MessageSquare } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const testCategories = [
    { name: 'Full Body Checkup', icon: Activity },
    { name: 'Diabetes Panel', icon: Droplets },
    { name: 'Heart Health', icon: HeartPulse },
    { name: 'Fever Panel', icon: Thermometer },
];

const mockLabs = [
    { id: 'lab1', name: 'Dr. Lal PathLabs', location: 'Gurgaon, Sector 29', distance: 2.1, accredited: true, homeCollection: true, logo: 'https://placehold.co/100x100/A7D397/4F6F52?text=LAL' },
    { id: 'lab2', name: 'SRL Diagnostics', location: 'DLF Phase 4, Gurgaon', distance: 3.5, accredited: true, homeCollection: true, logo: 'https://placehold.co/100x100/F4E869/4F6F52?text=SRL' },
    { id: 'lab3', name: 'Metropolis Healthcare', location: 'Sushant Lok, Gurgaon', distance: 4.2, accredited: true, homeCollection: false, logo: 'https://placehold.co/100x100/97E7E1/4F6F52?text=MET' },
    { id: 'lab4', name: 'Thyrocare Aarogyam', location: 'Old Gurgaon', distance: 6.8, accredited: false, homeCollection: true, logo: 'https://placehold.co/100x100/F2C18D/4F6F52?text=THY' },
];


export default function LabTestsPage() {
    const router = useRouter()
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [labs, setLabs] = useState(mockLabs);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>('Heart Health');
    
    // Filter States
    const [homeCollection, setHomeCollection] = useState('any');
    const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 1000);
        return () => clearTimeout(timer);
    }, []);

    const filteredLabs = useMemo(() => {
        return labs.filter(lab => {
            const searchMatch = lab.name.toLowerCase().includes(searchQuery.toLowerCase()) || lab.location.toLowerCase().includes(searchQuery.toLowerCase());
            const homeCollectionMatch = homeCollection === 'any' || (homeCollection === 'yes' && lab.homeCollection);
            return searchMatch && homeCollectionMatch;
        });
    }, [labs, searchQuery, homeCollection]);

    const FilterPanel = () => (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><SlidersHorizontal/> Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label>Home Collection</Label>
                    <RadioGroup value={homeCollection} onValueChange={setHomeCollection} className="flex gap-4 items-center pt-2">
                        <RadioGroupItem value="any" id="hc-any" /><Label htmlFor="hc-any">Any</Label>
                        <RadioGroupItem value="yes" id="hc-yes" /><Label htmlFor="hc-yes">Yes</Label>
                    </RadioGroup>
                </div>
            </CardContent>
        </Card>
    );
    
    return (
      <div className="min-h-screen bg-background">
        <div className="relative bg-gradient-to-br from-purple-600 via-primary to-primary/70 text-primary-foreground p-6 md:p-8">
            <div className="container mx-auto">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="hover:bg-white/10" onClick={() => router.push('/user')}>
                    <ArrowLeft className="w-5 h-5"/>
                    </Button>
                </div>
                <div className="mt-6 py-10">
                    <h1 className="text-4xl md:text-5xl font-bold">Book Lab Tests</h1>
                    <p className="opacity-80 mt-1 max-w-md">Certified labs, at your convenience.</p>
                </div>
            </div>
        </div>

        <main className="container mx-auto py-8 px-4 md:px-6 space-y-8 relative -mt-20 z-10">
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                    id="test-search"
                    placeholder="Search for tests or labs (e.g., Vitamin D, Dr. Lal...)"
                    className="pl-12 h-14 text-base rounded-full shadow-lg border-2"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <section>
                 <h2 className="text-xl font-bold mb-4">Browse by Test Category</h2>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {testCategories.map(cat => (
                        <Card 
                            key={cat.name} 
                            onClick={() => setSelectedCategory(cat.name)}
                            className={`p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${selectedCategory === cat.name ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted'}`}
                        >
                            <div className={`p-3 rounded-full ${selectedCategory === cat.name ? 'bg-primary/10' : 'bg-muted'}`}>
                                <cat.icon className={`w-6 h-6 ${selectedCategory === cat.name ? 'text-primary' : 'text-muted-foreground'}`}/>
                            </div>
                            <p className="text-sm font-semibold text-center">{cat.name}</p>
                        </Card>
                    ))}
                 </div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
                 <div className="hidden lg:block lg:col-span-1 sticky top-24">
                    <FilterPanel />
                 </div>
                 <div className="lg:col-span-3 space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold">{isLoading ? 'Finding labs...' : `${filteredLabs.length} labs found`}</h2>
                         <div className="lg:hidden">
                            <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
                                <SheetTrigger asChild>
                                    <Button variant="outline"><SlidersHorizontal className="mr-2 h-4 w-4"/>Filter</Button>
                                </SheetTrigger>
                                <SheetContent>
                                    <SheetHeader><SheetTitle>Filters</SheetTitle></SheetHeader>
                                    <div className="p-4"><FilterPanel /></div>
                                </SheetContent>
                            </Sheet>
                        </div>
                    </div>
                     {isLoading ? (
                        Array.from({length: 3}).map((_, i) => (
                             <Card key={i} className="p-4 flex gap-4">
                                <Skeleton className="w-20 h-20 rounded-lg"/>
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-6 w-3/4"/>
                                    <Skeleton className="h-4 w-1/2"/>
                                    <div className="flex gap-2 pt-2">
                                        <Skeleton className="h-6 w-24 rounded-full"/>
                                        <Skeleton className="h-6 w-24 rounded-full"/>
                                    </div>
                                </div>
                                <div className="flex flex-col justify-between items-end">
                                     <Skeleton className="h-5 w-12"/>
                                     <Skeleton className="h-10 w-24"/>
                                </div>
                            </Card>
                        ))
                    ) : filteredLabs.length > 0 ? (
                        filteredLabs.map(lab => (
                            <Card key={lab.id} className="p-4 flex gap-4">
                                <Avatar className="w-20 h-20 rounded-lg">
                                    <AvatarImage src={lab.logo} alt={lab.name} />
                                    <AvatarFallback>{lab.name.substring(0,2)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <CardTitle className="text-lg">{lab.name}</CardTitle>
                                    <CardDescription className="flex items-center gap-1"><MapPin className="w-3 h-3"/>{lab.location}</CardDescription>
                                    <div className="mt-2 flex gap-2 flex-wrap">
                                        {lab.accredited && <Badge className="bg-green-100 text-green-800">NABL Accredited</Badge>}
                                        {lab.homeCollection && <Badge className="bg-blue-100 text-blue-800">Home Collection</Badge>}
                                    </div>
                                </div>
                                <div className="flex flex-col justify-between items-end">
                                    <p className="text-sm font-semibold">{lab.distance} km</p>
                                     <Button size="sm" onClick={() => toast({title: "Coming Soon!", description: "Test selection for labs is under development."})}>View</Button>
                                </div>
                            </Card>
                        ))
                    ) : (
                         <Card className="col-span-full text-center p-12 flex flex-col items-center">
                            <Search className="w-16 h-16 text-muted-foreground mb-4"/>
                            <p className="font-bold text-lg">No Labs Found</p>
                            <p className="text-muted-foreground">Try adjusting your filters or search terms.</p>
                        </Card>
                    )}
                 </div>
            </section>
        </main>
         <div className="fixed bottom-6 right-6 z-20 flex flex-col gap-3">
             <Button variant="ghost" size="icon" className="h-14 w-14 rounded-full shadow-2xl bg-background/80 backdrop-blur-md">
                <MessageSquare className="w-6 h-6"/>
                <span className="sr-only">Help</span>
            </Button>
        </div>
      </div>
    );
}
