
'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Stethoscope, UserPlus, MoreHorizontal, Trash2, BadgeCheck, Clock, Briefcase, Calendar, IndianRupee, Phone, Check, Settings, X, User as UserIcon, FileText as FileTextIcon, Download } from 'lucide-react'
import { useDb } from '@/firebase/client-provider'
import { collection, query, onSnapshot, addDoc, doc, deleteDoc, serverTimestamp, Timestamp, orderBy, writeBatch, getDocs, where, updateDoc } from 'firebase/firestore'
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
  photoUrl?: string; // To store uploaded photo URL
  degreeUrl?: string; // To store uploaded degree URL
  docStatus?: 'Verified' | 'Pending';
  partnerId?: string; // For Doctor's own login
  password?: string; // For Doctor's own login
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

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>(mockAppointments);
  const [isLoading, setIsLoading] = useState(true);
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
      toast({ variant: 'destructive', title: 'Error', description: 'Please select a new date and time.' });
      return;
    }
    const newDateTime = new Date(newDate);
    const [hours, minutes] = newTime.split(/[: ]/);
    newDateTime.setHours(newTime.includes('PM') ? parseInt(hours, 10) + 12 : parseInt(minutes, 10), 0);

    setAppointments(prev => prev.map(a => 
      a.id === selectedAppointment.id 
      ? { ...a, appointmentDate: newDateTime.toISOString().split('T')[0], appointmentTime: newTime, status: 'Confirmed' } 
      : a
    ));
    
    toast({ title: 'Appointment Rescheduled', description: `Appointment for ${selectedAppointment.patientName} has been updated.` });
    setIsManageAppointmentOpen(false);
  }


  const handleAddDoctor = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!db || !hospitalId) return;

    const formData = new FormData(event.currentTarget);
    const name = formData.get('doctorName') as string;
    const phone = formData.get('doctorPhone') as string;
    const specialization = formData.get('specialization') as string;
    const qualifications = formData.get('qualifications') as string;
    const experience = formData.get('experience') as string;
    const consultationFee = formData.get('consultationFee') as string;

    if (!name || !phone || !specialization || !qualifications || !experience || !consultationFee) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please provide all doctor details, including the fee.' });
      return;
    }
    
    const partnerId = `CZD-${phone.slice(-4)}${name.split(' ')[0].slice(0, 2).toUpperCase()}`;
    const password = `cAbZ@${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      await addDoc(collection(db, `ambulances/${hospitalId}/doctors`), {
        name, phone, specialization, qualifications, experience,
        consultationFee: parseFloat(consultationFee),
        photoUrl: 'pending_upload', degreeUrl: 'pending_upload', docStatus: 'Pending',
        partnerId, password, // Save credentials
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Doctor Added', description: `Dr. ${name} has been added. Their credentials are now available.` });
      setIsAddDoctorDialogOpen(false);
      setGeneratedCreds({ id: partnerId, pass: password, role: 'Doctor' });
      setIsCredsDialogOpen(true);
    } catch (error) {
      console.error('Error adding doctor:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not add doctor.' });
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
            docStatus: 'Verified'
        });
        toast({ title: 'Doctor Verified', description: `Dr. ${selectedDoctorForVerification.name} is now a verified doctor on the platform.`, className: 'bg-green-600 border-green-600 text-white' });
        setSelectedDoctorForVerification(null);
    } catch (error) {
        console.error('Error verifying doctor:', error);
        toast({ variant: 'destructive', title: 'Verification Failed' });
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
                                                    <div className="flex justify-between"><span>Status:</span><Badge variant={selectedAppointment?.status === 'Confirmed' ? 'default' : 'secondary'} className={cn(selectedAppointment?.status === 'Confirmed' && 'bg-blue-100 text-blue-800')}>{selectedAppointment?.status}</Badge></div>
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
                        <DialogContent className="sm:max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Add New Doctor</DialogTitle>
                            <DialogDescription>Enter the details for the new doctor to add them to your hospital&apos;s roster.</DialogDescription>
                          </DialogHeader>
                          <form onSubmit={handleAddDoctor}>
                            <div className="grid gap-4 py-4">
                              <div className="space-y-2">
                                <Label htmlFor="doctorName">Doctor&apos;s Full Name</Label>
                                <Input id="doctorName" name="doctorName" required />
                              </div>
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                      <Label htmlFor="specialization">Specialization</Label>
                                      <Select name="specialization" required>
                                          <SelectTrigger><SelectValue placeholder="Select a specialization" /></SelectTrigger>
                                          <SelectContent>
                                          {doctorSpecializations.map(spec => (
                                              <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                                          ))}
                                          </SelectContent>
                                      </Select>
                                  </div>
                                   <div className="space-y-2">
                                      <Label htmlFor="doctorPhone">Contact Phone</Label>
                                      <Input id="doctorPhone" name="doctorPhone" type="tel" required />
                                  </div>
                              </div>
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="qualifications">Qualifications</Label>
                                    <Input id="qualifications" name="qualifications" placeholder="e.g., MBBS, MD (Cardiology)" required />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="experience">Experience (in years)</Label>
                                    <Input id="experience" name="experience" type="number" placeholder="e.g., 10" required />
                                  </div>
                              </div>
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                      <Label htmlFor="doctorPhoto">Passport-size Photo</Label>
                                      <Input id="doctorPhoto" name="doctorPhoto" type="file" className="cursor-pointer"/>
                                  </div>
                                   <div className="space-y-2">
                                      <Label htmlFor="degreeCert">Qualification Degree</Label>
                                      <Input id="degreeCert" name="degreeCert" type="file" className="cursor-pointer"/>
                                  </div>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="consultationFee">Consultation Fee (INR)</Label>
                                <Input id="consultationFee" name="consultationFee" type="number" placeholder="e.g., 800" required />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button type="submit">Add Doctor to Roster</Button>
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
                            <TableHead>Documents</TableHead>
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
                                    {doctor.experience && (
                                      <div className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1">
                                        <Briefcase className="w-3 h-3" /> {doctor.experience} years exp.
                                      </div>
                                    )}
                                </TableCell>
                                <TableCell><Badge variant="secondary">{doctor.specialization}</Badge></TableCell>
                                <TableCell className="font-semibold">₹{doctor.consultationFee?.toLocaleString() || 'N/A'}</TableCell>
                                <TableCell>
                                   {doctor.docStatus === 'Verified' ? (
                                      <Badge className="bg-green-100 text-green-800"><BadgeCheck className="w-3 h-3 mr-1"/>Verified</Badge>
                                   ) : (
                                      <Badge variant="destructive" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1"/>Pending</Badge>
                                   )}
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
                                            <DialogTitle>Verify Doctor: {selectedDoctorForVerification?.name}</DialogTitle>
                                            <DialogDescription>Review the uploaded documents and confirm their authenticity.</DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4 py-4">
                                            <Button variant="outline" className="w-full justify-start gap-2"><Download className="w-4 h-4"/> Download Passport Photo (pending)</Button>
                                            <Button variant="outline" className="w-full justify-start gap-2"><Download className="w-4 h-4"/> Download Qualification Degree (pending)</Button>
                                        </div>
                                        <DialogFooter>
                                            <Button variant="ghost" onClick={() => setSelectedDoctorForVerification(null)}>Close</Button>
                                            <Button onClick={handleVerifyDoctor}>
                                                <BadgeCheck className="mr-2 h-4 w-4"/> Mark as Verified
                                            </Button>
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
                      navigator.clipboard.writeText(`ID: ${generatedCreds?.id}\\nPass: ${generatedCreds?.pass}`);
                      toast({ title: 'Copied!' });
                  }}>Copy</Button>
                  <AlertDialogAction onClick={() => { setGeneratedCreds(null); setIsCredsDialogOpen(false); }}>Close</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
