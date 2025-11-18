
'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ArrowLeft, FlaskConical, Search, FileText, CheckCircle, Home, Calendar, Clock } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarPicker } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel'


const healthPackages = [
    { title: 'Swasthfit Full Body Checkup', tests: 85, price: 1499, originalPrice: 2999 },
    { title: 'Advanced Diabetes Care', tests: 34, price: 999, originalPrice: 1999 },
    { title: 'Healthy Heart Package', tests: 62, price: 2499, originalPrice: 4999 },
    { title: 'Basic Fever Panel', tests: 90, price: 799, originalPrice: 1599 },
];

const labPartners = [
    { name: "Dr. Lal PathLabs", logo: "/labs/lalpath.svg", accreditations: "NABL, CAP", homeCollection: true },
    { name: "SRL Diagnostics", logo: "/labs/srl.svg", accreditations: "NABL, CAP", homeCollection: true },
    { name: "Metropolis Healthcare", logo: "/labs/metropolis.svg", accreditations: "NABL", homeCollection: true },
    { name: "Thyrocare", logo: "/labs/thyrocare.svg", accreditations: "NABL, ISO 9001", homeCollection: false },
]

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
]

const timeSlots = [
    "07:00 AM - 08:00 AM",
    "08:00 AM - 09:00 AM",
    "09:00 AM - 10:00 AM",
    "10:00 AM - 11:00 AM",
    "11:00 AM - 12:00 PM",
]


export default function LabTestsPage() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    
    // Booking Dialog State
    const [isBookingOpen, setIsBookingOpen] = useState(false);
    const [selectedPackage, setSelectedPackage] = useState<(typeof healthPackages)[0] | null>(null);
    const [selectedLab, setSelectedLab] = useState('');
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [selectedTime, setSelectedTime] = useState('');


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
    
    const getInitials = (name: string) => {
        if (!name) return 'L';
        const names = name.split(' ');
        if (names.length > 1) {
            return names[0][0] + names[1][0];
        }
        return name.substring(0, 2).toUpperCase();
    }
    
    const handleBookNow = (pkg: (typeof healthPackages)[0]) => {
        setSelectedPackage(pkg);
        setIsBookingOpen(true);
    }
    
    const handleConfirmBooking = () => {
        if (!selectedPackage || !selectedLab || !selectedDate || !selectedTime) {
            toast.error('Incomplete Details', { description: 'Please select a lab, date, and time slot.' });
            return;
        }

        toast.success('Booking Confirmed!',{
            description: `Your ${selectedPackage.title} with ${selectedLab} is scheduled for ${format(selectedDate, "PPP")} at ${selectedTime}.`,
        });

        // Reset state and close dialog
        setIsBookingOpen(false);
        setSelectedPackage(null);
        setSelectedLab('');
        setSelectedDate(new Date());
        setSelectedTime('');
    }


    return (
        <motion.div 
            className="min-h-screen w-full flex flex-col bg-muted/30 overflow-hidden"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
        >
            <header className="bg-background p-4 relative border-b">
                <div className="container mx-auto">
                    <motion.div variants={itemVariants}>
                        <Button variant="ghost" size="icon" className="hover:bg-muted" onClick={() => router.push('/user')}>
                            <ArrowLeft className="w-5 h-5"/>
                        </Button>
                    </motion.div>
                    <motion.div variants={itemVariants} className="pt-8 pb-12 text-left">
                        <h1 className="text-4xl font-bold">Book Lab Tests</h1>
                        <p className="text-muted-foreground mt-1 max-w-md">Certified labs, sample collection from your home.</p>
                    </motion.div>
                </div>
            </header>

            <div className="flex-1 container mx-auto p-4 space-y-6 relative z-10 -mt-16">
                 <motion.div 
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3, type: 'spring' }}
                    className="space-y-8"
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

                    <div className="space-y-4">
                        <h3 className="font-bold text-lg">Popular Health Packages</h3>
                        <Carousel opts={{ align: "start" }} className="w-full">
                            <CarouselContent className="-ml-4">
                                {healthPackages.map(pkg => (
                                    <CarouselItem key={pkg.title} className="pl-4 md:basis-1/2">
                                        <Card className="hover:shadow-md transition-shadow h-full flex flex-col">
                                            <CardHeader>
                                                <CardTitle className="text-base">{pkg.title}</CardTitle>
                                                <CardDescription>{pkg.tests} tests included</CardDescription>
                                            </CardHeader>
                                            <CardFooter className="flex justify-between items-center mt-auto">
                                                <div>
                                                    <p className="text-xl font-bold">₹{pkg.price}</p>
                                                    <p className="text-sm text-muted-foreground line-through">₹{pkg.originalPrice}</p>
                                                </div>
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button size="sm" onClick={() => handleBookNow(pkg)}>Book Now</Button>
                                                    </DialogTrigger>
                                                </Dialog>
                                            </CardFooter>
                                        </Card>
                                    </CarouselItem>
                                ))}
                            </CarouselContent>
                            <CarouselPrevious className="hidden md:flex" />
                            <CarouselNext className="hidden md:flex" />
                        </Carousel>
                    </div>
                    
                     <div className="space-y-4">
                        <h3 className="font-bold text-lg">Our Lab Partners</h3>
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                             {labPartners.map(lab => (
                                <Card key={lab.name} className="p-4 flex flex-col items-center justify-between text-center hover:shadow-md transition-shadow">
                                   <Avatar className="w-16 h-16 mb-4 text-xl font-bold">
                                       <AvatarFallback className="bg-muted">{getInitials(lab.name)}</AvatarFallback>
                                   </Avatar>
                                    <p className="font-semibold text-sm">{lab.name}</p>
                                    <p className="text-xs text-muted-foreground">{lab.accreditations}</p>
                                    {lab.homeCollection && <Badge className="mt-2 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"><Home className="w-3 h-3 mr-1"/> Home Collection</Badge>}
                                </Card>
                            ))}
                         </div>
                    </div>

                    <div className="space-y-4">
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
                                        <Button variant="outline" size="sm">View Report</Button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                </motion.div>
            </div>
             <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Schedule Home Collection</DialogTitle>
                        <DialogDescription>For package: <span className="font-semibold text-primary">{selectedPackage?.title}</span></DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                        <div className="space-y-2">
                           <Label className="font-semibold">1. Select Lab Partner</Label>
                           <Select value={selectedLab} onValueChange={setSelectedLab}>
                                <SelectTrigger><SelectValue placeholder="Choose a certified lab" /></SelectTrigger>
                                <SelectContent>
                                    {labPartners.filter(l => l.homeCollection).map(lab => (
                                        <SelectItem key={lab.name} value={lab.name}>{lab.name}</SelectItem>
                                    ))}
                                </SelectContent>
                           </Select>
                        </div>
                         <div className="space-y-2">
                            <Label className="font-semibold">2. Select Collection Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
                                        <Calendar className="mr-2 h-4 w-4" />
                                        {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0"><CalendarPicker mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus disabled={(d) => d < new Date(new Date().setDate(new Date().getDate()))}/></PopoverContent>
                            </Popover>
                         </div>
                          <div className="space-y-2">
                            <Label className="font-semibold">3. Select Time Slot</Label>
                            <div className="grid grid-cols-3 gap-2">
                               {timeSlots.map(slot => (
                                   <Button key={slot} variant={selectedTime === slot ? 'default' : 'outline'} onClick={() => setSelectedTime(slot)} className="text-xs h-9">{slot}</Button>
                               ))}
                            </div>
                         </div>
                    </div>
                    <DialogFooter>
                        <Button className="w-full" onClick={handleConfirmBooking} disabled={!selectedLab || !selectedDate || !selectedTime}>Confirm Booking for ₹{selectedPackage?.price}</Button>
                    </DialogFooter>
                </DialogContent>
             </Dialog>
        </motion.div>
    );
}
