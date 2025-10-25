
'use client'

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Stethoscope, Clock, Search, ArrowLeft, IndianRupee, MapPin, HeartPulse } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useDb, useFirebase } from '@/firebase/client-provider';
import { collection, collectionGroup, getDocs, query, where, addDoc, serverTimestamp, getDoc, doc, GeoPoint } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import type { ClientSession } from '@/lib/types';

const timeSlots = [
  '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'
]

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
    hospitalLocation?: GeoPoint; // Added for distance calculation
    distance?: number | null; // To store calculated distance
}

const symptomCategories = [
    { name: 'Fever / Cold', specializations: ['General Physician'] },
    { name: 'Headache / Migraine', specializations: ['General Physician', 'Neurology'] },
    { name: 'Stomach Ache / Digestion', specializations: ['Gastroenterology', 'General Physician'] },
    { name: 'Bone / Joint Pain', specializations: ['Orthopedics'] },
    { name: 'Skin Rashes / Allergy', specializations: ['Dermatology'] },
    { name: 'Heart / Chest Pain', specializations: ['Cardiology'] },
    { name: 'Child Health Issue', specializations: ['Pediatrics'] },
    { name: 'Ear, Nose, Throat', specializations: ['ENT Specialist'] },
    { name: 'Cancer Related Inquiry', specializations: ['Oncology'] },
];

export default function BookAppointmentPage() {
  const [step, setStep] = useState(1);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSymptom, setSelectedSymptom] = useState<string | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [time, setTime] = useState('');
  const { toast } = useToast();
  const { user, db } = useFirebase();
  const [session, setSession] = useState<ClientSession | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number, lon: number } | null>(null);

  useEffect(() => {
    // Get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
        },
        () => {
          toast({ variant: 'destructive', title: "Location Error", description: "Could not get your location. Distances won't be shown." });
        }
      );
    }
  }, [toast]);
  
  useEffect(() => {
    if (user && db) {
        const userDocRef = doc(db, 'users', user.uid);
        getDoc(userDocRef).then(docSnap => {
            if (docSnap.exists()) {
                const userData = docSnap.data();
                setSession({
                    userId: user.uid,
                    name: userData.name,
                    phone: userData.phone,
                    gender: userData.gender
                });
            }
        });
    }
  }, [user, db]);

    const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        if ((lat1 === lat2) && (lon1 === lon2)) {
            return 0;
        }
        const R = 6371; // Radius of the earth in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distance in km
    };

  useEffect(() => {
    const fetchVerifiedDoctors = async () => {
        if (!db) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const doctorsQuery = query(collectionGroup(db, 'doctors'), where('docStatus', '==', 'Verified'));
            const snapshot = await getDocs(doctorsQuery);
            const doctorsList: Doctor[] = [];
            
            const hospitalIds = snapshot.docs.map(doc => doc.ref.parent.parent?.id).filter(Boolean) as string[];
            const uniqueHospitalIds = [...new Set(hospitalIds)];
            let hospitalData: Record<string, {name: string, location?: GeoPoint}> = {};

            if (uniqueHospitalIds.length > 0) {
                 const hospitalsQuery = query(collection(db, 'ambulances'), where('__name__', 'in', uniqueHospitalIds));
                 const hospitalsSnap = await getDocs(hospitalsQuery);
                 hospitalsSnap.forEach(doc => {
                    hospitalData[doc.id] = {
                        name: doc.data().name,
                        location: doc.data().location,
                    };
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

                    doctorsList.push({ 
                        id: doc.id, 
                        ...docData,
                        hospitalId: hospitalId,
                        hospitalName: hospitalData[hospitalId].name,
                        hospitalLocation: hospitalData[hospitalId].location,
                        distance: distance
                    } as Doctor);
                }
            });
            
            doctorsList.sort((a, b) => {
                if (a.distance != null && b.distance != null) {
                    return a.distance - b.distance;
                }
                if (a.distance != null) return -1;
                if (b.distance != null) return 1;
                return a.name.localeCompare(b.name);
            });

            setDoctors(doctorsList);
        } catch (error) {
            console.error("Error fetching verified doctors:", error);
            toast({
                variant: 'destructive',
                title: 'Failed to load doctors',
                description: 'Could not fetch the list of available doctors. Please try again later.'
            });
        } finally {
            setIsLoading(false);
        }
    };

    fetchVerifiedDoctors();
  }, [db, toast, userLocation]);


  const resetFlow = () => {
    setStep(1);
    setSelectedDoctor(null);
    setDate(new Date());
    setTime('');
    setIsBooking(false);
  };
  
  const handleBookingConfirmation = async () => {
      if (!selectedDoctor || !session || !db || !date || !time) {
          toast({ variant: 'destructive', title: 'Error', description: 'Missing required information to book.' });
          return;
      }

      setIsBooking(true);
      
      try {
        const userDoc = await getDoc(doc(db, "users", session.userId));
        if (!userDoc.exists()) {
            throw new Error("User profile not found. Cannot book appointment.");
        }
        const userData = userDoc.data();

        const appointmentDateTime = new Date(date);
        const [hours, minutes] = time.split(/[: ]/);
        const parsedHours = parseInt(hours, 10);
        const parsedMinutes = parseInt(minutes, 10);
        
        let finalHours = parsedHours;
        if (time.includes('PM') && parsedHours !== 12) {
            finalHours += 12;
        }
        if (time.includes('AM') && parsedHours === 12) { // Handle 12 AM case
            finalHours = 0;
        }

        appointmentDateTime.setHours(finalHours, parsedMinutes, 0, 0);

        const newAppointment = {
            patientId: session.userId,
            patientName: userData.name,
            patientPhone: userData.phone,
            hospitalId: selectedDoctor.hospitalId,
            hospitalName: selectedDoctor.hospitalName,
            doctorId: selectedDoctor.id,
            doctorName: `Dr. ${selectedDoctor.name}`,
            department: selectedDoctor.specialization,
            appointmentDate: appointmentDateTime,
            appointmentTime: time,
            status: 'Pending',
            createdAt: serverTimestamp()
        };

        await addDoc(collection(db, 'appointments'), newAppointment);
        
        toast({
            title: "Appointment Requested!",
            description: `Your request for Dr. ${selectedDoctor?.name} has been sent. You will be notified upon confirmation.`,
            className: 'bg-green-600 border-green-600 text-white'
        });
        resetFlow();

      } catch(error) {
          console.error("Failed to book appointment:", error);
          toast({ variant: 'destructive', title: 'Booking Failed', description: (error as Error).message || 'There was an issue sending your request.' });
          setIsBooking(false);
      }
  }
  
  const filteredDoctors = doctors.filter(d => {
    const symptomMatch = selectedSymptom 
        ? symptomCategories.find(s => s.name === selectedSymptom)?.specializations.includes(d.specialization) 
        : true;
    
    const searchMatch = searchQuery 
        ? d.name.toLowerCase().includes(searchQuery.toLowerCase()) || d.specialization.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
        
    return symptomMatch && searchMatch;
  });

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="animate-fade-in">
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <CalendarIcon className="w-8 h-8 text-primary" />
            Book a Doctor's Appointment
        </h2>
        <p className="text-muted-foreground">Find and book appointments with top doctors seamlessly.</p>
      </div>

      <Card className="max-w-4xl mx-auto">
        {step === 1 && (
             <>
                <CardHeader>
                    <CardTitle>Step 1: Find Your Doctor</CardTitle>
                    <CardDescription>Search by doctor, specialization, or common symptoms.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="space-y-2">
                        <Label htmlFor="symptom-search" className="font-semibold">Search by Symptoms</Label>
                         <div className="flex flex-wrap gap-2">
                            {symptomCategories.map(symptom => (
                                <Button 
                                    key={symptom.name}
                                    variant={selectedSymptom === symptom.name ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setSelectedSymptom(prev => prev === symptom.name ? null : symptom.name)}
                                >
                                    {symptom.name}
                                </Button>
                            ))}
                        </div>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="doctor-search" placeholder="Or search by doctor name or specialization..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    </div>
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                       {isLoading ? (
                           Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
                       ) : filteredDoctors.length > 0 ? (
                           filteredDoctors.map(doctor => (
                               <Card key={doctor.id} className="p-3 flex items-center gap-3 cursor-pointer hover:bg-muted" onClick={() => { setSelectedDoctor(doctor); setStep(2); }}>
                                    <Avatar className="w-12 h-12">
                                        <AvatarImage src={doctor.photoUrl || `https://i.pravatar.cc/100?u=${doctor.id}`} alt={doctor.name} />
                                        <AvatarFallback>{doctor.name.substring(0,2)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                        <p className="font-bold">Dr. {doctor.name}</p>
                                        <p className="text-sm text-muted-foreground">{doctor.specialization} &bull; {doctor.qualifications}</p>
                                        <p className="text-xs text-muted-foreground">{doctor.hospitalName}</p>
                                    </div>
                                    <div className="text-right flex flex-col items-end">
                                        <p className="font-bold text-lg text-primary flex items-center justify-end"><IndianRupee className="w-4 h-4" />{doctor.consultationFee}</p>
                                        {doctor.distance != null && (
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                                <MapPin className="w-3 h-3"/>
                                                {doctor.distance.toFixed(1)} km away
                                            </div>
                                        )}
                                    </div>
                               </Card>
                           ))
                       ) : (
                           <div className="text-center py-10 text-muted-foreground">
                               <p>No doctors found matching your criteria.</p>
                           </div>
                       )}
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
                        <div className="grid grid-cols-3 gap-2">
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
                     <Button className="w-full" onClick={handleBookingConfirmation} disabled={!date || !time || isBooking}>
                        {isBooking ? 'Requesting...' : 'Request Appointment'}
                     </Button>
                 </CardFooter>
            </>
        )}
      </Card>
    </div>
  )
}
