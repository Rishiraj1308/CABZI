
'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Stethoscope, UserPlus, MoreHorizontal, Trash2, BadgeCheck, Clock, Briefcase, Calendar, IndianRupee, Phone, Check, Settings, X, User as UserIcon, FileText as FileTextIcon, Download, GraduationCap, Building, Shield, CircleUser, PhoneCall, Mail, Cake, VenetianSofa, AlertTriangle } from 'lucide-react'
import { useDb } from '@/firebase/client-provider'
import { collection, query, onSnapshot, addDoc, doc, deleteDoc, serverTimestamp, Timestamp, orderBy, writeBatch, getDocs, where, updateDoc, setDoc } from 'firebase/firestore'
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarPicker } from '@/components/ui/calendar'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'


interface Doctor {
  id: string;
  name: string;
  specialization: string;
  qualifications?: string;
  experience?: string;
  phone: string;
  createdAt: Timestamp;
  photoUrl?: string;
  degreeUrl?: string;
  licenseUrl?: string;
  docStatus?: 'Verified' | 'Pending' | 'Awaiting Final Approval' | 'Rejected';
  partnerId?: string; 
  password?: string; 
  consultationFee?: number;
}

interface Appointment {
  id: string;
  patientName: string;
  patientPhone: string;
  department: string;
  doctorName: string;
  appointmentDate: string;
  appointmentTime: string;
  status: 'Confirmed' | 'Pending' | 'In Queue' | 'Cancelled';
  isRecurring?: boolean;
}

const mockAppointments: Appointment[] = [
  { id: 'APP001', patientName: 'Priya Singh', patientPhone: '9876543210', department: 'Cardiology', doctorName: 'Dr. Ramesh Sharma', appointmentDate: '2024-09-10', appointmentTime: '11:00 AM', status: 'Pending', isRecurring: true },
  { id: 'APP002', patientName: 'Rajesh Verma', patientPhone: '9988776655', department: 'Orthopedics', doctorName: 'Dr. Priya Gupta', appointmentDate: '2024-09-10', appointmentTime: '02:00 PM', status: 'Confirmed' },
  { id: 'APP003', patientName: 'Anita Desai', patientPhone: '9123456789', department: 'General Physician', doctorName: 'Dr. Alok Verma', appointmentDate: '2024-09-11', appointmentTime: '10:00 AM', status: 'Pending' },
];

const mockSchedule = {
    'Dr. Ramesh Sharma': {
        '09:00': { patient: 'Anjali Mehra', status: 'Confirmed' },
        '11:00': { patient: 'Priya Singh', status: 'Pending' },
        '14:00': { patient: 'Vikram Rathore', status: 'Confirmed' },
    },
    'Dr. Priya Gupta': {
        '10:00': { patient: 'Suresh Raina', status: 'Confirmed' },
        '14:00': { patient: 'Rajesh Verma', status: 'Confirmed' },
    },
     'Dr. Alok Verma': {
        '10:00': { patient: 'Anita Desai', status: 'Pending' },
        '11:00': null, // Available slot
        '12:00': { patient: 'Karan Malhotra', status: 'Confirmed' },
    },
};

const timeSlots = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00'];


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
    photoUpload: null as File | null,
    degreeUpload: null as File | null,
    licenseUpload: null as File | null,
};

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>(mockAppointments);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddDoctorDialogOpen, setIsAddDoctorDialogOpen] = useState(false);
  const [generatedCreds, setGeneratedCreds] = useState<{ id: string; pass: string; role: string } | null>(null);
  const [isCredsDialogOpen, setIsCredsDialogOpen] = useState(false);
  const [isManageAppointmentOpen, setIsManageAppointmentOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [newDate, setNewDate] = useState<Date | undefined>(new Date());
  const [newTime, setNewTime] = useState('');
  const { toast } = useToast();
  const db = useDb();
  const [hospitalId, setHospitalId] = useState<string | null>(null);
  const [selectedDoctorForVerification, setSelectedDoctorForVerification] = useState<Doctor | null>(null);

  // Unified state for the new doctor form
  const [newDoctorData, setNewDoctorData] = useState(initialDoctorState);

  const handleFormChange = (field: keyof typeof newDoctorData, value: any) => {
    setNewDoctorData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (field: 'photoUpload' | 'degreeUpload' | 'licenseUpload', file: File | null) => {
    if (file) {
      handleFormChange(field, file);
    }
  };


  useEffect(() => {
    if (db) {
      const session = localStorage.getItem('cabzi-cure-session');
      if (session) {
        const { partnerId } = JSON.parse(session);
        setHospitalId(partnerId);
        const doctorsRef = query(collection(db, `ambulances/${partnerId}/doctors`), orderBy('name', 'asc'));
        const unsubscribe = onSnapshot(doctorsRef, (snapshot) => {
          setDoctors(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Doctor)));
          setIsLoading(false);
        }, (error) => {
          console.error("Error fetching doctors:", error);
          toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch doctor list.' });
          setIsLoading(false);
        });
        return () => unsubscribe();
      } else {
        setIsLoading(false);
      }
    }
  }, [db, toast]);
  
  const handleAppointmentAction = (appt: Appointment, action: 'confirm' | 'check-in' | 'cancel' | 'reschedule') => {
      if (action === 'cancel') {
          setAppointments(prev => prev.map(a => a.id === appt.id ? {...a, status: 'Cancelled'} : a));
          toast({ variant: 'destructive', title: 'Appointment Cancelled', description: `Appointment for ${appt.patientName} has been cancelled.`});
      } else if (action === 'confirm') {
          setAppointments(prev => prev.map(a => a.id === appt.id ? {...a, status: 'Confirmed'} : a));
          toast({ title: 'Appointment Confirmed', description: `Appointment for ${appt.patientName} has been confirmed.`});
      } else if (action === 'check-in') {
          setAppointments(prev => prev.map(a => a.id === appt.id ? {...a, status: 'In Queue'} : a));
          toast({ title: 'Patient Checked In', description: `${appt.patientName} is now in the queue.`});
      }
      setIsManageAppointmentOpen(false);
  }

  const handleRescheduleSubmit = () => {
    if (!selectedAppointment || !newDate || !newTime) {
      toast({ variant: 'destructive', title: 'Incomplete', description: 'Please select a new date and time.'});
      return;
    }
    const newDateTime = new Date(newDate);
    const [hours, minutes] = newTime.split(/[: ]/);
    newDateTime.setHours(newTime.includes('PM') ? parseInt(hours, 10) + 12 : parseInt(minutes, 10), parseInt(minutes, 10), 0);

    setAppointments(prev => prev.map(a => 
      a.id === selectedAppointment.id 
      ? { ...a, appointmentDate: newDateTime.toISOString().split('T')[0], appointmentTime: newTime, status: 'Confirmed' } 
      : a
    ));
    
    toast({ title: 'Appointment Rescheduled', description: `Appointment for ${selectedAppointment.patientName} is now on ${format(newDateTime, 'PPP')} at ${newTime}.` });
    setIsManageAppointmentOpen(false);
  }


 const handleAddDoctor = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!db || !hospitalId) return;
    setIsSubmitting(true);

    const {
        fullName: name,
        contactNumber: phone,
        emailAddress: email,
        gender,
        dob,
        specialization,
        qualifications,
        experience,
        department,
        designation,
        medicalRegNo,
        regCouncil,
        regYear,
        consultationFee,
        photoUpload,
        degreeUpload,
        licenseUpload
    } = newDoctorData;

    if (!name || !phone || !email || !specialization || !qualifications || !experience || !medicalRegNo || !regCouncil || !regYear || !consultationFee) {
        toast({ variant: 'destructive', title: 'Missing Required Fields', description: 'Please fill out all required fields in the form.' });
        setIsSubmitting(false);
        return;
    }

    const partnerId = `CZD-${phone.slice(-4)}${name.split(' ')[0].slice(0, 2).toUpperCase()}`;
    const password = `cAbZ@${Math.floor(1000 + Math.random() * 9000)}`;

    try {
        const storage = getStorage();
        const doctorDocRef = doc(collection(db, `ambulances/${hospitalId}/doctors`));
        
        // Create the document first with textual data
        await setDoc(doctorDocRef, {
            name, phone, email, gender, dob,
            specialization, qualifications, experience, department, designation,
            medicalRegNo, regCouncil, regYear,
            consultationFee: parseFloat(consultationFee),
            docStatus: 'Pending',
            partnerId, password,
            createdAt: serverTimestamp(),
            // Set placeholder URLs, will be updated after upload
            photoUrl: 'pending_upload',
            degreeUrl: 'pending_upload',
            licenseUrl: 'pending_upload',
        });

        // Now, upload files and update the document with the real URLs
        let photoUrl = '';
        if (photoUpload) {
            const photoStorageRef = ref(storage, `doctors/${hospitalId}/${doctorDocRef.id}/photo.jpg`);
            await uploadBytes(photoStorageRef, photoUpload);
            photoUrl = await getDownloadURL(photoStorageRef);
        }
        let degreeUrl = '';
        if (degreeUpload) {
            const degreeStorageRef = ref(storage, `doctors/${hospitalId}/${doctorDocRef.id}/degree.pdf`);
            await uploadBytes(degreeStorageRef, degreeUpload);
            degreeUrl = await getDownloadURL(degreeStorageRef);
        }
        let licenseUrl = '';
        if (licenseUpload) {
            const licenseStorageRef = ref(storage, `doctors/${hospitalId}/${doctorDocRef.id}/license.pdf`);
            await uploadBytes(licenseStorageRef, licenseUpload);
            licenseUrl = await getDownloadURL(licenseStorageRef);
        }

        // Update doc with actual file URLs
        await updateDoc(doctorDocRef, { 
            photoUrl: photoUrl || '',
            degreeUrl: degreeUrl || '',
            licenseUrl: licenseUrl || ''
        });

        toast({ title: 'Doctor Added', description: `Dr. ${name} has been added. Their credentials are now available.` });
        setIsAddDoctorDialogOpen(false);
        setGeneratedCreds({ id: partnerId, pass: password, role: 'Doctor' });
        setIsCredsDialogOpen(true);
        setNewDoctorData(initialDoctorState); // Reset form state

    } catch (error) {
        console.error('Error adding doctor:', error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not add doctor. Check console for details.' });
    } finally {
        setIsSubmitting(false);
    }
};

  const handleDeleteDoctor = async (doctorId: string, doctorName: string) => {
    if (!db || !hospitalId) return;
    const doctorRef = doc(db, `ambulances/${hospitalId}/doctors`, doctorId);
    try {
      await deleteDoc(doctorRef);
      toast({ variant: 'destructive', title: 'Doctor Removed', description: `Dr. ${doctorName} has been removed from the roster.` });
    } catch (error) {
       toast({ variant: 'destructive', title: 'Error', description: 'Could not remove the doctor.' });
    }
  };
  
  const handleVerifyDoctor = async () => {
    if (!selectedDoctorForVerification || !db || !hospitalId) return;
    
    const doctorRef = doc(db, `ambulances/${hospitalId}/doctors`, selectedDoctorForVerification.id);
    try {
        await updateDoc(doctorRef, {
            docStatus: 'Awaiting Final Approval'
        });
        toast({ title: 'Submitted for Final Approval', description: `Dr. ${selectedDoctorForVerification.name}'s profile has been sent to Cabzi for final verification.`, className: 'bg-blue-600 border-blue-600 text-white' });
        setSelectedDoctorForVerification(null);
    } catch (error) {
        console.error('Error submitting for verification:', error);
        toast({ variant: 'destructive', title: 'Submission Failed' });
    }
  }
  
  const getDoctorStatusBadge = (status?: 'Verified' | 'Pending' | 'Awaiting Final Approval' | 'Rejected') => {
      switch (status) {
          case 'Verified':
              return <Badge className="bg-green-100 text-green-800"><BadgeCheck className="w-3 h-3 mr-1"/>Verified</Badge>;
          case 'Pending':
              return <Badge variant="destructive" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1"/>Pending Docs</Badge>;
          case 'Awaiting Final Approval':
              return <Badge className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1"/>Awaiting Approval</Badge>;
          case 'Rejected':
              return <Badge variant="destructive"><X className="w-3 h-3 mr-1"/>Rejected</Badge>;
          default:
              return <Badge variant="secondary">Unknown</Badge>;
      }
  }

  return (
    <div className="space-y-6">
        <Tabs defaultValue="appointments">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="appointments">Appointment Queue</TabsTrigger>
                <TabsTrigger value="schedules">Doctor Schedules</TabsTrigger>
                <TabsTrigger value="doctors">Manage Roster</TabsTrigger>
            </TabsList>
            <TabsContent value="appointments" className="mt-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Appointment Queue</CardTitle>
                        <CardDescription>Manage incoming patient appointments and check-ins.</CardDescription>
                    </CardHeader>
                     <CardContent>
                        {appointments.map(appt => (
                             <Card key={appt.id} className="mb-2">
                                 <CardContent className="p-3 flex items-center gap-3">
                                    <Avatar className="h-10 w-10"><AvatarFallback>{appt.patientName.substring(0,1)}</AvatarFallback></Avatar>
                                     <div className="flex-1">
                                         <p className="font-semibold">{appt.patientName}</p>
                                         <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Phone className="w-3 h-3"/> {appt.patientPhone}</p>
                                         <p className="text-xs">{appt.appointmentDate} at {appt.appointmentTime}</p>
                                     </div>
                                     <div className="flex flex-col items-end gap-1">
                                       {appt.status === 'Pending' && <Button size="sm" onClick={() => handleAppointmentAction(appt, 'confirm')}>Confirm</Button>}
                                       {appt.status === 'Confirmed' && <Button size="sm" variant="secondary" onClick={() => handleAppointmentAction(appt, 'check-in')}>Check-in Patient</Button>}
                                       {appt.status === 'In Queue' && <Badge className="bg-blue-100 text-blue-800">In Queue</Badge>}
                                       {appt.status === 'Cancelled' && <Badge variant="destructive">Cancelled</Badge>}
                                    </div>
                                     <Dialog open={isManageAppointmentOpen && selectedAppointment?.id === appt.id} onOpenChange={(open) => {
                                        if (!open) {
                                            setIsManageAppointmentOpen(false);
                                            setSelectedAppointment(null);
                                        }
                                     }}>
                                        <DialogTrigger asChild>
                                           <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {setIsManageAppointmentOpen(true); setSelectedAppointment(appt);}}>
                                                <Settings className="w-4 h-4"/>
                                           </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Manage: {selectedAppointment?.patientName}</DialogTitle>
                                                <DialogDescription>
                                                    View details, reschedule, or cancel the appointment.
                                                </DialogDescription>
                                            </DialogHeader>
                                            
                                            <div className="border-t pt-4">
                                                <h4 className="font-semibold mb-2">Patient Details</h4>
                                                <div className="space-y-2 text-sm p-3 bg-muted rounded-lg">
                                                    <div className="flex justify-between"><span>Contact:</span><span className="font-semibold">{selectedAppointment?.patientPhone}</span></div>
                                                    <div className="flex justify-between"><span>Doctor:</span><span className="font-semibold">{selectedAppointment?.doctorName}</span></div>
                                                    <div className="flex justify-between items-center"><span>Status:</span><Badge variant={selectedAppointment?.status === 'Confirmed' ? 'default' : 'secondary'} className={cn(selectedAppointment?.status === 'Confirmed' && 'bg-blue-100 text-blue-800')}>{selectedAppointment?.status}</Badge></div>
                                                 </div>
                                                 <div className="mt-2">
                                                    <h5 className="text-sm font-semibold">Visit History:</h5>
                                                    <p className="text-xs text-muted-foreground text-center py-2">No past visits recorded.</p>
                                                 </div>
                                            </div>

                                            <div className="border-t pt-4">
                                                <h4 className="font-semibold">Reschedule Appointment</h4>
                                                <div className="space-y-2 mt-2">
                                                    <Label>Select New Date</Label>
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                        <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !newDate && "text-muted-foreground")}>
                                                            <Calendar className="mr-2 h-4 w-4" />
                                                            {newDate ? format(newDate, "PPP") : <span>Pick a date</span>}
                                                        </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0"><CalendarPicker mode="single" selected={newDate} onSelect={setNewDate} initialFocus/></PopoverContent>
                                                    </Popover>
                                                </div>
                                                <div className="space-y-2 mt-2">
                                                    <Label>Select New Time</Label>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {timeSlots.map(slot => (<Button key={slot} variant={newTime === slot ? 'default' : 'outline'} onClick={() => setNewTime(slot)}>{slot}</Button>))}
                                                    </div>
                                                </div>
                                                <Button className="w-full mt-4" onClick={handleRescheduleSubmit}>Confirm Reschedule</Button>
                                            </div>
                                            <DialogFooter className="border-t pt-4">
                                                 <AlertDialog>
                                                     <AlertDialogTrigger asChild>
                                                        <Button variant="destructive" className="w-full">Cancel Appointment</Button>
                                                    </AlertDialogTrigger>
                                                     <AlertDialogContent>
                                                        <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will cancel the appointment for {selectedAppointment?.patientName}.</AlertDialogDescription></AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Go Back</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => selectedAppointment && handleAppointmentAction(selectedAppointment, 'cancel')} className="bg-destructive hover:bg-destructive/90">Yes, Cancel</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                 </AlertDialog>
                                            </DialogFooter>
                                        </DialogContent>
                                     </Dialog>
                                 </CardContent>
                             </Card>
                        ))}
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="schedules" className="mt-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Weekly Doctor Schedules</CardTitle>
                        <CardDescription>An overview of all doctor availability and booked slots for the current week.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="min-w-[200px]">Doctor</TableHead>
                                        {timeSlots.map(slot => <TableHead key={slot} className="text-center">{slot}</TableHead>)}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        Array.from({length: 3}).map((_, i) => (
                                             <TableRow key={i}>
                                                <TableCell><Skeleton className="h-5 w-32"/></TableCell>
                                                {timeSlots.map(slot => <TableCell key={slot}><Skeleton className="h-10 w-full"/></TableCell>)}
                                            </TableRow>
                                        ))
                                    ) : doctors.length > 0 ? (
                                        doctors.map(doctor => (
                                            <TableRow key={doctor.id}>
                                                <TableCell className="font-semibold">
                                                    <div>Dr. {doctor.name}</div>
                                                    <div className="text-xs text-muted-foreground font-normal">{doctor.specialization}</div>
                                                </TableCell>
                                                {timeSlots.map(slot => {
                                                    // @ts-ignore
                                                    const appointment = mockSchedule[doctor.name]?.[slot];
                                                    return (
                                                        <TableCell key={slot}>
                                                            {appointment ? (
                                                                <Card className="p-2 text-xs text-center bg-muted">
                                                                    <p className="font-semibold truncate">{appointment.patient}</p>
                                                                    <Badge variant={appointment.status === 'Confirmed' ? 'default' : 'secondary'} className={appointment.status === 'Confirmed' ? 'bg-green-100 text-green-800' : ''}>{appointment.status}</Badge>
                                                                </Card>
                                                            ) : (
                                                                <div className="h-12 w-full flex items-center justify-center text-green-600">
                                                                    <div className="w-2 h-2 rounded-full bg-current"></div>
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                    )
                                                })}
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={timeSlots.length + 1} className="text-center h-24">No doctors on the roster.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="doctors" className="mt-4">
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2"><Stethoscope className="w-6 h-6 text-primary"/> Doctor Roster</CardTitle>
                        <CardDescription>Add, view, and manage the doctors and specialists at your facility.</CardDescription>
                      </div>
                      <Dialog open={isAddDoctorDialogOpen} onOpenChange={setIsAddDoctorDialogOpen}>
                        <DialogTrigger asChild>
                          <Button><UserPlus className="mr-2 h-4 w-4" /> Add Doctor</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl">
                          <DialogHeader>
                            <DialogTitle>Add New Doctor</DialogTitle>
                            <DialogDescription>Enter the details for the new doctor to add them to your hospital's roster.</DialogDescription>
                          </DialogHeader>
                          <form onSubmit={handleAddDoctor}>
                              <Tabs defaultValue="basic" className="pt-4">
                                <TabsList className="grid w-full grid-cols-4">
                                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                                  <TabsTrigger value="professional">Professional</TabsTrigger>
                                  <TabsTrigger value="verification">Verification</TabsTrigger>
                                  <TabsTrigger value="consultation">Consultation</TabsTrigger>
                                </TabsList>
                                <div className="py-6 min-h-[350px]">
                                    <TabsContent value="basic">
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2"><Label htmlFor="fullName">Full Name</Label><Input name="fullName" required value={newDoctorData.fullName} onChange={e => handleFormChange('fullName', e.target.value)} /></div>
                                        <div className="space-y-2"><Label>Gender</Label><Select name="gender" required onValueChange={v => handleFormChange('gender', v)} value={newDoctorData.gender}><SelectTrigger><SelectValue placeholder="Select Gender"/></SelectTrigger><SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
                                        <div className="space-y-2"><Label htmlFor="dob">Date of Birth</Label><Input name="dob" type="date" required value={newDoctorData.dob} onChange={e => handleFormChange('dob', e.target.value)} /></div>
                                        <div className="space-y-2">
                                            <Label htmlFor="contactNumber">Contact Number</Label>
                                            <div className="flex items-center gap-0 rounded-md border border-input focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                                                <span className="pl-3 text-muted-foreground text-sm">+91</span>
                                                <Input id="contactNumber" name="contactNumber" type="tel" maxLength={10} placeholder="12345 67890" required value={newDoctorData.contactNumber} onChange={e => handleFormChange('contactNumber', e.target.value)} className="border-0 h-9 focus-visible:ring-0 focus-visible:ring-offset-0 flex-1"/>
                                            </div>
                                        </div>
                                        <div className="md:col-span-2 space-y-2"><Label htmlFor="emailAddress">Email Address</Label><Input name="emailAddress" type="email" required value={newDoctorData.emailAddress} onChange={e => handleFormChange('emailAddress', e.target.value)} /></div>
                                        <div className="space-y-2 md:col-span-2"><Label htmlFor="photoUpload">Passport-size Photo</Label><Input name="photoUpload" type="file" onChange={e => handleFileChange('photoUpload', e.target.files ? e.target.files[0] : null)} /></div>
                                      </div>
                                    </TabsContent>
                                    <TabsContent value="professional">
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          <div className="space-y-2"><Label>Specialization</Label><Select name="specialization" required onValueChange={v => handleFormChange('specialization', v)} value={newDoctorData.specialization}><SelectTrigger><SelectValue placeholder="Select Specialization"/></SelectTrigger><SelectContent>{doctorSpecializations.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
                                          <div className="space-y-2"><Label>Qualifications</Label><Input name="qualifications" placeholder="MBBS, MD" required value={newDoctorData.qualifications} onChange={e => handleFormChange('qualifications', e.target.value)} /></div>
                                          <div className="space-y-2"><Label>Experience (years)</Label><Input name="experience" type="number" required value={newDoctorData.experience} onChange={e => handleFormChange('experience', e.target.value)} /></div>
                                          <div className="space-y-2"><Label>Department</Label><Input name="department" placeholder="e.g., Pediatrics" value={newDoctorData.department} onChange={e => handleFormChange('department', e.target.value)} /></div>
                                      </div>
                                    </TabsContent>
                                    <TabsContent value="verification">
                                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          <div className="space-y-2"><Label>Medical Registration No.</Label><Input name="medicalRegNo" required value={newDoctorData.medicalRegNo} onChange={e => handleFormChange('medicalRegNo', e.target.value)} /></div>
                                          <div className="space-y-2"><Label>Registration Council</Label><Input name="regCouncil" placeholder="e.g., Delhi Medical Council" required value={newDoctorData.regCouncil} onChange={e => handleFormChange('regCouncil', e.target.value)} /></div>
                                          <div className="space-y-2"><Label>Registration Year</Label><Input name="regYear" type="number" required value={newDoctorData.regYear} onChange={e => handleFormChange('regYear', e.target.value)} /></div>
                                          <div className="space-y-2"><Label>Medical License Upload</Label><Input name="licenseUpload" type="file" onChange={e => handleFileChange('licenseUpload', e.target.files ? e.target.files[0] : null)} /></div>
                                          <div className="md:col-span-2 space-y-2"><Label>Degree Certificate Upload</Label><Input name="degreeUpload" type="file" onChange={e => handleFileChange('degreeUpload', e.target.files ? e.target.files[0] : null)} /></div>
                                       </div>
                                    </TabsContent>
                                     <TabsContent value="consultation">
                                        <div className="space-y-4">
                                            <div className="space-y-2"><Label>Consultation Fee (INR)</Label><Input name="consultationFee" type="number" placeholder="e.g., 800" required value={newDoctorData.consultationFee} onChange={e => handleFormChange('consultationFee', e.target.value)} /></div>
                                        </div>
                                    </TabsContent>
                                </div>
                              </Tabs>
                            <DialogFooter>
                              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Adding..." : "Add Doctor to Roster"}</Button>
                            </DialogFooter>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Doctor Name</TableHead>
                            <TableHead>Specialization</TableHead>
                            <TableHead>Fee</TableHead>
                            <TableHead>Verification Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {isLoading ? (
                            Array.from({ length: 3 }).map((_, i) => (
                              <TableRow key={i}>
                                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                 <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                              </TableRow>
                            ))
                          ) : doctors.length > 0 ? (
                            doctors.map((doctor) => (
                              <TableRow key={doctor.id}>
                                <TableCell>
                                    <div className="font-medium">Dr. {doctor.name}</div>
                                    <div className="text-xs text-muted-foreground">{doctor.qualifications || 'N/A'}</div>
                                </TableCell>
                                <TableCell><Badge variant="secondary">{doctor.specialization}</Badge></TableCell>
                                <TableCell className="font-semibold">₹{doctor.consultationFee?.toLocaleString() || 'N/A'}</TableCell>
                                <TableCell>
                                   {getDoctorStatusBadge(doctor.docStatus)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Dialog onOpenChange={(open) => !open && setSelectedDoctorForVerification(null)}>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4"/></Button></DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                         <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                         {doctor.docStatus === 'Pending' && (
                                            <DialogTrigger asChild>
                                                <DropdownMenuItem onSelect={() => setSelectedDoctorForVerification(doctor)}>
                                                    <Check className="mr-2 h-4 w-4 text-green-500" /> Verify Documents
                                                </DropdownMenuItem>
                                            </DialogTrigger>
                                         )}
                                          {doctor.docStatus === 'Awaiting Final Approval' && (
                                                <DropdownMenuItem disabled>
                                                    <Clock className="mr-2 h-4 w-4 text-blue-500" /> Pending Cabzi Approval
                                                </DropdownMenuItem>
                                         )}
                                         <AlertDialog>
                                             <AlertDialogTrigger asChild>
                                                <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={(e) => e.preventDefault()}><Trash2 className="mr-2 h-4 w-4"/>Remove</DropdownMenuItem>
                                             </AlertDialogTrigger>
                                              <AlertDialogContent>
                                                <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently remove Dr. {doctor.name} from your roster.</AlertDialogDescription></AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteDoctor(doctor.id, doctor.name)} className="bg-destructive hover:bg-destructive/90">Yes, remove</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                         </AlertDialog>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Verify Doctor: Dr. {selectedDoctorForVerification?.name}</DialogTitle>
                                            <DialogDescription>Review the uploaded documents and confirm their authenticity. This will send the profile to Cabzi for final approval.</DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4 py-4">
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button 
                                                            asChild 
                                                            variant={!selectedDoctorForVerification?.photoUrl || selectedDoctorForVerification?.photoUrl === 'pending_upload' ? 'destructive' : 'outline'}
                                                            className="w-full justify-start gap-2"
                                                        >
                                                            <a href={selectedDoctorForVerification?.photoUrl} target="_blank" rel="noopener noreferrer">
                                                                {!selectedDoctorForVerification?.photoUrl || selectedDoctorForVerification?.photoUrl === 'pending_upload' ? <AlertTriangle className="w-4 h-4"/> : <Download className="w-4 h-4"/>}
                                                                Passport Photo
                                                            </a>
                                                        </Button>
                                                    </TooltipTrigger>
                                                    {(!selectedDoctorForVerification?.photoUrl || selectedDoctorForVerification?.photoUrl === 'pending_upload') && <TooltipContent><p>Document not uploaded yet.</p></TooltipContent>}
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button 
                                                            asChild 
                                                            variant={!selectedDoctorForVerification?.degreeUrl || selectedDoctorForVerification?.degreeUrl === 'pending_upload' ? 'destructive' : 'outline'}
                                                            className="w-full justify-start gap-2"
                                                        >
                                                            <a href={selectedDoctorForVerification?.degreeUrl} target="_blank" rel="noopener noreferrer">
                                                                {!selectedDoctorForVerification?.degreeUrl || selectedDoctorForVerification?.degreeUrl === 'pending_upload' ? <AlertTriangle className="w-4 h-4"/> : <Download className="w-4 h-4"/>}
                                                                Qualification Degree
                                                            </a>
                                                        </Button>
                                                    </TooltipTrigger>
                                                     {(!selectedDoctorForVerification?.degreeUrl || selectedDoctorForVerification?.degreeUrl === 'pending_upload') && <TooltipContent><p>Document not uploaded yet.</p></TooltipContent>}
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                         <Button 
                                                            asChild 
                                                            variant={!selectedDoctorForVerification?.licenseUrl || selectedDoctorForVerification?.licenseUrl === 'pending_upload' ? 'destructive' : 'outline'}
                                                            className="w-full justify-start gap-2"
                                                         >
                                                             <a href={selectedDoctorForVerification?.licenseUrl} target="_blank" rel="noopener noreferrer">
                                                                {!selectedDoctorForVerification?.licenseUrl || selectedDoctorForVerification?.licenseUrl === 'pending_upload' ? <AlertTriangle className="w-4 h-4"/> : <Download className="w-4 h-4"/>}
                                                                Medical License
                                                             </a>
                                                        </Button>
                                                    </TooltipTrigger>
                                                     {(!selectedDoctorForVerification?.licenseUrl || selectedDoctorForVerification?.licenseUrl === 'pending_upload') && <TooltipContent><p>Document not uploaded yet.</p></TooltipContent>}
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>
                                         <DialogFooter>
                                            <Button variant="secondary" onClick={() => setSelectedDoctorForVerification(null)}>Cancel</Button>
                                            <Button onClick={handleVerifyDoctor}>Submit for Final Approval</Button>
                                        </DialogFooter>
                                    </DialogContent>
                                  </Dialog>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center h-24">No doctors have been added yet.</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
      
       <AlertDialog open={isCredsDialogOpen} onOpenChange={(isOpen) => {
          if(!isOpen) setGeneratedCreds(null);
          setIsCredsDialogOpen(isOpen);
      }}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>{generatedCreds?.role || 'Staff'} Added!</AlertDialogTitle>
                  <AlertDialogDescription>Share these credentials with the new staff member. They will be prompted to change their password on first login.</AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-4 my-4">
                  <div className="space-y-1"><Label htmlFor="partnerId">Partner ID</Label><Input id="partnerId" value={generatedCreds?.id ?? ''} readOnly /></div>
                  <div className="space-y-1"><Label htmlFor="tempPass">Temporary Password</Label><Input id="tempPass" value={generatedCreds?.pass ?? ''} readOnly /></div>
              </div>
              <AlertDialogFooter>
                  <Button variant="outline" onClick={() => {
                      navigator.clipboard.writeText(`ID: ${generatedCreds?.id}\nPass: ${generatedCreds?.pass}`);
                      toast({ title: 'Copied!' });
                  }}>Copy</Button>
                  <AlertDialogAction onClick={() => { setGeneratedCreds(null); setIsCredsDialogOpen(false); }}>Close</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
