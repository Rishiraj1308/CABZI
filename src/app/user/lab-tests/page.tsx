
'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ArrowLeft, FlaskConical, Search, FileText, CheckCircle, Home } from 'lucide-react'
import { motion } from 'framer-motion'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'


const healthPackages = [
    { title: 'Swasthfit Full Body Checkup', tests: 85, price: 1499, originalPrice: 2999 },
    { title: 'Advanced Diabetes Care', tests: 34, price: 999, originalPrice: 1999 },
    { title: 'Healthy Heart Package', tests: 62, price: 2499, originalPrice: 4999 },
    { title: 'Basic Fever Panel', tests: 90, price: 799, originalPrice: 1599 },
];

const recentReports = [
    {
        testName: "Complete Blood Count (CBC)",
        labName: "Dr. Lal PathLabs",
        date: "2024-08-15",
        status: "Available"
    },
    {
        testName: "Lipid Profile",
        labName: "SRL Diagnostics",
        date: "2024-08-12",
        status: "Available"
    },
    {
        testName: "Thyroid Function Test",
        labName: "Metropolis Healthcare",
        date: "2024-08-10",
        status: "Available"
    },
]


export default function LabTestsPage() {
    const router = useRouter();
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
                        <h1 className="text-4xl font-bold">Book Lab Tests</h1>
                        <p className="opacity-80 mt-1 max-w-md">Certified labs, at your convenience.</p>
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
                        <CardContent className="p-3">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input
                                    placeholder="Search for tests or labs (e.g., 'CBC', 'Dr. Lal')"
                                    className="pl-12 h-12 text-base rounded-lg"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <div className="space-y-4 pt-6">
                        <h3 className="font-bold text-lg">Popular Health Packages</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {healthPackages.map(pkg => (
                                <Card key={pkg.title} className="hover:shadow-md transition-shadow">
                                    <CardHeader>
                                        <CardTitle className="text-base">{pkg.title}</CardTitle>
                                        <CardDescription>{pkg.tests} tests included</CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex justify-between items-end">
                                        <div>
                                            <p className="text-xl font-bold">₹{pkg.price}</p>
                                            <p className="text-sm text-muted-foreground line-through">₹{pkg.originalPrice}</p>
                                        </div>
                                        <Button size="sm">View Details</Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                    
                    <div className="space-y-4 pt-6">
                        <h3 className="font-bold text-lg">Recent Reports</h3>
                         {recentReports.map((report, index) => (
                            <motion.div 
                                key={report.testName + index}
                                variants={itemVariants}
                                initial="hidden"
                                animate="visible"
                                transition={{delay: 0.5 + index * 0.1}}
                            >
                                <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-card cursor-pointer transition-colors">
                                    <div className="p-3 bg-card rounded-full border">
                                        <FileText className="w-5 h-5 text-muted-foreground" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold">{report.testName}</p>
                                        <p className="text-sm text-muted-foreground">{report.labName} &bull; {report.date}</p>
                                    </div>
                                    <div className="text-right">
                                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">
                                            {report.status}
                                        </Badge>
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
