
'use client'

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Stethoscope, Calendar, Users, BarChart, FileText, Clock, UserCheck, UserPlus, MoreHorizontal, Trash2, Phone, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useDb } from '@/firebase/client-provider';
import { collection, query, where, onSnapshot, Timestamp, orderBy, getDocs, doc, updateDoc, deleteDoc, addDoc, serverTimestamp, writeBatch, limit } from 'firebase/firestore';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

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
    const db = useDb();
    const { toast } = useToast();

    const [hospitalId, setHospitalId] = useState<string | null>(null);
    const [hospitalName, setHospitalName] = useState<string | null>(null);
    

    useEffect(() => {
        if (!db) {
            setIsLoading(false);
            return;
        }

        const session = localStorage.getItem('curocity-cure-session');
        if (!session) {
            toast({ variant: 'destructive', title: 'Error', description: 'Session not found. Please log in again.' });
            setIsLoading(false); 
            return;
        };

        const { partnerId, name } = JSON.parse(session);
        setHospitalId(partnerId);
        setHospitalName(name);

        if (!partnerId) {
            toast({ variant: 'destructive', title: 'Error', description: 'Partner ID is missing from session.' });
            setIsLoading(false);
            return;
        }
        
        const todayStart = startOfDay(new Date());
        const todayEnd = endOfDay(new Date());

        const apptQuery = query(
            collection(db, 'appointments'),
            where('hospitalId', '==', partnerId),
            where('appointmentDate', '>=', todayStart),
            where('appointmentDate', '<=', todayEnd),
            orderBy('appointmentDate', 'asc')
        );

        const unsubAppts = onSnapshot(apptQuery, (snapshot) => {
            const apptsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
            setAppointments(apptsData);
        }, (error) => {
            console.error("Error fetching appointments: ", error);
            toast({ variant: 'destructive', title: "Error", description: 'Could not fetch appointments.' });
        });
        
        const doctorsQuery = query(collection(db, `ambulances/${partnerId}/doctors`));
        const unsubDoctors = onSnapshot(doctorsQuery, (snapshot) => {
            const doctorsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Doctor));
            setDoctors(doctorsData);
            setIsLoading(false);
        });

        return () => {
            unsubAppts();
            unsubDoctors();
        };

    }, [db, toast]);
    
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
        if (!db || !hospitalId || !hospitalName) {
            toast({ variant: 'destructive', title: 'Error', description: 'Database or hospital information is missing.' });
            return;
        }
        setIsSubmitting(true);
      
        const { fullName: name, contactNumber: phone, emailAddress: email, ...restOfData } = newDoctorData;
      
        if (!name || !phone || !email || !restOfData.specialization) {
            toast({ variant: 'destructive', title: 'Missing Required Fields' });
            setIsSubmitting(false);
            return;
        }
        
        const globalDoctorsRef = collection(db, 'doctors');

        try {
            const q = query(globalDoctorsRef, where("phone", "==", phone), limit(1));
            const phoneCheckSnapshot = await getDocs(q);

            if (!phoneCheckSnapshot.empty) {
                throw new Error("A doctor with this phone number is already registered.");
            }

            const partnerId = `CZD-${phone.slice(-4)}${name.split(' ')[0].slice(0, 2).toUpperCase()}`;
            const password = `cAbZ@${Math.floor(1000 + Math.random() * 9000)}`;
            
            const batch = writeBatch(db);
            
            // 1. Create record in the hospital's private subcollection
            const hospitalDoctorsRef = collection(db, `ambulances/${hospitalId}/doctors`);
            const newDoctorDocRefInHospital = doc(hospitalDoctorsRef);
            const doctorData = { 
                id: newDoctorDocRefInHospital.id, 
                name, phone, email, ...restOfData, 
                partnerId, 
                createdAt: serverTimestamp(), 
                docStatus: 'Pending', 
                hospitalId, hospitalName, 
                isAvailable: false 
            };
            
            batch.set(newDoctorDocRefInHospital, doctorData);

            // 2. Create record in the global 'doctors' collection for login
            const newDoctorDocRefGlobal = doc(globalDoctorsRef, newDoctorDocRefInHospital.id);
            batch.set(newDoctorDocRefGlobal, {
                 id: newDoctorDocRefInHospital.id, 
                 name, phone, email, partnerId, password,
                 hospitalId, hospitalName,
                 createdAt: serverTimestamp(),
                 status: 'pending_verification' // Global status
            });

            await batch.commit();

            setGeneratedCreds({ id: partnerId, pass: password, role: 'Doctor' });
            setIsAddDoctorDialogOpen(false);
            setCurrentFormStep(1);
            setIsCredsDialogOpen(true);
            toast({ title: 'Doctor Record Created!', description: `Dr. ${name}'s credentials are now available.` });
            setNewDoctorData(initialDoctorState);
      
        } catch (error: any) {
            console.error('Error adding doctor:', error);
            toast({ variant: 'destructive', title: 'Error Adding Doctor', description: error.message || 'An unexpected error occurred.' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDeleteDoctor = async (doctorId: string, doctorName: string) => {
        if (!db || !hospitalId) return;
        
        const batch = writeBatch(db);

        // 1. Delete from hospital's subcollection
        const hospitalDoctorRef = doc(db, `ambulances/${hospitalId}/doctors`, doctorId);
        batch.delete(hospitalDoctorRef);

        // 2. Delete from global collection to revoke login
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
        if (!db || !hospitalId) return;
        const doctorRef = doc(db, `ambulances/${hospitalId}/doctors`, doctorId);
        try {
            await updateDoc(doctorRef, { isAvailable });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Update Failed' });
        }
    };

    const handleFormChange = (field: keyof typeof newDoctorData, value: any) => {
        setNewDoctorData(prev => ({ ...prev, [field]: value }));
    };
    
    const queue = useMemo(() => {
        return appointments.filter(a => a.status === 'In Queue').sort((a,b) => a.appointmentDate.seconds - b.appointmentDate.seconds);
    }, [appointments]);


    const renderAddDoctorForm = () => {
        switch(currentFormStep) {
            case 1:
                return (
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold border-b pb-2">Basic Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                            <div className="space-y-2"><Label>Full Name</Label><Input name="fullName" required value={newDoctorData.fullName} onChange={e => handleFormChange('fullName', e.target.value)} /></div>
                            <div className="space-y-2"><Label>Gender</Label><Select name="gender" required onValueChange={v => handleFormChange('gender', v)} value={newDoctorData.gender}><SelectTrigger><SelectValue placeholder="Select Gender"/></SelectTrigger><SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
                            <div className="space-y-2"><Label>Contact Number</Label><div className="flex items-center gap-0 rounded-md border border-input focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"><span className="pl-3 text-muted-foreground text-sm">+91</span><Input id="contactNumber" name="contactNumber" type="tel" maxLength={10} placeholder="12345 67890" required value={newDoctorData.contactNumber} onChange={e => handleFormChange('contactNumber', e.target.value)} className="border-0 h-9 focus-visible:ring-0 focus-visible:ring-offset-0 flex-1"/></div></div>
                            <div className="space-y-2"><Label>Email Address</Label><Input name="emailAddress" type="email" required value={newDoctorData.emailAddress} onChange={e => handleFormChange('emailAddress', e.target.value)} /></div>
                        </div>
                    </div>
                )
            case 2:
                 return (
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold border-b pb-2">Professional Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                            <div className="space-y-2"><Label>Specialization</Label><Select name="specialization" required onValueChange={v => handleFormChange('specialization', v)} value={newDoctorData.specialization}><SelectTrigger><SelectValue placeholder="Select Specialization"/></SelectTrigger><SelectContent>{doctorSpecializations.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
                            <div className="space-y-2"><Label>Qualifications</Label><Input name="qualifications" placeholder="MBBS, MD" required value={newDoctorData.qualifications} onChange={e => handleFormChange('qualifications', e.target.value)} /></div>
                            <div className="space-y-2"><Label>Experience (years)</Label><Input name="experience" type="number" required value={newDoctorData.experience} onChange={e => handleFormChange('experience', e.target.value)} /></div>
                            <div className="space-y-2"><Label>Consultation Fee (INR)</Label><Input name="consultationFee" type="number" placeholder="e.g., 800" required value={newDoctorData.consultationFee} onChange={e => handleFormChange('consultationFee', e.target.value)} /></div>
                        </div>
                    </div>
                 )
        }
    }


    return (
        <div className="space-y-6">
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
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="appointments">Appointment Queue</TabsTrigger>
                    <TabsTrigger value="schedules">Doctor Schedules</TabsTrigger>
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
                 <TabsContent value="schedules" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Doctor Schedules</CardTitle>
                            <CardDescription>View and manage doctor availability for the upcoming week.</CardDescription>
                        </CardHeader>
                        <CardContent className="h-48 flex items-center justify-center">
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Doctor</TableHead>
                                        <TableHead>Availability</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                   {isLoading ? (
                                     Array.from({ length: 3 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                                        </TableRow>
                                    ))
                                   ) : doctors.length > 0 ? (
                                     doctors.map(doctor => (
                                        <TableRow key={doctor.id}>
                                            <TableCell className="font-medium">Dr. {doctor.name}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Switch 
                                                        id={`avail-${doctor.id}`} 
                                                        checked={doctor.isAvailable} 
                                                        onCheckedChange={(checked) => handleToggleAvailability(doctor.id, checked)}
                                                        className="data-[state=checked]:bg-green-500"
                                                    />
                                                    <Label htmlFor={`avail-${doctor.id}`} className={cn("text-xs", doctor.isAvailable ? 'text-green-600' : 'text-muted-foreground')}>
                                                        {doctor.isAvailable ? 'Online' : 'Offline'}
                                                    </Label>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                     ))
                                   ) : (
                                    <TableRow>
                                        <TableCell colSpan={2} className="text-center h-24">No doctors on roster.</TableCell>
                                    </TableRow>
                                   )}
                                </TableBody>
                            </Table>
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
                                    <DialogDescription>Enter the details for the new doctor to add them to your hospital's roster.</DialogDescription>
                                     <Progress value={(currentFormStep / 2) * 100} className="w-full mt-2" />
                                </DialogHeader>
                                <form onSubmit={handleAddDoctor} className="max-h-[80vh] overflow-y-auto pr-6">
                                    <div className="py-4">
                                       {renderAddDoctorForm()}
                                    </div>
                                    <DialogFooter className="pt-6">
                                      {currentFormStep > 1 && <Button type="button" variant="outline" onClick={() => setCurrentFormStep(1)}><ArrowLeft className="w-4 h-4 mr-2"/>Previous</Button>}
                                      {currentFormStep < 2 ? <Button type="button" onClick={() => setCurrentFormStep(2)}>Next Step</Button> : <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Adding..." : "Add Doctor & Generate Credentials"}</Button>}
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
                                            <TableCell className="text-right"><Skeleton className="h-8 w-8 rounded-full ml-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                   ) : doctors.length > 0 ? (
                                     doctors.map(doctor => (
                                        <TableRow key={doctor.id}>
                                            <TableCell className="font-medium">Dr. {doctor.name}</TableCell>
                                            <TableCell><Badge variant="secondary">{doctor.specialization}</Badge></TableCell>
                                            <TableCell>{doctor.phone}</TableCell>
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
                                        <TableCell colSpan={4} className="text-center h-24">No doctors on roster.</TableCell>
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

    