
'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ArrowLeft, FlaskConical, Droplets, Activity, HeartPulse, User } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useToast } from '@/hooks/use-toast'

const popularPackages = [
    { icon: User, title: 'Full Body Checkup', description: '85 parameters' },
    { icon: HeartPulse, title: 'Heart Risk Assessment', description: '62 parameters' },
    { icon: Droplets, title: 'Diabetes Care', description: '34 parameters' },
    { icon: Activity, title: 'Fever Panel', description: '90 parameters' },
];

const recentReports = [
    { test: 'Complete Blood Count (CBC)', date: '2024-08-15', lab: 'Dr. Lal PathLabs' },
    { test: 'Vitamin D, 25-Hydroxy', date: '2024-07-22', lab: 'SRL Diagnostics' },
]

export default function LabTestsPage() {
    const router = useRouter()
    const { toast } = useToast()
    const [searchQuery, setSearchQuery] = useState('')

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
            <header className="bg-gradient-to-br from-purple-600 via-primary to-primary/70 text-primary-foreground p-4 relative">
                <div className="container mx-auto">
                    <motion.div variants={itemVariants}>
                        <Button variant="ghost" size="icon" className="hover:bg-white/10" onClick={() => router.push('/user')}>
                            <ArrowLeft className="w-5 h-5"/>
                        </Button>
                    </motion.div>
                    <motion.div variants={itemVariants} className="pt-8 pb-20 text-left">
                        <h1 className="text-4xl font-bold">Diagnostics at Your Doorstep.</h1>
                        <p className="opacity-80 mt-1 max-w-md">Certified labs, seamless service.</p>
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
                    <Card className="shadow-lg">
                        <CardContent className="p-3 relative">
                            <div className="flex items-center gap-4 py-2 px-2 rounded-lg">
                                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-blue-500/30"/>
                                <Input
                                    placeholder="Search for a test or lab"
                                    className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-base font-semibold p-0 h-auto"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <div className="space-y-4 pt-4">
                        <h3 className="font-bold text-lg">Popular Health Packages</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                           {popularPackages.map((pkg, index) => (
                                <motion.div 
                                    key={pkg.title}
                                    variants={itemVariants}
                                    initial="hidden"
                                    animate="visible"
                                    transition={{delay: 0.5 + index * 0.1}}
                                >
                                    <Card className="p-4 flex flex-col items-center justify-center gap-2 text-center cursor-pointer hover:bg-muted h-full">
                                        <div className="p-3 bg-primary/10 rounded-full">
                                            <pkg.icon className="w-6 h-6 text-primary" />
                                        </div>
                                        <p className="font-semibold text-sm">{pkg.title}</p>
                                        <p className="text-xs text-muted-foreground">{pkg.description}</p>
                                    </Card>
                                </motion.div>
                           ))}
                        </div>
                    </div>
                    
                    <div className="space-y-2 pt-6">
                        <h3 className="font-bold text-lg">Recent Reports</h3>
                        {recentReports.map((report, index) => (
                            <motion.div 
                                key={report.test}
                                variants={itemVariants}
                                initial="hidden"
                                animate="visible"
                                transition={{delay: 0.7 + index * 0.1}}
                            >
                                <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-card cursor-pointer transition-colors">
                                    <div className="p-3 bg-card rounded-full border">
                                        <FlaskConical className="w-5 h-5 text-muted-foreground" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold">{report.test}</p>
                                        <p className="text-sm text-muted-foreground">{report.lab}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-semibold">{report.date}</p>
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
