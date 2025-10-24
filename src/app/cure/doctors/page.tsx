
'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Stethoscope, UserPlus, MoreHorizontal, Trash2, BadgeCheck, Clock, Briefcase, Calendar, IndianRupee, Phone, Check, Settings, X, User as UserIcon, FileText as FileTextIcon, Download, GraduationCap, Building, Shield, CircleUser, PhoneCall, Mail, Cake, VenetianSofa, AlertTriangle, UploadCloud } from 'lucide-react'
import { useDb } from '@/firebase/client-provider'
import { collection, query, onSnapshot, addDoc, doc, deleteDoc, serverTimestamp, Timestamp, orderBy, writeBatch, getDocs, where, updateDoc, setDoc, limit, runTransaction } from 'firebase/firestore'
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


interface Doctor {
  id: string;
  name: string;
  specialization: string;
  qualifications?: string;
  experience?: string;
  phone: string;
  createdAt: Timestamp;
  photoUrl?: string;
  docStatus?: 'Verified' | 'Pending' | 'Awaiting Final Approval' | 'Rejected';
  partnerId?: string; 
  password?: string; 
  consultationFee?: number;
  medicalRegNo?: string;
  regCouncil?: string;
  regYear?: string;
  email?: string;
  dob?: string;
  gender?: string;
  department?: string;
  designation?: string;
}

interface Appointment {
  id: string;
  patientName: string;
  patientPhone: string;
  department: string;
  doctorName: string;
  appointmentDate: Timestamp;
  appointmentTime: string;
  status: 'Confirmed' | 'Pending' | 'In Queue' | 'Cancelled' | 'Completed';
  isRecurring?: boolean;
}

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
        '10:00': { patient: 'Anita Desai', status: 'Completed' },
        '11:00': null, // Available slot
        '12:00': { patient: 'Karan Malhotra', status: 'Confirmed' },
    },
};

const timeSlots = ['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'];


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

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
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
  const [newDoctorData, setNewDoctorData] = useState(initialDoctorState);


  const handleFormChange = (field: keyof typeof newDoctorData, value: any) => {
    setNewDoctorData(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    setIsLoading(true);
    if (!db) {
      setIsLoading(false);
      return;
    }
    const session = localStorage.getItem('cabzi-cure-session');
    if (session) {
      const { partnerId } = JSON.parse(session);
      setHospitalId(partnerId);
      const doctorsRef = query(collection(db, `ambulances/${partnerId}/doctors`), orderBy('name', 'asc'));
      const unsubDoctors = onSnapshot(doctorsRef, (snapshot) => {
        setDoctors(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Doctor)));
        setIsLoading(false);
      }, (error) => {
        console.error("Error fetching doctors:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch doctor list.' });
        setIsLoading(false);
      });
      
      const apptQuery = query(collection(db, 'appointments'), where('hospitalId', '==', partnerId));
      const unsubAppts = onSnapshot(apptQuery, (snapshot) => {
        setAppointments(snapshot.docs.map(d => ({id: d.id, ...d.data()} as Appointment)));
      });


      return () => {
        unsubDoctors();
        unsubAppts();
      }
    } else {
      setIsLoading(false);
    }
  }, [db, toast]);
  
  const handleAppointmentAction = async (apptId: string, action: 'confirm' | 'check-in' | 'cancel' | 'complete') => {
      if (!db) return;

      const apptRef = doc(db, 'appointments', apptId);
      let newStatus: Appointment['status'] = 'Pending';
      let toastTitle = '';
      let toastDescription = '';

      switch(action) {
          case 'confirm':
              newStatus = 'Confirmed';
              toastTitle = 'Appointment Confirmed';
              break;
          case 'check-in':
              newStatus = 'In Queue';
              toastTitle = 'Patient Checked In';
              break;
          case 'complete':
              newStatus = 'Completed';
              toastTitle = 'Consultation Marked Complete';
              break;
          case 'cancel':
              newStatus = 'Cancelled';
              toastTitle = 'Appointment Cancelled';
              break;
      }
      
      try {
          await updateDoc(apptRef, { status: newStatus });
          toast({ title: toastTitle, description: toastDescription });
      } catch (error) {
          toast({ variant: 'destructive', title: 'Action Failed' });
      }
      setIsManageAppointmentOpen(false);
  }

  const handleRescheduleSubmit = async () => {
    if (!selectedAppointment || !newDate || !newTime || !db) {
      toast({ variant: 'destructive', title: 'Incomplete', description: 'Please select a new date and time.'});
      return;
    }
    const newDateTime = new Date(newDate);
    const [hours, minutes] = newTime.split(/[: ]/);
    newDateTime.setHours(newTime.includes('PM') ? parseInt(hours, 10) + 12 : parseInt(minutes, 10), parseInt(minutes, 10), 0);

    const apptRef = doc(db, 'appointments', selectedAppointment.id);
    try {
        await updateDoc(apptRef, {
            appointmentDate: newDateTime,
            appointmentTime: newTime,
            status: 'Confirmed'
        });
        toast({ title: 'Appointment Rescheduled!', description: `Appointment for ${selectedAppointment.patientName} is now on ${format(newDateTime, 'PPP')} at ${newTime}.` });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Reschedule Failed' });
    }
    
    setIsManageAppointmentOpen(false);
  }
  
const handleAddDoctor = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!db || !hospitalId) {
        toast({ variant: 'destructive', title: 'Error', description: 'Database or hospital information is missing.' });
        return;
    }
    setIsSubmitting(true);
  
    const {
        fullName: name, contactNumber: phone, emailAddress: email, gender, dob,
        specialization, qualifications, experience, department, designation,
        medicalRegNo, regCouncil, regYear, consultationFee
    } = newDoctorData;
  
    if (!name || !phone || !email || !specialization || !qualifications || !experience || !medicalRegNo || !regCouncil || !regYear || !consultationFee) {
        toast({ variant: 'destructive', title: 'Missing Required Fields', description: 'Please fill out all required fields.' });
        setIsSubmitting(false);
        return;
    }
    
    const hospitalDoctorsRef = collection(db, `ambulances/${hospitalId}/doctors`);

    try {
        const q = query(hospitalDoctorsRef, where("phone", "==", phone), limit(1));
        const phoneCheckSnapshot = await getDocs(q);

        if (!phoneCheckSnapshot.empty) {
            throw new Error("A doctor with this phone number is already registered in your hospital.");
        }

        const partnerId = `CZD-${phone.slice(-4)}${name.split(' ')[0].slice(0, 2).toUpperCase()}`;
        const password = `cAbZ@${Math.floor(1000 + Math.random() * 9000)}`;
        
        const newDoctorDocRef = doc(hospitalDoctorsRef);
        
        const doctorData = {
            id: newDoctorDocRef.id,
            name, phone, email, gender, dob, specialization, qualifications, experience, department,
            designation, medicalRegNo, regCouncil, regYear, consultationFee: parseFloat(consultationFee),
            docStatus: 'Pending' as const, 
            partnerId,
            password,
            createdAt: serverTimestamp(),
            photoUrl: '', // Default empty photo URL
        };
        
        await setDoc(newDoctorDocRef, doctorData);

        setGeneratedCreds({ id: partnerId, pass: password, role: 'Doctor' });
        setIsAddDoctorDialogOpen(false);
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
  
  const getAppointmentStatusBadge = (status: Appointment['status']) => {
    switch(status) {
        case 'Confirmed': return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">{status}</Badge>;
        case 'In Queue': return <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200">{status}</Badge>;
        case 'Completed': return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">{status}</Badge>;
        case 'Pending': return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">{status}</Badge>;
        case 'Cancelled': return <Badge variant="destructive">{status}</Badge>;
        default: return <Badge variant="secondary">{status}</Badge>;
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
                        {isLoading ? <Skeleton className="h-40"/> : appointments.length > 0 ? appointments.map(appt => (
                             <Card key={appt.id} className="mb-2">
                                 <CardContent className="p-3 flex items-center gap-3">
                                    <Avatar className="h-10 w-10"><AvatarFallback>{appt.patientName.substring(0,1)}</AvatarFallback></Avatar>
                                     <div className="flex-1">
                                         <p className="font-semibold">{appt.patientName}</p>
                                         <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Phone className="w-3 h-3"/> {appt.patientPhone}</p>
                                         <p className="text-xs">{appt.appointmentDate.toDate().toLocaleDateString()} at {appt.appointmentTime}</p>
                                     </div>
                                     <div className="flex flex-col items-end gap-1">
                                        {getAppointmentStatusBadge(appt.status)}
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
                                                <h4 className="font-semibold mb-2">Reschedule Appointment</h4>
                                                <div className="space-y-2 mt-2">
                                                    <Label>Select New Date</Label>
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                        <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !newDate && "text-muted-foreground")}>
                                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                                            {newDate ? format(newDate, "PPP") : <span>Pick a date</span>}
                                                        </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0"><CalendarPicker mode="single" selected={newDate} onSelect={setNewDate} initialFocus/></PopoverContent>
                                                    </Popover>
                                                </div>
                                                <div className="space-y-2 mt-2">
                                                    <Label>Select New Time</Label>
                                                    <div className="grid grid-cols-4 gap-2">
                                                        {timeSlots.map(slot => (<Button key={slot} variant={newTime === slot ? 'default' : 'outline'} onClick={() => setNewTime(slot)}>{slot}</Button>))}
                                                    </div>
                                                </div>
                                                <Button className="w-full mt-4" onClick={handleRescheduleSubmit}>Confirm Reschedule</Button>
                                            </div>
                                            <DialogFooter className="border-t pt-4 space-y-2 sm:space-y-0">
                                                {selectedAppointment && selectedAppointment.status === 'Pending' && <Button className="w-full" onClick={() => handleAppointmentAction(selectedAppointment.id, 'confirm')}>Confirm Appointment</Button>}
                                                {selectedAppointment && selectedAppointment.status === 'Confirmed' && <Button className="w-full" variant="secondary" onClick={() => handleAppointmentAction(selectedAppointment.id, 'check-in')}>Check-in Patient</Button>}
                                                 <AlertDialog>
                                                     <AlertDialogTrigger asChild>
                                                        <Button variant="destructive" className="w-full">Cancel Appointment</Button>
                                                    </AlertDialogTrigger>
                                                     <AlertDialogContent>
                                                        <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action will cancel the appointment for {selectedAppointment?.patientName}.</AlertDialogDescription></AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Go Back</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => selectedAppointment && handleAppointmentAction(selectedAppointment.id, 'cancel')} className="bg-destructive hover:bg-destructive/90">Yes, Cancel</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                 </AlertDialog>
                                            </DialogFooter>
                                        </DialogContent>
                                     </Dialog>
                                 </CardContent>
                             </Card>
                        )) : <p className="text-center text-muted-foreground py-4">No new appointment requests.</p>}
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
                                                    const appointment = appointments.find(a => a.doctorName === `Dr. ${doctor.name}` && a.appointmentTime === slot && a.status !== 'Cancelled' && a.status !== 'Completed');
                                                    return (
                                                        <TableCell key={slot}>
                                                            {appointment ? (
                                                                <Card className="p-2 text-xs text-center bg-muted">
                                                                    <p className="font-semibold truncate">{appointment.patientName}</p>
                                                                    {getAppointmentStatusBadge(appointment.status)}
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
                      <Dialog open={isAddDoctorDialogOpen} onOpenChange={(isOpen) => {
                          setIsAddDoctorDialogOpen(isOpen);
                          if (!isOpen) {
                              setNewDoctorData(initialDoctorState);
                          }
                      }}>
                        <DialogTrigger asChild>
                          <Button><UserPlus className="mr-2 h-4 w-4" /> Add Doctor</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl">
                          <DialogHeader>
                            <DialogTitle>Add New Doctor</DialogTitle>
                            <DialogDescription>Enter the details for the new doctor to add them to your hospital's roster.</DialogDescription>
                          </DialogHeader>
                          <form onSubmit={handleAddDoctor} className="max-h-[80vh] overflow-y-auto pr-6">
                            <div className="space-y-6 py-4">

                                <div className="space-y-4">
                                  <h3 className="text-lg font-semibold border-b pb-2">Basic Information</h3>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                    <div className="space-y-2"><Label>Full Name</Label><Input name="fullName" required value={newDoctorData.fullName} onChange={e => handleFormChange('fullName', e.target.value)} /></div>
                                    <div className="space-y-2"><Label>Gender</Label><Select name="gender" required onValueChange={v => handleFormChange('gender', v)} value={newDoctorData.gender}><SelectTrigger><SelectValue placeholder="Select Gender"/></SelectTrigger><SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
                                    <div className="space-y-2"><Label>Date of Birth</Label><Input name="dob" type="date" required value={newDoctorData.dob} onChange={e => handleFormChange('dob', e.target.value)} /></div>
                                    <div className="space-y-2"><Label>Contact Number</Label><div className="flex items-center gap-0 rounded-md border border-input focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"><span className="pl-3 text-muted-foreground text-sm">+91</span><Input id="contactNumber" name="contactNumber" type="tel" maxLength={10} placeholder="12345 67890" required value={newDoctorData.contactNumber} onChange={e => handleFormChange('contactNumber', e.target.value)} className="border-0 h-9 focus-visible:ring-0 focus-visible:ring-offset-0 flex-1"/></div></div>
                                    <div className="md:col-span-2 space-y-2"><Label>Email Address</Label><Input name="emailAddress" type="email" required value={newDoctorData.emailAddress} onChange={e => handleFormChange('emailAddress', e.target.value)} /></div>
                                  </div>
                                </div>
                                
                                <div className="space-y-4">
                                  <h3 className="text-lg font-semibold border-b pb-2">Professional Details</h3>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                      <div className="space-y-2"><Label>Specialization</Label><Select name="specialization" required onValueChange={v => handleFormChange('specialization', v)} value={newDoctorData.specialization}><SelectTrigger><SelectValue placeholder="Select Specialization"/></SelectTrigger><SelectContent>{doctorSpecializations.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
                                      <div className="space-y-2"><Label>Qualifications</Label><Input name="qualifications" placeholder="MBBS, MD" required value={newDoctorData.qualifications} onChange={e => handleFormChange('qualifications', e.target.value)} /></div>
                                      <div className="space-y-2"><Label>Experience (years)</Label><Input name="experience" type="number" required value={newDoctorData.experience} onChange={e => handleFormChange('experience', e.target.value)} /></div>
                                      <div className="space-y-2"><Label>Department</Label><Input name="department" placeholder="e.g., Pediatrics" value={newDoctorData.department} onChange={e => handleFormChange('department', e.target.value)} /></div>
                                  </div>
                                </div>

                                <div className="space-y-4">
                                  <h3 className="text-lg font-semibold border-b pb-2">Verification &amp; Consultation</h3>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                      <div className="space-y-2"><Label>Medical Registration No.</Label><Input name="medicalRegNo" required value={newDoctorData.medicalRegNo} onChange={e => handleFormChange('medicalRegNo', e.target.value)} /></div>
                                      <div className="space-y-2"><Label>Registration Council</Label><Input name="regCouncil" placeholder="e.g., Delhi Medical Council" required value={newDoctorData.regCouncil} onChange={e => handleFormChange('regCouncil', e.target.value)} /></div>
                                      <div className="space-y-2"><Label>Registration Year</Label><Input name="regYear" type="number" required value={newDoctorData.regYear} onChange={e => handleFormChange('regYear', e.target.value)} /></div>
                                      <div className="space-y-2"><Label>Consultation Fee (INR)</Label><Input name="consultationFee" type="number" placeholder="e.g., 800" required value={newDoctorData.consultationFee} onChange={e => handleFormChange('consultationFee', e.target.value)} /></div>
                                  </div>
                                </div>
                            </div>
                            <DialogFooter className="pt-6">
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
                                    <div className="flex items-center gap-3">
                                        <Avatar className="w-9 h-9">
                                            <AvatarImage src={doctor.photoUrl} />
                                            <AvatarFallback>{doctor.name.substring(0,2)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <div className="font-medium">Dr. {doctor.name}</div>
                                            <div className="text-xs text-muted-foreground">{doctor.qualifications || 'N/A'}</div>
                                        </div>
                                    </div>
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
                                                    <Check className="mr-2 h-4 w-4 text-green-500" /> Verify Details
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
                                     <DialogContent className="max-w-2xl">
                                        <DialogHeader>
                                            <DialogTitle>Verify Doctor: Dr. {selectedDoctorForVerification?.name}</DialogTitle>
                                            <DialogDescription>Review the entered details and confirm their authenticity. This will send the profile to Cabzi for final approval.</DialogDescription>
                                        </DialogHeader>
                                        <div className="grid md:grid-cols-2 gap-4 py-4 max-h-[60vh] overflow-y-auto pr-4">
                                            <Card>
                                                <CardHeader className="p-3">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="w-12 h-12">
                                                            <AvatarImage src={selectedDoctorForVerification?.photoUrl} />
                                                            <AvatarFallback>{selectedDoctorForVerification?.name?.substring(0, 2)}</AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <p className="font-bold">Dr. {selectedDoctorForVerification?.name}</p>
                                                            <p className="text-sm text-muted-foreground">{selectedDoctorForVerification?.email}</p>
                                                        </div>
                                                    </div>
                                                </CardHeader>
                                            </Card>
                                             <Card>
                                                <CardContent className="p-3">
                                                    <Label className="text-xs">Contact</Label>
                                                    <p className="font-semibold">{selectedDoctorForVerification?.phone}</p>
                                                </CardContent>
                                            </Card>
                                            <Card>
                                                <CardContent className="p-3">
                                                    <Label className="text-xs">Specialization &amp; Dept.</Label>
                                                    <p className="font-semibold">{selectedDoctorForVerification?.specialization}, {selectedDoctorForVerification?.department}</p>
                                                </CardContent>
                                            </Card>
                                             <Card>
                                                <CardContent className="p-3">
                                                    <Label className="text-xs">Experience</Label>
                                                    <p className="font-semibold">{selectedDoctorForVerification?.experience} years</p>
                                                </CardContent>
                                            </Card>
                                            <Card className="md:col-span-2">
                                                <CardContent className="p-3">
                                                    <Label className="text-xs">Medical Registration Number</Label>
                                                    <p className="font-mono text-lg">{selectedDoctorForVerification?.medicalRegNo}</p>
                                                </CardContent>
                                            </Card>
                                             <Card>
                                                <CardContent className="p-3">
                                                    <Label className="text-xs">Registration Council</Label>
                                                    <p className="font-semibold">{selectedDoctorForVerification?.regCouncil}</p>
                                                </CardContent>
                                            </Card>
                                             <Card>
                                                <CardContent className="p-3">
                                                    <Label className="text-xs">Registration Year</Label>
                                                    <p className="font-semibold">{selectedDoctorForVerification?.regYear}</p>
                                                </CardContent>
                                            </Card>
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
