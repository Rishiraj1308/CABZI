
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
import { collection, query, where, onSnapshot, Timestamp, orderBy, doc, updateDoc } from 'firebase/firestore'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, AlertDialogFooter } from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface Appointment {
    id: string;
    patientName: string;
    patientPhone: string;
    appointmentDate: Timestamp;
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
        const doctorFullName = `Dr. ${name}`;
        
        const q = query(
            collection(db, "appointments"), 
            where("doctorName", "==", doctorFullName),
            orderBy("appointmentDate", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const apptsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
            setAppointments(apptsData);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching appointments:", error);
            toast({ variant: 'destructive', title: "Error", description: "Could not fetch appointment data." });
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [db, toast]);

    const filteredAppointments = useMemo(() => {
        return appointments
            .filter(a => statusFilter === 'All' || a.status === statusFilter)
            .filter(a => a.patientName.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [appointments, searchQuery, statusFilter]);

    const handleAppointmentAction = async (apptId: string, action: 'confirm' | 'check-in' | 'cancel' | 'complete') => {
        if(!db) return;
        const apptRef = doc(db, 'appointments', apptId);
        
        let newStatus: Appointment['status'] = 'Pending';
        let toastTitle = '';
        
        switch(action) {
            case 'confirm':
                newStatus = 'Confirmed';
                toastTitle = 'Appointment Confirmed';
                break;
            case 'check-in':
                newStatus = 'In Queue';
                toastTitle = 'Patient Checked In';
                break;
            case 'cancel':
                newStatus = 'Cancelled';
                toastTitle = 'Appointment Cancelled';
                break;
             case 'complete':
                newStatus = 'Completed';
                toastTitle = 'Consultation Marked Complete';
                break;
        }

        try {
            await updateDoc(apptRef, { status: newStatus });
            toast({ title: toastTitle });
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
            appointmentDate: Timestamp.fromDate(newDateTime), 
            appointmentTime: newTime,
            status: 'Confirmed'
        });
        toast({ title: 'Appointment Rescheduled!', description: `Appointment for ${selectedAppointment.patientName} is now on ${format(newDateTime, 'PPP')} at ${newTime}.` });
    } catch(e) {
        toast({ variant: 'destructive', title: 'Reschedule Failed'});
    }

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
                                        <div>{appt.appointmentDate.toDate().toLocaleDateString()}</div>
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
