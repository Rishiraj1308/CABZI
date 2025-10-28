
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
import { motion } from 'framer-motion'
import Image from 'next/image'

const popularPackages = [
    { name: 'Complete Health Check', tests: '85 tests', price: '₹1499' },
    { name: 'Advanced Heart Care', tests: '62 tests', price: '₹2199' },
    { name: 'Diabetes & Lipid Profile', tests: '34 tests', price: '₹999' },
    { name: 'Fever Panel (Advanced)', tests: '90 tests', price: '₹1799' },
];


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
        visible: { opacity: 1, y: 0 }
    };

    return (
        <motion.div 
            className="min-h-screen w-full flex flex-col bg-muted/30 overflow-hidden"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
        >
            <header className="bg-gradient-to-br from-purple-600 via-primary to-primary/70 p-4 relative text-primary-foreground">
                <div className="container mx-auto">
                    <motion.div variants={itemVariants}>
                        <Button variant="ghost" size="icon" className="hover:bg-white/10" onClick={() => router.push('/user')}>
                            <ArrowLeft className="w-5 h-5"/>
                        </Button>
                    </motion.div>
                    <motion.div variants={itemVariants} className="pt-8 pb-20 text-left">
                        <h1 className="text-4xl font-bold">Health at Your Fingertips.</h1>
                        <p className="opacity-80 mt-1 max-w-md">Book lab tests from certified labs, with home sample collection.</p>
                    </motion.div>
                </div>
            </header>

           <div className="flex-1 container mx-auto p-4 space-y-6 relative z-10 -mt-16">
                 <motion.div 
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3, type: 'spring' }}
                    className="space-y-6"
                >
                    <Card className="shadow-lg overflow-hidden">
                        <CardContent className="p-3 relative">
                            <div className="flex items-center gap-4 py-2 px-2 rounded-lg">
                                <div className="p-2 bg-purple-100 rounded-full">
                                    <FlaskConical className="w-5 h-5 text-purple-600"/>
                                </div>
                                <Input
                                    placeholder="Search for tests or health packages..."
                                    className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-base font-semibold p-0 h-auto"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && toast({title: "Search coming soon!"})}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <div className="space-y-2 pt-6">
                        <h3 className="font-bold text-lg">Popular Health Packages</h3>
                        {popularPackages.map((pkg, index) => (
                            <motion.div 
                                key={pkg.name}
                                variants={itemVariants}
                                initial="hidden"
                                animate="visible"
                                transition={{delay: 0.5 + index * 0.1}}
                            >
                                <Card className="p-3 rounded-lg hover:bg-card cursor-pointer transition-colors">
                                  <div className="flex items-center gap-4">
                                    <div className="p-3 bg-card rounded-full border">
                                        <Droplets className="w-5 h-5 text-muted-foreground" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold">{pkg.name}</p>
                                        <p className="text-sm text-muted-foreground">{pkg.tests} included</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold">{pkg.price}</p>
                                    </div>
                                  </div>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
}

