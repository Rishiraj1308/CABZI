
'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search, Calendar as CalendarIcon, Settings } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDb } from '@/firebase/client-provider'
import { collection, query, where, onSnapshot, Timestamp, orderBy } from 'firebase/firestore'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter } from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface Appointment {
    id: string;
    patientName: string;
    patientPhone: string;
    appointmentDate: string;
    appointmentTime: string;
    status: 'Confirmed' | 'Pending' | 'Cancelled' | 'Completed' | 'In Queue';
    isRecurring: boolean;
    doctorName: string;
    department: string;
}

export default function DoctorAppointmentsPage() {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const { toast } = useToast()
    const db = useDb()
    const [isManageAppointmentOpen, setIsManageAppointmentOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [newDate, setNewDate] = useState<Date | undefined>(new Date());
    const [newTime, setNewTime] = useState('');
    const timeSlots = ['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'];
    
    useEffect(() => {
        if (!db) return;

        const session = localStorage.getItem('cabzi-doctor-session');
        if (!session) {
            setIsLoading(false);
            toast({ variant: 'destructive', title: 'Not Authenticated' });
            return;
        }
        
        const { name } = JSON.parse(session);
        
        const mockAppointments: Appointment[] = [
            { id: 'APT001', patientName: 'Priya Singh', patientPhone: '9876543210', doctorName: 'Dr. Ramesh Sharma', department: 'Cardiology', appointmentDate: '2024-09-10T11:00:00', appointmentTime: '11:00 AM', status: 'Pending', isRecurring: true },
            { id: 'APT002', patientName: 'Rajesh Verma', patientPhone: '9988776655', doctorName: name, department: 'Orthopedics', appointmentDate: '2024-09-10T14:00:00', appointmentTime: '02:00 PM', status: 'Confirmed', isRecurring: false },
            { id: 'APT003', patientName: 'Anita Desai', patientPhone: '9123456789', doctorName: name, department: 'General Physician', appointmentDate: '2024-08-25T10:00:00', appointmentTime: '10:00 AM', status: 'Completed', isRecurring: false },
            { id: 'APT004', patientName: 'Suresh Kumar', patientPhone: '9876543211', doctorName: 'Dr. Priya Gupta', appointmentDate: '2024-09-11T16:00:00', appointmentTime: '04:00 PM', status: 'Cancelled', isRecurring: false },
            { id: 'APT005', patientName: 'Geeta Iyer', patientPhone: '9876543212', doctorName: name, appointmentDate: '2024-09-12T09:30:00', appointmentTime: '09:30 AM', status: 'Confirmed', isRecurring: false },
        ];
        
        setAppointments(mockAppointments.filter(a => a.doctorName === name));
        setIsLoading(false);

    }, [db, toast]);

    const filteredAppointments = useMemo(() => {
        return appointments
            .filter(a => statusFilter === 'All' || a.status === statusFilter)
            .filter(a => a.patientName.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [appointments, searchQuery, statusFilter]);

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
    newDateTime.setHours(newTime.includes('PM') ? parseInt(hours, 10) + 12 : parseInt(hours, 10), parseInt(minutes, 10), 0);

    setAppointments(prev => prev.map(appt => 
      appt.id === selectedAppointment.id 
      ? { ...appt, appointmentDate: newDateTime.toISOString(), appointmentTime: newTime, status: 'Confirmed' } 
      : appt
    ));
    
    toast({ title: 'Appointment Rescheduled!', description: `Appointment for ${selectedAppointment.patientName} is now on ${format(newDateTime, 'PPP')} at ${newTime}.` });
    setIsManageAppointmentOpen(false);
  }

    const getStatusBadge = (status: Appointment['status']) => {
        switch (status) {
            case 'Confirmed': return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">{status}</Badge>;
            case 'Completed': return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">{status}</Badge>;
            case 'Pending': return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">{status}</Badge>;
            case 'Cancelled': return <Badge variant="destructive">{status}</Badge>;
            case 'In Queue': return <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200">In Queue</Badge>;
            default: return <Badge variant="secondary">{status}</Badge>;
        }
    }

    return (
      <div className="space-y-6">
        <div>
            <h2 className="text-3xl font-bold tracking-tight">My Appointments</h2>
            <p className="text-muted-foreground">View and manage your upcoming and past patient appointments.</p>
        </div>
        <Card>
            <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <CalendarIcon className="w-6 h-6"/>
                            Appointment Log
                        </CardTitle>
                        <CardDescription>A complete log of your confirmed and past consultations.</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative w-full md:w-auto">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search by patient name..."
                                className="pl-8 sm:w-full md:w-[250px]"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Filter by Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">All Statuses</SelectItem>
                                <SelectItem value="Confirmed">Upcoming</SelectItem>
                                <SelectItem value="Completed">Completed</SelectItem>
                                <SelectItem value="Cancelled">Cancelled</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Patient</TableHead>
                            <TableHead>Date & Time</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-36" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto rounded-full" /></TableCell>
                                </TableRow>
                            ))
                        ) : filteredAppointments.length > 0 ? (
                            filteredAppointments.map((appt) => (
                                <TableRow key={appt.id}>
                                    <TableCell className="font-medium">{appt.patientName}</TableCell>
                                    <TableCell>
                                        <div>{new Date(appt.appointmentDate).toLocaleDateString()}</div>
                                        <div className="text-xs text-muted-foreground">{appt.appointmentTime}</div>
                                    </TableCell>
                                    <TableCell>{getStatusBadge(appt.status)}</TableCell>
                                    <TableCell>
                                        {appt.isRecurring ? <Badge variant="secondary">Recurring</Badge> : 'One-time'}
                                    </TableCell>
                                    <TableCell className="text-right">
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
                                                            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={newDate} onSelect={setNewDate} initialFocus/></PopoverContent>
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
                                                <DialogFooter className="border-t pt-4">
                                                     <AlertDialog>
                                                         <AlertDialogTrigger asChild>
                                                            <Button variant="destructive" className="w-full">Cancel Appointment</Button>
                                                        </AlertDialogTrigger>
                                                         <AlertDialogContent>
                                                            <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action will cancel the appointment for {selectedAppointment?.patientName}.</AlertDialogDescription></AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Go Back</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => selectedAppointment && handleAppointmentAction(selectedAppointment, 'cancel')} className="bg-destructive hover:bg-destructive/90">Yes, Cancel</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                     </AlertDialog>
                                                </DialogFooter>
                                            </DialogContent>
                                         </Dialog>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                    You have no appointments matching the selected filters.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>
    )
}
