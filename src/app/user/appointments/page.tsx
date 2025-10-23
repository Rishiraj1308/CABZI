
'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar as CalendarIcon, Stethoscope, Clock, Search, ArrowLeft, IndianRupee, BadgeCheck, Briefcase, Star } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from '@/hooks/use-toast'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

const mockDoctors = [
    { id: 'd1', name: 'Dr. Ramesh Sharma', specialization: 'Cardiology', qualifications: 'MD, FACC', experience: '15+ Years', photoUrl: 'https://i.pravatar.cc/100?u=doc1', consultationFee: 1200, rating: 4.9, reviews: 215, nextAvailable: 'Today, 5:00 PM' },
    { id: 'd2', name: 'Dr. Priya Gupta', specialization: 'Orthopedics', qualifications: 'MS (Ortho)', experience: '10+ Years', photoUrl: 'https://i.pravatar.cc/100?u=doc2', consultationFee: 1000, rating: 4.8, reviews: 189, nextAvailable: 'Tomorrow, 10:00 AM' },
    { id: 'd3', name: 'Dr. Alok Verma', specialization: 'General Physician', qualifications: 'MBBS, MD', experience: '8+ Years', photoUrl: 'https://i.pravatar.cc/100?u=doc3', consultationFee: 800, rating: 4.7, reviews: 302, nextAvailable: 'Today, 4:30 PM' },
];

const timeSlots = [
  '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'
]

type Doctor = typeof mockDoctors[0];

export default function BookAppointmentPage() {
  const [step, setStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [time, setTime] = useState('');

  const resetFlow = () => {
    setStep(1);
    setSelectedDoctor(null);
    setDate(new Date());
    setTime('');
  };
  
  const handleBookingConfirmation = () => {
      toast({
          title: "Appointment Requested!",
          description: `Your request for Dr. ${selectedDoctor?.name} has been sent. You will be notified upon confirmation.`,
          className: 'bg-green-600 border-green-600 text-white'
      });
      resetFlow();
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="animate-fade-in md:text-center">
        <h2 className="text-3xl font-bold tracking-tight flex items-center md:justify-center gap-2">
            <CalendarIcon className="w-8 h-8 text-primary" />
            Book a Doctor's Appointment
        </h2>
        <p className="text-muted-foreground">Find and book appointments with top doctors seamlessly.</p>
      </div>

      <Card className="max-w-2xl mx-auto">
        {step === 1 && (
             <>
                <CardHeader>
                    <CardTitle>Step 1: Find Your Doctor</CardTitle>
                    <CardDescription>Search by doctor&apos;s name or specialization.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="doctor-search" placeholder="e.g., Cardiology or Dr. Sharma" className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    </div>
                    <div className="space-y-3">
                       {mockDoctors.filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()) || d.specialization.toLowerCase().includes(searchQuery.toLowerCase())).map(doctor => (
                           <div key={doctor.id} className="border rounded-lg p-3 flex flex-col sm:flex-row items-start sm:items-center gap-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => { setSelectedDoctor(doctor); setStep(2); }}>
                                <Avatar className="w-16 h-16 border">
                                    <AvatarImage src={doctor.photoUrl} alt={doctor.name} data-ai-hint="doctor portrait" />
                                    <AvatarFallback>{doctor.name.substring(0,2)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <h3 className="font-bold text-lg">Dr. {doctor.name}</h3>
                                    <Badge variant="secondary">{doctor.specialization}</Badge>
                                    <div className="text-xs text-muted-foreground mt-2 space-y-1">
                                        <p className="flex items-center gap-1.5"><BadgeCheck className="w-3.5 h-3.5"/> {doctor.qualifications}</p>
                                        <p className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5"/> {doctor.experience} experience</p>
                                        <p className="flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500"/> {doctor.rating} ({doctor.reviews} reviews)</p>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="font-bold text-xl text-primary flex items-center justify-end"><IndianRupee className="w-5 h-5" />{doctor.consultationFee}</p>
                                    <p className="text-xs text-muted-foreground mb-2">Consultation Fee</p>
                                    <Badge variant="outline" className="bg-green-100/50 border-green-500/50 text-green-700 dark:text-green-300">
                                        <Clock className="w-3 h-3 mr-1.5"/> Next Available: {doctor.nextAvailable}
                                    </Badge>
                                </div>
                           </div>
                       ))}
                    </div>
                </CardContent>
            </>
        )}
        
         {step === 2 && selectedDoctor && (
             <>
                <CardHeader>
                     <Button variant="ghost" size="sm" className="w-fit p-0 h-auto mb-2" onClick={() => resetFlow()}><ArrowLeft className="w-4 h-4 mr-2"/> Back to Doctor Search</Button>
                    <CardTitle>Step 2: Select Date & Time</CardTitle>
                    <CardDescription>Choose a slot for your appointment with <span className="font-bold text-primary">Dr. {selectedDoctor.name}</span>.</CardDescription>
                </CardHeader>
                 <CardContent className="space-y-6">
                    <div className="p-3 rounded-lg border bg-muted/50 flex justify-between items-center">
                        <span className="font-semibold">Consultation Fee</span>
                        <span className="font-bold text-lg text-primary">₹{selectedDoctor.consultationFee}</span>
                    </div>
                    <div className="space-y-2">
                        <Label>Select Appointment Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !date && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {date ? format(date, "PPP") : <span>Pick a date</span>}
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={setDate}
                                initialFocus
                                disabled={(d) => d < new Date(new Date().setDate(new Date().getDate() - 1))}
                            />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-2">
                        <Label>Select Available Time Slot</Label>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {timeSlots.map(slot => (
                                <Button 
                                    key={slot} 
                                    variant={time === slot ? 'default' : 'outline'}
                                    onClick={() => setTime(slot)}
                                >
                                    {slot}
                                </Button>
                            ))}
                        </div>
                    </div>
                 </CardContent>
                 <CardFooter>
                     <Button className="w-full" onClick={() => setStep(3)} disabled={!date || !time}>Proceed to Confirmation</Button>
                 </CardFooter>
            </>
        )}

        {step === 3 && selectedDoctor && date && time && (
            <>
                <CardHeader>
                     <Button variant="ghost" size="sm" className="w-fit p-0 h-auto mb-2" onClick={() => setStep(2)}><ArrowLeft className="w-4 h-4 mr-2"/> Back to Scheduling</Button>
                    <CardTitle>Step 3: Confirm Your Booking</CardTitle>
                    <CardDescription>Please review your appointment details before confirming.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Card className="p-4 bg-muted/50">
                        <div className="flex items-center gap-4">
                             <Avatar className="w-16 h-16 border">
                                <AvatarImage src={selectedDoctor.photoUrl} alt={selectedDoctor.name} />
                                <AvatarFallback>{selectedDoctor.name.substring(0,2)}</AvatarFallback>
                            </Avatar>
                             <div>
                                <h3 className="font-bold text-lg">Dr. {selectedDoctor.name}</h3>
                                <p className="text-sm text-muted-foreground">{selectedDoctor.specialization}</p>
                            </div>
                        </div>
                        <div className="mt-4 border-t pt-4 space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Date:</span>
                                <span className="font-semibold">{format(date, "PPP")}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Time:</span>
                                <span className="font-semibold">{time}</span>
                            </div>
                            <div className="flex justify-between text-lg font-bold">
                                <span className="text-muted-foreground">Total Fee:</span>
                                <span className="text-primary">₹{selectedDoctor.consultationFee}</span>
                            </div>
                        </div>
                    </Card>
                </CardContent>
                <CardFooter>
                    <Button className="w-full" onClick={handleBookingConfirmation}>Confirm & Request Appointment</Button>
                </CardFooter>
            </>
        )}
      </Card>
    </div>
  )
}
