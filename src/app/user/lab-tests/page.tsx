
'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ArrowLeft, FlaskConical, Search, CheckCircle, SlidersHorizontal, Droplets, Activity, HeartPulse, User, Home } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

const testCategories = [
    { name: 'Full Body Checkup', icon: User },
    { name: 'Diabetes', icon: Droplets },
    { name: 'Heart Health', icon: HeartPulse },
    { name: 'Fever Panel', icon: Activity },
];

const mockLabs = [
    { name: 'Dr. Lal PathLabs', logo: '/labs/lal-pathlabs.png', accreditations: ['NABL', 'CAP'], homeCollection: true, dataAiHint: 'lab building' },
    { name: 'SRL Diagnostics', logo: '/labs/srl-diagnostics.png', accreditations: ['NABL', 'ISO'], homeCollection: true, dataAiHint: 'lab building' },
    { name: 'Metropolis Healthcare', logo: '/labs/metropolis.png', accreditations: ['NABL'], homeCollection: false, dataAiHint: 'lab building' },
    { name: 'Thyrocare', logo: '/labs/thyrocare.png', accreditations: ['NABL'], homeCollection: true, dataAiHint: 'lab building' },
];

const healthPackages = [
    { title: 'Swasthfit Full Body Checkup', tests: 85, price: 1499, originalPrice: 2999 },
    { title: 'Advanced Diabetes Care', tests: 34, price: 999, originalPrice: 1999 },
    { title: 'Healthy Heart Package', tests: 62, price: 2499, originalPrice: 4999 },
    { title: 'Basic Fever Panel', tests: 90, price: 799, originalPrice: 1599 },
];

export default function LabTestsPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [homeCollectionOnly, setHomeCollectionOnly] = useState(false);
    const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.05 }
        }
    };
    
    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };
    
    const filteredLabs = mockLabs.filter(lab => 
        lab.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        (!homeCollectionOnly || lab.homeCollection)
    );
    
    const FilterPanel = () => (
        <Card className="sticky top-20">
            <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                    <Label htmlFor="home-collection" className="font-semibold">Home Sample Collection</Label>
                    <Switch id="home-collection" checked={homeCollectionOnly} onCheckedChange={setHomeCollectionOnly}/>
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className="p-4 md:p-6 space-y-8">
            <div className="animate-fade-in">
                <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <FlaskConical className="w-8 h-8 text-primary" />
                    Lab Tests at Home
                </h2>
                <p className="text-muted-foreground">Book diagnostic tests from NABL-certified labs, with the convenience of home sample collection.</p>
            </div>

            <div className="max-w-xl mx-auto w-full">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        id="lab-search"
                        placeholder="Search for a test or lab..."
                        className="pl-12 h-12 text-base rounded-full shadow-lg"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="font-bold text-lg">Browse by Category</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                   {testCategories.map((category) => (
                        <Card key={category.name} className="p-4 flex flex-col items-center justify-center gap-2 text-center cursor-pointer hover:bg-muted">
                            <div className="p-3 bg-primary/10 rounded-full">
                                <category.icon className="w-6 h-6 text-primary" />
                            </div>
                            <p className="font-semibold text-sm">{category.name}</p>
                        </Card>
                   ))}
                </div>
            </div>

            <div className="space-y-4 pt-6">
                <h3 className="font-bold text-lg">Popular Health Packages</h3>
                <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
                >
                    {healthPackages.map(pkg => (
                        <motion.div key={pkg.title} variants={itemVariants}>
                            <Card className="h-full flex flex-col">
                                <CardHeader>
                                    <CardTitle className="text-lg">{pkg.title}</CardTitle>
                                    <CardDescription>{pkg.tests} tests included</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-1">
                                    <p className="text-2xl font-bold">₹{pkg.price}</p>
                                    <p className="text-sm text-muted-foreground line-through">₹{pkg.originalPrice}</p>
                                </CardContent>
                                <CardFooter>
                                    <Button className="w-full">View Details</Button>
                                </CardFooter>
                            </Card>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
            
            <div className="space-y-4 pt-6">
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold">Our Lab Partners</h3>
                    <div className="lg:hidden">
                        <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
                            <SheetTrigger asChild><Button variant="outline"><SlidersHorizontal className="mr-2 h-4 w-4"/>Filter</Button></SheetTrigger>
                            <SheetContent><SheetHeader><SheetTitle>Filters</SheetTitle></SheetHeader><div className="p-4"><FilterPanel/></div></SheetContent>
                        </Sheet>
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                    <div className="hidden lg:block lg:col-span-1"><FilterPanel/></div>
                    <div className="lg:col-span-3 space-y-4">
                        {filteredLabs.length > 0 ? filteredLabs.map(lab => (
                            <Card key={lab.name} className="p-4 flex items-center gap-4">
                                <Image src={lab.logo} alt={lab.name} width={80} height={80} className="rounded-md object-contain" data-ai-hint={lab.dataAiHint}/>
                                <div className="flex-1">
                                    <h4 className="font-bold text-lg">{lab.name}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        {lab.accreditations.map(acc => <Badge key={acc} variant="secondary">{acc}</Badge>)}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                     {lab.homeCollection && (
                                        <Badge className="bg-green-100 text-green-800"><Home className="w-3.5 h-3.5 mr-1.5"/> Home Collection Available</Badge>
                                    )}
                                    <Button>View Tests</Button>
                                </div>
                            </Card>
                        )) : (
                            <Card className="lg:col-span-3 text-center p-12 flex flex-col items-center">
                                <Search className="w-16 h-16 text-muted-foreground mb-4"/>
                                <p className="font-bold text-lg">No Labs Found</p>
                                <p className="text-muted-foreground">Try adjusting your filters to find a lab.</p>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
