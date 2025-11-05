
'use client'

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Stethoscope, Calendar, Users, Clock, UserCheck, UserPlus, MoreHorizontal, Trash2, Phone, ArrowLeft, Video, Building, UploadCloud, CheckCircle, FileSignature } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useDb, useFirebase } from '@/firebase/client-provider';
import { collection, query, where, onSnapshot, Timestamp, orderBy, getDocs, doc, updateDoc, deleteDoc, addDoc, serverTimestamp, writeBatch, limit, collectionGroup } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { startOfDay, endOfDay } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useCurePartner } from './layout';
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from 'firebase/auth'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';


const StatCard = ({ title, value, icon: Icon, isLoading }: { title: string, value: string, icon: React.ElementType, isLoading?: boolean }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="w-4 h-4 text-muted-foreground"/>
        </CardHeader>
        <CardContent>
            {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{value}</div>}
        </CardContent>
    </Card>
);

interface Appointment {
    id: string;
    patientName: string;
    appointmentDate: Timestamp;
    appointmentTime: string;
    status: 'Pending' | 'Confirmed' | 'In Queue' | 'Completed' | 'Cancelled';
    doctorName: string;
}

interface Doctor {
    id: string;
    name: string;
    specialization: string;
    isAvailable: boolean;
    partnerId: string;
    phone: string;
}

const doctorSpecializations = [
  'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'Oncology', 
  'Gastroenterology', 'General Physician', 'Dermatology', 'ENT Specialist'
];

const initialDoctorState = {
    fullName: '',
    gender: '',
    dob: '',
    contactNumber: '',
    emailAddress: '',
    specialization: '',
    qualifications: '',
    experience: '',
    department: '',
    designation: '',
    medicalRegNo: '',
    regCouncil: '',
    regYear: '',
    consultationFee: '',
    otp: '',
    agreedToTerms: false,
};

const ClinicDashboard = () => {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAddDoctorDialogOpen, setIsAddDoctorDialogOpen] = useState(false);
    const [newDoctorData, setNewDoctorData] = useState(initialDoctorState);
    const [generatedCreds, setGeneratedCreds] = useState<{ id: string, pass: string, role: string } | null>(null);
    const [isCredsDialogOpen, setIsCredsDialogOpen] = useState(false);
    const [currentFormStep, setCurrentFormStep] = useState(1);
    const totalSteps = 6;
    const { partnerData } = useCurePartner();
    const { user, db, auth } = useFirebase();
    const { toast } = useToast();
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
    const recaptchaContainerRef = useRef<HTMLDivElement>(null);
    const [availability, setAvailability] = useState<Record<string, { available: boolean, start: string, end: string, breakStart: string, breakEnd: string }>>({
        Monday: { available: true, start: '09:00', end: '17:00', breakStart: '13:00', breakEnd: '14:00' },
        Tuesday: { available: true, start: '09:00', end: '17:00', breakStart: '13:00', breakEnd: '14:00' },
        Wednesday: { available: true, start: '09:00', end: '17:00', breakStart: '13:00', breakEnd: '14:00' },
        Thursday: { available: true, start: '09:00', end: '17:00', breakStart: '13:00', breakEnd: '14:00' },
        Friday: { available: true, start: '09:00', end: '17:00', breakStart: '13:00', breakEnd: '14:00' },
        Saturday: { available: false, start: '10:00', end: '14:00', breakStart: '', breakEnd: '' },
        Sunday: { available: false, start: '', end: '', breakStart: '', breakEnd: '' },
    });
    const [maxPatients, setMaxPatients] = useState('20');


    useEffect(() => {
        if (auth && recaptchaContainerRef.current && !recaptchaContainerRef.current.hasChildNodes()) {
            try {
                // @ts-ignore
                window.recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainerRef.current, { size: 'invisible' });
            } catch (e) {
                console.error("Recaptcha Verifier error", e);
            }
        }
    }, [auth]);


    const handleLogout = useCallback(() => {
        // Placeholder for logout logic
    }, []);

    useEffect(() => {
        if (!db || !user || !partnerData) {
            setIsLoading(false);
            return;
        }

        let isSubscribed = true;

        const todayStart = startOfDay(new Date());
        const todayEnd = endOfDay(new Date());

        const apptQuery = query(
            collection(db, 'appointments'),
            where('hospitalId', '==', partnerData.id),
            where('appointmentDate', '>=', todayStart),
            where('appointmentDate', '<=', todayEnd),
            orderBy('appointmentDate', 'asc')
        );

        const unsubAppts = onSnapshot(apptQuery, (snapshot) => {
            if (isSubscribed) {
                const apptsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
                setAppointments(apptsData);
            }
        }, (error) => {
            if (isSubscribed) {
                console.error("Error fetching appointments: ", error);
                toast({ variant: 'destructive', title: "Error", description: 'Could not fetch appointments.' });
            }
        });
        
        const doctorsQuery = query(collection(db, `curePartners/${partnerData.id}/doctors`));
        const unsubDoctors = onSnapshot(doctorsQuery, (snapshot) => {
            if (isSubscribed) {
                const doctorsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Doctor));
                setDoctors(doctorsData);
                setIsLoading(false);
            }
        });

        return () => {
            isSubscribed = false;
            unsubAppts();
            unsubDoctors();
        };

    }, [db, user, toast, partnerData]);
    
    const stats = useMemo(() => {
        const checkedInCount = appointments.filter(a => a.status === 'In Queue').length;
        const waitingCount = appointments.filter(a => a.status === 'Confirmed').length;
        const avgWaitTime = checkedInCount > 0 ? 15 : 0; // Mock calculation
        return {
            todayAppointments: appointments.length,
            waiting: waitingCount,
            avgWaitTime,
        }
    }, [appointments]);

    const handleCheckIn = async (appointmentId: string) => {
        if (!db) return;
        const apptRef = doc(db, 'appointments', appointmentId);
        try {
            await updateDoc(apptRef, { status: 'In Queue' });
            toast({ title: 'Patient Checked In', description: 'The patient has been added to the queue.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Check-in Failed' });
        }
    };

    const handleAddDoctor = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!db || !partnerData) {
            toast({ variant: 'destructive', title: 'Error', description: 'Database or hospital information is missing.' });
            return;
        }
        
        if (currentFormStep === 1) {
            if (newDoctorData.fullName.length < 3 || !newDoctorData.specialization) {
                toast({ variant: 'destructive', title: 'Incomplete', description: 'Please enter a valid name and select a specialization.' });
                return;
            }
             setCurrentFormStep(p => p + 1);
            return;
        }
        
        if (currentFormStep === 2) {
             if (!auth) return;
            setIsSubmitting(true);
            try {
                const fullPhoneNumber = `+91${newDoctorData.contactNumber}`;
                // @ts-ignore
                const confirmation = await signInWithPhoneNumber(auth, fullPhoneNumber, window.recaptchaVerifier);
                setConfirmationResult(confirmation);
                toast({ title: 'OTP Sent!', description: `An OTP has been sent to ${fullPhoneNumber}.` });
                setCurrentFormStep(p => p + 1);
            } catch (error) {
                toast({ variant: 'destructive', title: 'Failed to Send OTP' });
            } finally {
                setIsSubmitting(false);
            }
            return;
        }
        
        if (currentFormStep === 3) {
            if (!confirmationResult || newDoctorData.otp.length !== 6) {
                toast({ variant: 'destructive', title: 'Invalid OTP' });
                return;
            }
            setIsSubmitting(true);
            try {
                await confirmationResult.confirm(newDoctorData.otp);
                toast({ title: 'Phone Verified!', className: 'bg-green-600 text-white border-green-600'});
                setCurrentFormStep(p => p + 1);
            } catch (error) {
                toast({ variant: 'destructive', title: 'OTP Verification Failed' });
            } finally {
                setIsSubmitting(false);
            }
            return;
        }

        if (currentFormStep === 4) {
            setCurrentFormStep(p => p + 1);
            return;
        }
        
        if (currentFormStep === 5) {
             setCurrentFormStep(p => p + 1);
            return;
        }

        if (currentFormStep === 6) {
             if (!newDoctorData.agreedToTerms) {
                toast({ variant: 'destructive', title: 'Agreement Required', description: 'Please agree to the terms to proceed.' });
                return;
            }
            setIsSubmitting(true);
      
            const { otp, agreedToTerms, ...restOfData } = newDoctorData;
            const { fullName: name, contactNumber: phone, emailAddress: email } = restOfData;
          
            if (!name || !phone || !email || !restOfData.specialization) {
                toast({ variant: 'destructive', title: 'Missing Required Fields', description: 'Please complete all required fields.' });
                setIsSubmitting(false);
                return;
            }
            
            const globalDoctorsRef = collectionGroup(db, 'doctors');

            try {
                const q = query(globalDoctorsRef, where("phone", "==", phone), limit(1));
                const phoneCheckSnapshot = await getDocs(q);

                if (!phoneCheckSnapshot.empty) {
                    throw new Error("A doctor with this phone number is already registered across the platform.");
                }

                const partnerId = `CZD-${phone.slice(-4)}${name.split(' ')[0].slice(0, 2).toUpperCase()}`;
                const password = `cAbZ@${Math.floor(1000 + Math.random() * 9000)}`;
                
                const batch = writeBatch(db);
                
                const hospitalDoctorsRef = collection(db, `curePartners/${partnerData.id}/doctors`);
                const newDoctorDocRefInHospital = doc(hospitalDoctorsRef);
                
                const doctorData = { 
                    id: newDoctorDocRefInHospital.id, 
                    name, phone, email, 
                    ...restOfData,
                    partnerId, 
                    createdAt: serverTimestamp(), 
                    docStatus: 'Awaiting Final Approval', 
                    hospitalId: partnerData.id, hospitalName: partnerData.name, 
                    isAvailable: false,
                    weeklyAvailability: availability,
                    maxPatientsPerDay: Number(maxPatients)
                };
                
                batch.set(newDoctorDocRefInHospital, doctorData);

                const newDoctorDocRefGlobal = doc(collection(db, 'doctors'), newDoctorDocRefInHospital.id);
                batch.set(newDoctorDocRefGlobal, {
                     id: newDoctorDocRefInHospital.id, 
                     name, phone, email, partnerId, password,
                     hospitalId: partnerData.id, hospitalName: partnerData.name,
                     createdAt: serverTimestamp(),
                     status: 'pending_verification'
                });

                await batch.commit();

                setGeneratedCreds({ id: partnerId, pass: password, role: 'Doctor' });
                setIsAddDoctorDialogOpen(false);
                setCurrentFormStep(1);
                setIsCredsDialogOpen(true);
                toast({ title: 'Doctor Record Created!', description: `Dr. ${name}'s record has been submitted for verification.` });
                setNewDoctorData(initialDoctorState);
          
            } catch (error: any) {
                console.error('Error adding doctor:', error);
                toast({ variant: 'destructive', title: 'Error Adding Doctor', description: error.message || 'An unexpected error occurred.' });
            } finally {
                setIsSubmitting(false);
            }
        }
    };
    
    const handleDeleteDoctor = async (doctorId: string, doctorName: string) => {
        if (!db || !partnerData) return;
        
        const batch = writeBatch(db);

        const hospitalDoctorRef = doc(db, `curePartners/${partnerData.id}/doctors`, doctorId);
        batch.delete(hospitalDoctorRef);

        const globalDoctorRef = doc(db, 'doctors', doctorId);
        batch.delete(globalDoctorRef);
        
        try {
          await batch.commit();
          toast({ variant: 'destructive', title: 'Doctor Removed', description: `Dr. ${doctorName} has been removed from the roster.` });
        } catch (error) {
           toast({ variant: 'destructive', title: 'Error', description: 'Could not remove the doctor.' });
        }
    };

    const handleToggleAvailability = async (doctorId: string, isAvailable: boolean) => {
        if (!db || !partnerData) return;
        const doctorRef = doc(db, `curePartners/${partnerData.id}/doctors`, doctorId);
        try {
            await updateDoc(doctorRef, { isAvailable });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Update Failed' });
        }
    };

    const handleFormChange = (field: keyof typeof newDoctorData, value: any) => {
        setNewDoctorData(prev => ({ ...prev, [field]: value }));
    };

    const handleAvailabilityDayChange = (day: string, field: 'available' | 'start' | 'end' | 'breakStart' | 'breakEnd', value: any) => {
        setAvailability(prev => ({
            ...prev,
            [day]: { ...prev[day], [field]: value }
        }));
    };
    
    const queue = useMemo(() => {
        return appointments.filter(a => a.status === 'In Queue').sort((a,b) => a.appointmentDate.seconds - b.appointmentDate.seconds);
    }, [appointments]);


    const renderAddDoctorForm = () => {
        switch(currentFormStep) {
            case 1:
                return (
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold border-b pb-2">Step 1: Basic Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                            <div className="space-y-2">
                                <Label>Full Name*</Label>
                                <Input name="fullName" required value={newDoctorData.fullName} onChange={e => handleFormChange('fullName', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Specialization*</Label>
                                <Select name="specialization" required onValueChange={v => handleFormChange('specialization', v)} value={newDoctorData.specialization}>
                                    <SelectTrigger><SelectValue placeholder="Select Specialization"/></SelectTrigger>
                                    <SelectContent>{doctorSpecializations.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2"><Label>Gender*</Label><RadioGroup name="gender" required className="flex gap-4 pt-2" value={newDoctorData.gender} onValueChange={v => handleFormChange('gender', v)}><div className="flex items-center space-x-2"><RadioGroupItem value="male" id="male" /><Label htmlFor="male">Male</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="female" id="female" /><Label htmlFor="female">Female</Label></div></RadioGroup></div>
                            <div className="space-y-2">
                                <Label>Experience (years)</Label>
                                <Input name="experience" type="number" value={newDoctorData.experience} onChange={e => handleFormChange('experience', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Consultation Fee (INR, optional)</Label>
                                <Input name="consultationFee" type="number" placeholder="e.g., 800" value={newDoctorData.consultationFee} onChange={e => handleFormChange('consultationFee', e.target.value)} />
                            </div>
                        </div>
                    </div>
                );
            case 2:
                 return (
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold border-b pb-2">Step 2: Contact Verification</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                             <div className="space-y-2"><Label>Email Address*</Label><Input name="emailAddress" type="email" required value={newDoctorData.emailAddress} onChange={e => handleFormChange('emailAddress', e.target.value)} /></div>
                             <div className="space-y-2"><Label>Contact Number*</Label><Input name="contactNumber" type="tel" maxLength={10} required value={newDoctorData.contactNumber} onChange={e => handleFormChange('contactNumber', e.target.value)} /></div>
                        </div>
                    </div>
                 );
            case 3:
                return (
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold border-b pb-2">Step 3: Medical KYC</h3>
                        <CardDescription>Upload clear photos of the documents.</CardDescription>
                        <div className="space-y-4 pt-2">
                             <div className="space-y-2"><Label htmlFor="doc-reg">Medical Registration Certificate* (e.g., from MCI)</Label><Input id="doc-reg" type="file" required /></div>
                             <div className="space-y-2"><Label htmlFor="doc-degree">Degree Certificate* (MBBS, BDS, etc.)</Label><Input id="doc-degree" type="file" required /></div>
                             <div className="space-y-2"><Label htmlFor="doc-photo">Doctor's Passport-size Photo*</Label><Input id="doc-photo" type="file" required /></div>
                        </div>
                    </div>
                );
            case 4:
                return (
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold border-b pb-2">Step 4: Set Default Availability</h3>
                        <CardDescription>Set the doctor's weekly recurring schedule. This can be changed later.</CardDescription>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                            {Object.entries(availability).map(([day, value]) => (
                                <div key={day} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                                    <Switch
                                        id={`avail-${day}`}
                                        checked={value.available}
                                        onCheckedChange={(c) => handleAvailabilityDayChange(day, 'available', c)}
                                    />
                                    <Label htmlFor={`avail-${day}`} className="font-medium w-24">{day}</Label>
                                    <Input type="time" value={value.start} onChange={e => handleAvailabilityDayChange(day, 'start', e.target.value)} disabled={!value.available} className="w-32"/>
                                    <span className="text-muted-foreground">-</span>
                                    <Input type="time" value={value.end} onChange={e => handleAvailabilityDayChange(day, 'end', e.target.value)} disabled={!value.available} className="w-32"/>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 5:
                return (
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold border-b pb-2">Step 5: Digital Signature &amp; Legal</h3>
                         <CardDescription>The doctor must agree to these terms to be listed on the Curocity platform.</CardDescription>
                         <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground mt-4">
                            <li>I take full responsibility for all diagnoses and prescriptions provided.</li>
                            <li>I acknowledge and accept full medical liability for my consultations.</li>
                            <li>I agree to Curocity's terms of service and partnership policies.</li>
                            <li>I consent to data privacy and compliance policies of the platform.</li>
                         </ul>
                         <div className="flex items-center space-x-2 pt-4">
                            <Checkbox id="terms" checked={newDoctorData.agreedToTerms} onCheckedChange={(checked) => handleFormChange('agreedToTerms', !!checked)} />
                            <Label htmlFor="terms" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                The doctor has read and agreed to all terms and conditions.
                            </Label>
                        </div>
                    </div>
                );
            case 6:
                return (
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold border-b pb-2">Step 6: Review &amp; Submit</h3>
                        <CardDescription>Please review all the information before final submission.</CardDescription>
                        <div className="space-y-4 pt-2">
                             <div className="p-4 rounded-lg border bg-muted/50 space-y-3">
                                <div className="flex justify-between"><span className="text-muted-foreground">Name:</span> <span className="font-semibold">Dr. {newDoctorData.fullName}</span></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">Specialization:</span> <span className="font-semibold">{newDoctorData.specialization}</span></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">Contact:</span> <span className="font-semibold">{newDoctorData.contactNumber}</span></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">Fee:</span> <span className="font-semibold">₹{newDoctorData.consultationFee || 'N/A'}</span></div>
                                <Separator />
                                <p className="text-xs text-center text-muted-foreground">The submitted documents will be verified by the Curocity team.</p>
                             </div>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    }


    return (
        <div className="space-y-6">
            <div id="recaptcha-container" ref={recaptchaContainerRef} className="fixed bottom-0 right-0"></div>
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Clinic Dashboard</h2>
                <p className="text-muted-foreground">Manage your appointments, doctors, and patient interactions.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard title="Today's Appointments" value={`${stats.todayAppointments}`} icon={Calendar} isLoading={isLoading} />
                <StatCard title="Patients Waiting" value={`${stats.waiting}`} icon={Users} isLoading={isLoading} />
                <StatCard title="Avg. Wait Time" value={`${stats.avgWaitTime} min`} icon={Clock} isLoading={isLoading} />
            </div>
            
            <Tabs defaultValue="appointments" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="appointments">Appointment Queue</TabsTrigger>
                    <TabsTrigger value="doctors">Manage Roster</TabsTrigger>
                </TabsList>
                <TabsContent value="appointments" className="mt-4">
                     <Card>
                        <CardHeader>
                            <CardTitle>Upcoming Appointment Queue</CardTitle>
                        </CardHeader>
                        <CardContent>
                           <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                               {isLoading ? (
                                    Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
                               ) : appointments.length > 0 ? (
                                   appointments.map(appt => {
                                       const queueNumber = queue.findIndex(q => q.id === appt.id);
                                       return (
                                           <div key={appt.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                                               {appt.status === 'In Queue' && queueNumber !== -1 ? (
                                                    <div className="w-12 h-12 flex flex-col items-center justify-center bg-primary text-primary-foreground rounded-lg">
                                                       <span className="text-xs -mb-1">Queue</span>
                                                       <span className="font-bold text-xl">{queueNumber + 1}</span>
                                                   </div>
                                               ) : (
                                                    <div className="w-12 text-center">
                                                        <p className="font-bold text-sm">{new Date(appt.appointmentDate.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
                                                    </div>
                                               )}
                                               <div className="flex-1">
                                                    <p className="font-semibold">{appt.patientName}</p>
                                                    <p className="text-xs text-muted-foreground">{appt.doctorName}</p>
                                               </div>
                                               <Button variant="outline" size="sm" onClick={() => handleCheckIn(appt.id)} disabled={appt.status !== 'Confirmed'}>Check-in</Button>
                                           </div>
                                       )
                                   })
                               ) : (
                                    <div className="text-center py-10 text-muted-foreground">No appointments for today.</div>
                               )}
                           </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="doctors" className="mt-4">
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Doctor Roster</CardTitle>
                             <Dialog open={isAddDoctorDialogOpen} onOpenChange={(isOpen) => {
                                setIsAddDoctorDialogOpen(isOpen);
                                if (!isOpen) { setCurrentFormStep(1); setNewDoctorData(initialDoctorState); }
                            }}>
                                <DialogTrigger asChild>
                                    <Button><UserPlus className="mr-2 h-4 w-4"/> Add Doctor</Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-4xl">
                                <DialogHeader>
                                    <DialogTitle>Add New Doctor</DialogTitle>
                                    <DialogDescription>Step {currentFormStep} of {totalSteps}: Enter doctor's details for verification.</DialogDescription>
                                     <Progress value={(currentFormStep / totalSteps) * 100} className="w-full mt-2" />
                                </DialogHeader>
                                <form onSubmit={handleAddDoctor}>
                                    <div className="py-4 max-h-[70vh] overflow-y-auto pr-6">
                                       {renderAddDoctorForm()}
                                    </div>
                                    <DialogFooter className="pt-6">
                                      {currentFormStep > 1 && <Button type="button" variant="outline" onClick={() => setCurrentFormStep(p => p - 1)}><ArrowLeft className="w-4 h-4 mr-2"/>Previous</Button>}
                                      <Button type="submit" disabled={isSubmitting}>
                                        {isSubmitting ? "Submitting..." : 
                                         currentFormStep === 2 ? 'Send OTP' : 
                                         currentFormStep < totalSteps ? 'Next Step' : "Submit for Verification"
                                        }
                                      </Button>
                                    </DialogFooter>
                                </form>
                                </DialogContent>
                            </Dialog>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Doctor</TableHead>
                                        <TableHead>Specialization</TableHead>
                                        <TableHead>Contact</TableHead>
                                        <TableHead>Availability</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                   {isLoading ? (
                                     Array.from({ length: 3 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                                            <TableCell className="text-right"><Skeleton className="h-8 w-8 rounded-full ml-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                   ) : doctors.length > 0 ? (
                                     doctors.map(doctor => (
                                        <TableRow key={doctor.id}>
                                            <TableCell className="font-medium">Dr. {doctor.name}</TableCell>
                                            <TableCell><Badge variant="secondary">{doctor.specialization}</Badge></TableCell>
                                            <TableCell>{doctor.phone}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Switch checked={doctor.isAvailable} onCheckedChange={(c) => handleToggleAvailability(doctor.id, c)} />
                                                    <span className={cn('text-xs font-semibold', doctor.isAvailable ? 'text-green-600' : 'text-muted-foreground')}>{doctor.isAvailable ? 'Online' : 'Offline'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                 <AlertDialog>
                                                     <DropdownMenu>
                                                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                        <DropdownMenuContent>
                                                            <AlertDialogTrigger asChild>
                                                                <DropdownMenuItem className="text-destructive" onSelect={(e) => e.preventDefault()}>
                                                                    <Trash2 className="mr-2 h-4 w-4"/> Remove
                                                                </DropdownMenuItem>
                                                            </AlertDialogTrigger>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                     <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                            <AlertDialogDescription>This will permanently remove Dr. {doctor.name} from your roster.</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDeleteDoctor(doctor.id, doctor.name)} className="bg-destructive hover:bg-destructive/90">Yes, Remove</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                 </AlertDialog>
                                            </TableCell>
                                        </TableRow>
                                     ))
                                   ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24">No doctors on roster.</TableCell>
                                    </TableRow>
                                   )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
             <AlertDialog open={isCredsDialogOpen} onOpenChange={(isOpen) => { if(!isOpen) setGeneratedCreds(null); setIsCredsDialogOpen(isOpen); }}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>{generatedCreds?.role || 'Staff'} Added!</AlertDialogTitle><AlertDialogDescription>Share these credentials with the new staff member.</AlertDialogDescription></AlertDialogHeader>
                    <div className="space-y-4 my-4">
                        <div className="space-y-1"><Label htmlFor="partnerId">Partner ID</Label><Input id="partnerId" value={generatedCreds?.id ?? ''} readOnly /></div>
                        <div className="space-y-1"><Label htmlFor="tempPass">Temporary Password</Label><Input id="tempPass" value={generatedCreds?.pass ?? ''} readOnly /></div>
                    </div>
                    <AlertDialogFooter><AlertDialogAction onClick={() => { setGeneratedCreds(null); setIsCredsDialogOpen(false); }}>Close</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default ClinicDashboard;

