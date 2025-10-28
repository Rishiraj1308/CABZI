'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { useFirebase, ClientSession } from '@/firebase/client-provider'
import { doc, getDoc, collection, addDoc, serverTimestamp, GeoPoint } from 'firebase/firestore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar as CalendarIcon, Clock, IndianRupee, MapPin, Building, Star, GraduationCap, Stethoscope, Briefcase, ChevronRight, Video } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetTrigger } from '@/components/ui/sheet'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface DoctorProfile {
    id: string;
    name: string;
    specialization: string;
    qualifications: string;
    experience: string;
    about?: string;
    photoUrl?: string;
    consultationFee: number;
    hospitalId: string;
    hospitalName: string;
    services?: string[];
    education?: { degree: string, university: string, year: string }[];
    workExperience?: { position: string, hospital: string, duration: string }[];
}

const mockReviews = [
    { name: 'Priya S.', rating: 5, comment: 'Dr. Verma is very patient and explains everything clearly. Highly recommended.' },
    { name: 'Rohan K.', rating: 4, comment: 'Good consultation, but the waiting time was a bit long.' },
    { name: 'Anjali M.', rating: 5, comment: 'Excellent doctor. Helped me recover quickly.' },
]

const timeSlots = [
  '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'
]


export default function DoctorProfilePage() {
    const params = useParams();
    const { hospitalId, doctorId } = params;
    const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { db, user } = useFirebase();
    const { toast } = useToast();
    
    // Booking State
    const [isBooking, setIsBooking] = useState(false);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [time, setTime] = useState('');
    const [consultationType, setConsultationType] = useState<'in-clinic' | 'video' | ''>('');
    const [session, setSession] = useState<ClientSession | null>(null);

    const overallRating = useMemo(() => {
        if (mockReviews.length === 0) return 'N/A';
        const avg = mockReviews.reduce((sum, r) => sum + r.rating, 0) / mockReviews.length;
        return avg.toFixed(1);
    }, []);

    useEffect(() => {
        if (user && db) {
            getDoc(doc(db, 'users', user.uid)).then(docSnap => {
                if (docSnap.exists()) {
                    const userData = docSnap.data();
                    setSession({ userId: user.uid, name: userData.name, phone: userData.phone, gender: userData.gender });
                }
            });
        }
    }, [user, db]);

    useEffect(() => {
        if (!db || !hospitalId || !doctorId) {
            setIsLoading(false);
            return;
        }

        const fetchDoctorProfile = async () => {
            setIsLoading(true);
            try {
                const doctorRef = doc(db, `ambulances/${hospitalId}/doctors`, doctorId as string);
                const doctorSnap = await getDoc(doctorRef);

                if (doctorSnap.exists()) {
                    const hospitalRef = doc(db, 'ambulances', hospitalId as string);
                    const hospitalSnap = await getDoc(hospitalRef);
                    const hospitalName = hospitalSnap.exists() ? hospitalSnap.data().name : 'Unknown Hospital';
                    
                    const data = doctorSnap.data();
                    setDoctor({
                        id: doctorSnap.id,
                        name: data.name,
                        specialization: data.specialization,
                        qualifications: data.qualifications,
                        experience: data.experience,
                        consultationFee: data.consultationFee,
                        hospitalId: hospitalId as string,
                        hospitalName: hospitalName,
                        photoUrl: data.photoUrl,
                        about: data.about || "A dedicated professional committed to providing the best patient care.",
                        services: data.services || ['General Consultation', 'Routine Checkups', 'Medical Diagnostics'],
                        education: data.education || [{degree: 'MBBS', university: 'AIIMS, Delhi', year: '2010'}],
                        workExperience: data.workExperience || [{position: 'Senior Consultant', hospital: 'Max Healthcare', duration: '2015 - Present'}],
                    });
                } else {
                    toast({ variant: 'destructive', title: 'Doctor not found' });
                }
            } catch (error) {
                console.error("Error fetching doctor profile:", error);
                toast({ variant: 'destructive', title: 'Failed to load profile' });
            } finally {
                setIsLoading(false);
            }
        };

        fetchDoctorProfile();
    }, [db, hospitalId, doctorId, toast]);
    
    const handleBookingConfirmation = async () => {
        if (!doctor || !session || !db || !date || !time || !consultationType) { toast({ variant: 'destructive', title: 'Error', description: 'Missing required information to book.' }); return; }
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
          await addDoc(collection(db, 'appointments'), {
              patientId: session.userId, patientName: userData.name, patientPhone: userData.phone,
              hospitalId: doctor.hospitalId, hospitalName: doctor.hospitalName,
              doctorId: doctor.id, doctorName: `Dr. ${doctor.name}`,
              department: doctor.specialization, appointmentDate: appointmentDateTime,
              appointmentTime: time, 
              consultationType: consultationType,
              status: 'Pending', createdAt: serverTimestamp()
          });
          toast({ title: "Appointment Requested!", description: `Your request for Dr. ${doctor?.name} has been sent. You will be notified upon confirmation.`, className: 'bg-green-600 border-green-600 text-white' });
          setIsSheetOpen(false);
        } catch(error) {
            console.error("Failed to book appointment:", error);
            toast({ variant: 'destructive', title: 'Booking Failed', description: (error as Error).message || 'There was an issue sending your request.' });
        } finally {
            setIsBooking(false);
        }
      };


    if (isLoading) {
        return (
            <div className="p-4 md:p-6 lg:p-8 space-y-6">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-48 w-full" />
            </div>
        )
    }

    if (!doctor) {
        return <div className="p-8 text-center">Doctor not found.</div>
    }

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
            <Card className="overflow-hidden">
                <CardContent className="p-0">
                    <div className="grid grid-cols-1 md:grid-cols-3">
                        <div className="md:col-span-1 bg-muted/50 p-6 flex flex-col items-center text-center">
                            <Avatar className="w-32 h-32 border-4 border-primary mb-4">
                                <AvatarImage src={doctor.photoUrl || `https://i.pravatar.cc/150?u=${doctor.id}`} />
                                <AvatarFallback>{doctor.name.substring(0,2)}</AvatarFallback>
                            </Avatar>
                            <h1 className="text-2xl font-bold">Dr. {doctor.name}</h1>
                            <p className="font-semibold text-primary text-lg">{doctor.specialization}</p>
                            <p className="text-sm text-muted-foreground">{doctor.qualifications}</p>
                             <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                                <SheetTrigger asChild>
                                    <Button className="w-full mt-6" size="lg">Book Appointment</Button>
                                </SheetTrigger>
                                 <SheetContent>
                                    <SheetHeader className="text-left">
                                    <div className="flex items-center gap-4">
                                        <Avatar className="w-16 h-16"><AvatarImage src={doctor.photoUrl || `https://i.pravatar.cc/150?u=${doctor.id}`} /><AvatarFallback>{doctor.name.substring(0,2)}</AvatarFallback></Avatar>
                                        <div>
                                        <SheetTitle className="text-2xl">Book with Dr. {doctor.name}</SheetTitle>
                                        <SheetDescription>{doctor.specialization} at {doctor.hospitalName}</SheetDescription>
                                        </div>
                                    </div>
                                    </SheetHeader>
                                    <div className="space-y-6 py-4">
                                    <div className="p-3 rounded-lg border bg-muted/50 flex justify-between items-center"><span className="font-semibold">Consultation Fee</span><span className="font-bold text-lg text-primary">₹{doctor.consultationFee}</span></div>
                                    <div className="space-y-3"><Label className="font-semibold">1. Select Consultation Type</Label><RadioGroup onValueChange={(v) => setConsultationType(v as any)} value={consultationType} className="grid grid-cols-2 gap-4"><div><RadioGroupItem value="in-clinic" id="in-clinic" className="peer sr-only" /><Label htmlFor="in-clinic" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"><Building className="mb-3 h-6 w-6" /> In-Clinic</Label></div><div><RadioGroupItem value="video" id="video" className="peer sr-only" /><Label htmlFor="video" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"><Video className="mb-3 h-6 w-6" /> Video</Label></div></RadioGroup></div>
                                    <div className="space-y-2"><Label className="font-semibold">2. Select Appointment Date</Label><Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{date ? format(date, "PPP") : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={date} onSelect={setDate} initialFocus disabled={(d) => d < new Date(new Date().setDate(new Date().getDate() - 1))}/></PopoverContent></Popover></div>
                                    <div className="space-y-2"><Label className="font-semibold">3. Select Available Time Slot</Label><div className="grid grid-cols-3 gap-2">{timeSlots.map(slot => (<Button key={slot} variant={time === slot ? 'default' : 'outline'} onClick={() => setTime(slot)}>{slot}</Button>))}</div></div>
                                    </div>
                                    <SheetFooter className="absolute bottom-0 left-0 right-0 p-4 border-t bg-background">
                                    <Button className="w-full" size="lg" onClick={handleBookingConfirmation} disabled={!date || !time || isBooking || !consultationType}>{isBooking ? 'Requesting...' : 'Confirm Appointment'}</Button>
                                    </SheetFooter>
                                </SheetContent>
                            </Sheet>
                        </div>
                        <div className="md:col-span-2 p-6">
                             <div className="grid grid-cols-3 gap-4 text-center mb-6">
                                <div className="p-3 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">Experience</p><p className="font-bold text-xl">{doctor.experience} yrs</p></div>
                                <div className="p-3 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">Patients</p><p className="font-bold text-xl">1.5k+</p></div>
                                <div className="p-3 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">Rating</p><p className="font-bold text-xl flex items-center justify-center gap-1">{overallRating} <Star className="w-4 h-4 text-amber-400 fill-amber-400"/></p></div>
                            </div>
                            
                            <div className="space-y-6">
                                <div><h3 className="font-bold text-lg mb-2">About Dr. {doctor.name}</h3><p className="text-sm text-muted-foreground">{doctor.about}</p></div>
                                <div><h3 className="font-bold text-lg mb-2">Services Offered</h3><div className="flex flex-wrap gap-2">{doctor.services?.map(s => <Badge key={s} variant="secondary">{s}</Badge>)}</div></div>
                                <div><h3 className="font-bold text-lg mb-2">Education & Experience</h3><div className="space-y-4 text-sm"><div className="flex items-start gap-4"><GraduationCap className="w-5 h-5 text-primary mt-1 shrink-0"/><div className="flex-1"><p className="font-semibold">{doctor.education?.[0].degree}</p><p className="text-muted-foreground">{doctor.education?.[0].university} ({doctor.education?.[0].year})</p></div></div><div className="flex items-start gap-4"><Briefcase className="w-5 h-5 text-primary mt-1 shrink-0"/><div className="flex-1"><p className="font-semibold">{doctor.workExperience?.[0].position}</p><p className="text-muted-foreground">{doctor.workExperience?.[0].hospital} ({doctor.workExperience?.[0].duration})</p></div></div></div></div>
                                <Separator />
                                <div><h3 className="font-bold text-lg mb-2">Patient Reviews ({mockReviews.length})</h3><div className="space-y-4">{mockReviews.map(r => (<div key={r.name} className="flex gap-3"><Avatar className="w-9 h-9"><AvatarFallback>{r.name.substring(0,1)}</AvatarFallback></Avatar><div><div className="flex items-center gap-2"><p className="font-semibold text-sm">{r.name}</p><div className="flex gap-0.5">{Array.from({length: 5}).map((_, i) => <Star key={i} className={`w-3 h-3 ${i < r.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`}/>)}</div></div><p className="text-sm text-muted-foreground">{r.comment}</p></div></div>))}</div></div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
