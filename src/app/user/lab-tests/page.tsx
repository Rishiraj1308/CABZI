
'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Search, SlidersHorizontal, ArrowLeft, FlaskConical, MapPin, Activity, HeartPulse, Droplets, Thermometer, User, MessageSquare, Shield, Bone, GitCommitVertical } from 'lucide-react'
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
import { motion } from 'framer-motion'
import Image from 'next/image'
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel'
import { cn } from '@/lib/utils'

const popularPackages = [
    { name: 'Complete Health Check', tests: '85 tests', price: '₹1499', oldPrice: '₹2999' },
    { name: 'Advanced Heart Care', tests: '62 tests', price: '₹2199', oldPrice: '₹4500' },
    { name: 'Diabetes & Lipid Profile', tests: '34 tests', price: '₹999', oldPrice: '₹1800' },
    { name: 'Fever Panel (Advanced)', tests: '90 tests', price: '₹1799', oldPrice: '₹3200' },
];

const testCategories = [
    { name: 'Full Body', icon: User },
    { name: 'Diabetes', icon: Droplets },
    { name: 'Heart', icon: HeartPulse },
    { name: 'Vitamins', icon: Shield },
    { name: 'Fever', icon: Thermometer },
    { name: 'Bones', icon: Bone },
    { name: 'Thyroid', icon: GitCommitVertical },
]

const featuredLabs = [
    { name: 'Dr. Lal PathLabs', logo: '/labs/lalpath.png', accreditation: 'NABL, CAP' },
    { name: 'SRL Diagnostics', logo: '/labs/srl.png', accreditation: 'NABL, CAP' },
    { name: 'Metropolis Healthcare', logo: '/labs/metropolis.png', accreditation: 'NABL, CAP' },
]


export default function LabTestsPage() {
    const router = useRouter()
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };
    
    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: {type: 'spring', stiffness: 100} }
    };

    return (
        <motion.div 
            className="p-4 md:p-6 space-y-8"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
        >
            <motion.div variants={itemVariants} className="text-center">
                <h2 className="text-3xl font-bold tracking-tight flex items-center justify-center gap-2">
                    <FlaskConical className="w-8 h-8 text-primary" /> 
                    Diagnostics & Lab Tests
                </h2>
                <p className="text-muted-foreground mt-1">Book tests from certified labs with home sample collection.</p>
            </motion.div>
            
            <motion.div variants={itemVariants} className="max-w-2xl mx-auto w-full">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        id="test-search"
                        placeholder="Search for tests (e.g., Vitamin D, Complete Blood Count)"
                        className="pl-12 h-12 text-base rounded-full shadow-lg"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && toast({title: "Search coming soon!"})}
                    />
                </div>
            </motion.div>

             <motion.div variants={itemVariants} className="space-y-4">
                <h3 className="font-bold text-lg">Search by Category</h3>
                <Carousel opts={{ align: "start", loop: false, skipSnaps: true }} className="w-full">
                    <CarouselContent className="-ml-2">
                        {testCategories.map((cat, i) => (
                            <CarouselItem key={i} className="pl-2 basis-1/3 md:basis-1/4 lg:basis-1/6">
                                <Card className="p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:ring-2 hover:ring-primary transition-all text-center h-full">
                                    <div className="p-3 bg-muted rounded-full"><cat.icon className="w-6 h-6 text-primary" /></div>
                                    <p className="text-xs font-semibold">{cat.name}</p>
                                </Card>
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                </Carousel>
            </motion.div>


            <motion.div variants={itemVariants} className="space-y-4">
                <h3 className="font-bold text-lg">Popular Health Packages</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {popularPackages.map((pkg, index) => (
                        <Card key={pkg.name} className="flex flex-col">
                            <CardHeader>
                                <CardTitle className="text-lg">{pkg.name}</CardTitle>
                                <CardDescription>{pkg.tests} included</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <p className="text-2xl font-bold">{pkg.price}</p>
                                <p className="text-sm text-muted-foreground line-through">{pkg.oldPrice}</p>
                            </CardContent>
                             <CardFooter>
                                <Button className="w-full" variant="outline">View Details</Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </motion.div>

            <motion.div variants={itemVariants} className="space-y-4">
                 <h3 className="font-bold text-lg">Featured Labs</h3>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     {featuredLabs.map((lab, index) => (
                         <Card key={lab.name} className="p-4 flex items-center gap-4">
                             <div className="w-16 h-16 rounded-lg bg-white flex items-center justify-center border">
                                <Image src={lab.logo} alt={`${lab.name} Logo`} width={50} height={50} objectFit="contain" data-ai-hint="lab logo" />
                             </div>
                             <div className="flex-1">
                                <p className="font-bold">{lab.name}</p>
                                <Badge variant="secondary" className="mt-1">{lab.accreditation}</Badge>
                             </div>
                         </Card>
                     ))}
                 </div>
            </motion.div>
        </motion.div>
    );
}

