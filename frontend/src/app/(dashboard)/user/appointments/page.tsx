
'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Calendar as CalendarIcon, Stethoscope, Clock, Search, ArrowRight,
    IndianRupee, MapPin, Building, Bone, Baby, Eye, Smile, AlertTriangle, PersonStanding, HeartHandshake, Sparkles, Layers, BrainCircuit, HeartPulse, UserCheck, Droplets, Thermometer, Mic, Video
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { useFirebase } from '@/lib/firebase/client-provider';
import { collection, collectionGroup, getDocs, query, where, addDoc, serverTimestamp, getDoc, doc, GeoPoint, setDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import type { ClientSession } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { motion } from 'framer-motion';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Badge } from '@/components/ui/badge';
import { SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';


interface Doctor {
    id: string;
    name: string;
    specialization: string;
    qualifications: string;
    experience: string;
    photoUrl?: string;
    consultationFee: number;
    docStatus?: 'Verified' | 'Pending' | 'Awaiting Final Approval' | 'Rejected';
    hospitalId: string;
    hospitalName: string;
    hospitalLocation?: GeoPoint; 
    distance?: number | null;
    gender: 'male' | 'female' | 'other';
    availability?: { availableToday?: boolean; availableTomorrow?: boolean; };
}

const symptomCategories = [
    { name: 'Fever/Cold', icon: Thermometer, specializations: ['General Physician', 'Pediatrics'] },
    { name: 'Stomach Ache', icon: AlertTriangle, specializations: ['Gastroenterology', 'General Physician'] },
    { name: 'Bone/Joint Pain', icon: Bone, specializations: ['Orthopedics'] },
    { name: 'Headache', icon: BrainCircuit, specializations: ['General Physician', 'Neurology'] },
    { name: 'Skin Issues', icon: Layers, specializations: ['Dermatology'] },
    { name: 'Heart/Chest', icon: HeartPulse, specializations: ['Cardiology', 'General Physician'] },
    { name: 'Child Health', icon: Baby, specializations: ['Pediatrics'] },
    { name: 'ENT', icon: Mic, specializations: ['ENT Specialist'] },
    { name: 'Eye Problems', icon: Eye, specializations: ['Ophthalmology'] },
    { name: 'Dental Issues', icon: Smile, specializations: ['Dentist'] },
    { name: 'Mental Wellness', icon: HeartHandshake, specializations: ['Psychiatry', 'Psychology'] },
    { name: "Women's Health", icon: PersonStanding, specializations: ['Gynecology'] },
    { name: 'General Checkup', icon: UserCheck, specializations: ['General Physician'] },
    { name: 'Diabetes Care', icon: Droplets, specializations: ['Endocrinology', 'General Physician'] },
];

const timeSlots = [
  '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'
]


export default function BookAppointmentPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSymptom, setSelectedSymptom] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState('distance');
  const [availabilityFilter, setAvailabilityFilter] = useState('any');
  const [priceRange, setPriceRange] = useState([2000]);
  const [genderFilter, setGenderFilter] = useState('any');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  // Booking state
  const [isBooking, setIsBooking] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [time, setTime] = useState('');
  const [consultationType, setConsultationType] = useState<'in-clinic' | 'video' | ''>('');
  const [session, setSession] = useState<ClientSession | null>(null);

  const { db, user } = useFirebase();
  const [userLocation, setUserLocation] = useState<{ lat: number, lon: number } | null>(null);

   useEffect(() => {
    if (user && db) {
      getDoc(doc(db, 'users', user.uid)).then(docSnap => {
        if (docSnap.exists()) {
          const userData = docSnap.data();
          setSession({ userId: user.uid, name: userData.name, phone: userData.phone, gender: userData.gender, role: 'user' });
        }
      });
    }
  }, [user, db]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => setUserLocation({ lat: position.coords.latitude, lon: position.coords.longitude }),
        () => console.warn("Could not get user location. Distances will not be calculated.")
      );
    }
  }, []);
  
  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    if ((lat1 === lat2) && (lon1 === lon2)) return 0;
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
  };

  const fetchVerifiedDoctors = useCallback(async () => {
    if (!db) { setIsLoading(false); return; }
    setIsLoading(true);
    try {
        const doctorsQuery = query(collectionGroup(db, 'doctors'), where('docStatus', '==', 'Verified'));
        const snapshot = await getDocs(doctorsQuery);
        const doctorsList: Doctor[] = [];
        
        const hospitalIds = snapshot.docs.map(doc => doc.ref.parent.parent?.id).filter(Boolean) as string[];
        const uniqueHospitalIds = [...new Set(hospitalIds)];
        let hospitalData: Record<string, {name: string, location?: GeoPoint}> = {};

        if (uniqueHospitalIds.length > 0) {
             const hospitalsQuery = query(collection(db, 'curePartners'), where('__name__', 'in', uniqueHospitalIds));
             const hospitalsSnap = await getDocs(hospitalsQuery);
             hospitalsSnap.forEach(doc => {
                hospitalData[doc.id] = { name: doc.data().name, location: doc.data().location };
             });
        }

        snapshot.forEach(doc => {
            const hospitalId = doc.ref.parent.parent?.id;
            if(hospitalId && hospitalData[hospitalId]) {
                const docData = doc.data();
                let distance = null;
                const hospitalLoc = hospitalData[hospitalId]?.location;
                if (userLocation && hospitalLoc) {
                    distance = getDistance(userLocation.lat, userLocation.lon, hospitalLoc.latitude, hospitalLoc.longitude);
                }
                doctorsList.push({ id: doc.id, ...docData, hospitalId, hospitalName: hospitalData[hospitalId].name, hospitalLocation: hospitalData[hospitalId].location, distance } as Doctor);
            }
        });
        
        setDoctors(doctorsList);
    } catch (error) {
        console.error("Error fetching verified doctors:", error);
        toast.error('Failed to load doctors');
    } finally {
        setIsLoading(false);
    }
  }, [db, userLocation]);
  
  useEffect(() => {
    fetchVerifiedDoctors();
  }, [fetchVerifiedDoctors]);

  const filteredAndSortedDoctors = useMemo(() => {
    return doctors
      .filter(d => {
        const lowercasedQuery = searchQuery.toLowerCase();
        
        const specializationMatch = selectedSymptom
            ? symptomCategories.find(s => s.name === selectedSymptom)?.specializations.includes(d.specialization) ?? true
            : true;

        const searchMatch = searchQuery ? 
            d.name.toLowerCase().includes(lowercasedQuery) || 
            d.specialization.toLowerCase().includes(lowercasedQuery) ||
            d.hospitalName.toLowerCase().includes(lowercasedQuery)
            : true;
        const priceMatch = d.consultationFee <= priceRange[0];
        const genderMatch = genderFilter === 'any' || d.gender === genderFilter;
        const availabilityMatch = availabilityFilter === 'any' || (availabilityFilter === 'today' && (d.availability?.availableToday ?? Math.random() > 0.3)) || (availabilityFilter === 'tomorrow' && (d.availability?.availableTomorrow ?? Math.random() > 0.5));
        
        return specializationMatch && searchMatch && priceMatch && genderMatch && availabilityMatch;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'price': return a.consultationFee - b.consultationFee;
          case 'experience': return parseInt(b.experience) - parseInt(a.experience);
          case 'distance': default:
            if (a.distance != null && b.distance != null) return a.distance - b.distance;
            if (a.distance != null) return -1;
            if (b.distance != null) return 1;
            return 0;
        }
      });
  }, [doctors, searchQuery, selectedSymptom, sortBy, priceRange, genderFilter, availabilityFilter]);

  const handleBookingConfirmation = async () => {
    if (!selectedDoctor || !session || !db || !date || !time || !consultationType) { toast.error('Error', { description: 'Missing required information to book.' }); return; }
    setIsBooking(true);
    try {
      const userDoc = await getDoc(doc(db, "users", session.userId));
      if (!userDoc.exists()) throw new Error("User profile not found. Cannot book appointment.");
      const userData = userDoc.data();
      const appointmentDateTime = new Date(date);
      const [hours, minutes] = time.split(/[: ]/);
      const parsedHours = parseInt(hours, 10);
      const parsedMinutes = parseInt(minutes, 10);
      let finalHours = parsedHours;
      if (time.includes('PM') && parsedHours !== 12) finalHours += 12;
      if (time.includes('AM') && parsedHours === 12) finalHours = 0;
      appointmentDateTime.setHours(finalHours, parsedMinutes, 0, 0);

      const systematicId = `APT-${Date.now()}`;
      const appointmentRef = doc(db, 'appointments', systematicId);

      await setDoc(appointmentRef, {
          patientId: session.userId, patientName: userData.name, patientPhone: userData.phone,
          hospitalId: selectedDoctor.hospitalId, hospitalName: selectedDoctor.hospitalName,
          doctorId: selectedDoctor.id, doctorName: `Dr. ${selectedDoctor.name}`,
          department: selectedDoctor.specialization, appointmentDate: appointmentDateTime,
          appointmentTime: time, 
          consultationType: consultationType,
          status: 'Pending', createdAt: serverTimestamp()
      });
      toast.success("Appointment Requested!", { description: `Your request for Dr. ${selectedDoctor?.name} has been sent. You will be notified upon confirmation.` });
      setIsSheetOpen(false);
    } catch(error) {
        console.error("Failed to book appointment:", error);
        toast.error('Booking Failed', { description: (error as Error).message || 'There was an issue sending your request.' });
    } finally {
        setIsBooking(false);
    }
  };
  
  const handleOpenBookingSheet = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setIsSheetOpen(true);
  }

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };
  
  const FilterPanel = () => (
    <Card className="sticky top-20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><SlidersHorizontal/> Filters & Sort</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2"><Label>Sort By</Label><Select value={sortBy} onValueChange={setSortBy}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="distance">Distance</SelectItem><SelectItem value="price">Price</SelectItem><SelectItem value="experience">Experience</SelectItem></SelectContent></Select></div>
        <div className="space-y-2"><Label>Availability</Label><Select value={availabilityFilter} onValueChange={setAvailabilityFilter}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="any">Any</SelectItem><SelectItem value="today">Today</SelectItem><SelectItem value="tomorrow">Tomorrow</SelectItem></SelectContent></Select></div>
        <div className="space-y-2"><Label>Max Fee: ₹{priceRange[0]}</Label><Slider value={priceRange} onValueChange={setPriceRange} max={2000} step={100}/></div>
        <div className="space-y-2"><Label>Doctor's Gender</Label><RadioGroup value={genderFilter} onValueChange={setGenderFilter} className="flex gap-4 items-center pt-2"><RadioGroupItem value="any" id="g-any"/><Label htmlFor="g-any">Any</Label><RadioGroupItem value="male" id="g-male"/><Label htmlFor="g-male">Male</Label><RadioGroupItem value="female" id="g-female"/><Label htmlFor="g-female">Female</Label></RadioGroup></div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-4 md:p-6 space-y-8 pt-12">
      <div className="text-center max-w-2xl mx-auto">
          <CardTitle className="text-3xl md:text-4xl font-extrabold tracking-tight">Find the Right Care, Instantly.</CardTitle>
          <CardDescription className="text-lg mt-2">Search by doctor, specialization, or symptoms.</CardDescription>
      </div>
      
       <div className="max-w-xl mx-auto w-full">
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                    id="doctor-search"
                    placeholder="Search by doctor name, hospital, or specialization..."
                    className="pl-12 h-12 text-base rounded-full shadow-lg"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
        </div>

      <div className="space-y-4">
          <Label className="font-semibold text-lg">Search by Common Symptoms</Label>
          <Carousel opts={{ align: "start", loop: false, skipSnaps: true }} className="w-full">
              <CarouselContent className="-ml-2">
                  {symptomCategories.map((symptom, i) => (
                      <CarouselItem key={i} className="pl-2 basis-1/3 md:basis-1/4 lg:basis-1/6">
                          <Card className={`p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:ring-2 hover:ring-primary transition-all text-center h-full ${selectedSymptom === symptom.name ? 'ring-2 ring-primary' : ''}`} onClick={() => setSelectedSymptom(prev => prev === symptom.name ? null : symptom.name)}>
                              <div className="p-3 bg-muted rounded-full"><symptom.icon className="w-6 h-6" /></div>
                              <p className="text-xs font-semibold">{symptom.name}</p>
                          </Card>
                      </CarouselItem>
                  ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
          </Carousel>
      </div>
      
       <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        <div className="hidden lg:block lg:col-span-1">
          <FilterPanel />
        </div>
        <div className="lg:col-span-3">
          <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{filteredAndSortedDoctors.length} doctors found</h3>
              <div className="lg:hidden"><Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}><SheetTrigger asChild><Button variant="outline"><SlidersHorizontal className="mr-2 h-4 w-4"/>Filter</Button></SheetTrigger><SheetContent><SheetHeader><SheetTitle>Filters</SheetTitle></SheetHeader><div className="p-4"><FilterPanel /></div></SheetContent></Sheet></div>
          </div>
          <div className="space-y-4">
              {isLoading ? Array.from({length:3}).map((_,i) => (
                <Card key={i} className="p-4 flex gap-4 items-start w-full">
                    <Skeleton className="w-24 h-24 rounded-full"/>
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-6 w-1/2"/>
                        <Skeleton className="h-4 w-1/3"/>
                        <Skeleton className="h-4 w-3/4"/>
                        <Skeleton className="h-4 w-1/4"/>
                    </div>
                     <div className="flex flex-col items-end justify-between h-full gap-2">
                        <Skeleton className="h-6 w-16"/>
                        <Skeleton className="h-9 w-24"/>
                    </div>
                </Card>
              ))
                : filteredAndSortedDoctors.length > 0 ? (
                  <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4">
                    {filteredAndSortedDoctors.map(doctor => (
                        <motion.div key={doctor.id} variants={itemVariants}>
                            <Card className="p-4 flex flex-col md:flex-row gap-4 items-start w-full text-left">
                                <Avatar className="w-24 h-24"><AvatarImage src={doctor.photoUrl || `https://i.pravatar.cc/150?u=${doctor.id}`} /><AvatarFallback>{doctor.name.substring(0,2)}</AvatarFallback></Avatar>
                                <div className="flex-1">
                                    <p className="font-bold text-xl flex items-center gap-2">Dr. {doctor.name} 
                                      {doctor.gender === 'female' && <PersonStanding className="w-5 h-5 text-pink-500" title="Female doctor available"/>}
                                    </p>
                                    <p className="font-semibold text-primary">{doctor.specialization}</p>
                                    <p className="text-sm text-muted-foreground">{doctor.experience} years | {doctor.qualifications}</p>
                                    <div className="text-sm text-muted-foreground mt-2 flex items-center gap-2"><Building className="w-4 h-4"/> {doctor.hospitalName}</div>
                                    {doctor.distance != null && (<div className="text-sm text-muted-foreground flex items-center gap-2"><MapPin className="w-4 h-4"/>{doctor.distance.toFixed(1)} km away</div>)}
                                    <div className="mt-2">
                                      {(doctor.availability?.availableToday ?? Math.random() > 0.3) && <Badge variant="secondary" className="bg-green-100 text-green-800">Available Today</Badge>}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end justify-between h-full w-full md:w-auto mt-4 md:mt-0">
                                  <p className="font-bold text-lg">₹{doctor.consultationFee}</p>
                                  <div className="flex gap-2 w-full">
                                    <Button asChild size="sm" variant="outline" className="flex-1">
                                      <Link href={`/user/doctor/${doctor.hospitalId}/${doctor.id}`}>
                                        View Profile
                                      </Link>
                                    </Button>
                                    <Button size="sm" className="flex-1" onClick={() => handleOpenBookingSheet(doctor)}>Book Now</Button>
                                  </div>
                                </div>
                            </Card>
                        </motion.div>
                    ))}
                  </motion.div>
                ) : (<Card className="col-span-full text-center p-12 flex flex-col items-center">
                    <Search className="w-16 h-16 text-muted-foreground mb-4"/>
                    <p className="font-bold text-lg">No Doctors Found</p>
                    <p className="text-muted-foreground">Try adjusting your filters or search terms to find the right doctor for you.</p>
                </Card>)
              }
          </div>
        </div>
      </div>
       <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
         <SheetContent>
            {selectedDoctor && (
              <>
                <SheetHeader className="text-left">
                    <div className="flex items-center gap-4">
                        <Avatar className="w-16 h-16"><AvatarImage src={selectedDoctor.photoUrl || `https://i.pravatar.cc/150?u=${selectedDoctor.id}`} /><AvatarFallback>{selectedDoctor.name.substring(0,2)}</AvatarFallback></Avatar>
                        <div>
                        <SheetTitle className="text-2xl">Book with Dr. {selectedDoctor.name}</SheetTitle>
                        <SheetDescription>{selectedDoctor.specialization} at {selectedDoctor.hospitalName}</SheetDescription>
                        </div>
                    </div>
                </SheetHeader>
                <div className="space-y-6 py-4">
                  <div className="p-3 rounded-lg border bg-muted/50 flex justify-between items-center"><span className="font-semibold">Consultation Fee</span><span className="font-bold text-lg text-primary">₹{selectedDoctor.consultationFee}</span></div>
                  <div className="space-y-3"><Label className="font-semibold">1. Select Consultation Type</Label><RadioGroup onValueChange={(v) => setConsultationType(v as any)} value={consultationType} className="grid grid-cols-2 gap-4"><div><RadioGroupItem value="in-clinic" id="in-clinic" className="peer sr-only" /><Label htmlFor="in-clinic" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"><Building className="mb-3 h-6 w-6" /> In-Clinic</Label></div><div><RadioGroupItem value="video" id="video" className="peer sr-only" /><Label htmlFor="video" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"><Video className="mb-3 h-6 w-6" /> Video</Label></div></RadioGroup></div>
                  <div className="space-y-2"><Label className="font-semibold">2. Select Appointment Date</Label><Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{date ? format(date, "PPP") : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={date} onSelect={setDate} initialFocus disabled={(d) => d < new Date(new Date().setDate(new Date().getDate() - 1))}/></PopoverContent></Popover></div>
                  <div className="space-y-2"><Label className="font-semibold">3. Select Available Time Slot</Label><div className="grid grid-cols-3 gap-2">{timeSlots.map(slot => (<Button key={slot} variant={time === slot ? 'default' : 'outline'} onClick={() => setTime(slot)}>{slot}</Button>))}</div></div>
                </div>
                <SheetFooter className="absolute bottom-0 left-0 right-0 p-4 border-t bg-background">
                  <Button className="w-full" size="lg" onClick={handleBookingConfirmation} disabled={!date || !time || isBooking || !consultationType}>{isBooking ? 'Requesting...' : 'Confirm Appointment'}</Button>
                </SheetFooter>
              </>
            )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
