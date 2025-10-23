
'use client'

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, PlusCircle, Hospital, Stethoscope, Clock } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
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
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Calendar as CalendarPicker } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';


type AppointmentStatus = 'Confirmed' | 'Pending' | 'Completed' | 'Cancelled';

interface Appointment {
    id: string;
    doctorName: string;
    specialization: string;
    hospital: string;
    date: string;
    status: AppointmentStatus;
}


const initialAppointments: Appointment[] = [
    { 
        id: 'apt1', 
        doctorName: 'Dr. Ramesh Sharma', 
        specialization: 'Cardiology', 
        hospital: 'Max Healthcare, Saket',
        date: '2024-09-10T11:00:00',
        status: 'Confirmed'
    },
    { 
        id: 'apt2', 
        doctorName: 'Dr. Priya Gupta', 
        specialization: 'Orthopedics',
        hospital: 'Apollo Hospital, Sarita Vihar',
        date: '2024-09-12T14:00:00',
        status: 'Pending'
    },
     { 
        id: 'apt3', 
        doctorName: 'Dr. Alok Verma', 
        specialization: 'General Physician',
        hospital: 'Fortis Escorts, Okhla',
        date: '2024-08-25T10:00:00',
        status: 'Completed'
    },
];

const timeSlots = [
  '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'
]


export default function MyAppointmentsPage() {
    const { toast } = useToast();
    const [appointments, setAppointments] = useState(initialAppointments);
    const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [newDate, setNewDate] = useState<Date | undefined>(new Date());
    const [newTime, setNewTime] = useState('');

    const handleCancelAppointment = (appointmentId: string) => {
        setAppointments(prev => prev.map(appt => 
            appt.id === appointmentId ? { ...appt, status: 'Cancelled' as const } : appt
        ));
        toast({
            variant: 'destructive',
            title: "Appointment Cancelled",
            description: "Your appointment has been successfully cancelled."
        });
    };
    
    const handleRescheduleAppointment = () => {
        if (!selectedAppointment || !newDate || !newTime) {
            toast({ variant: 'destructive', title: "Incomplete", description: "Please select a new date and time."});
            return;
        }

        const newDateTime = new Date(newDate);
        const [hours, minutes] = newTime.split(/[: ]/);
        newDateTime.setHours(newTime.includes('PM') ? parseInt(hours, 10) + 12 : parseInt(hours, 10), parseInt(minutes, 10), 0);

        setAppointments(prev => prev.map(appt => 
            appt.id === selectedAppointment.id ? { ...appt, date: newDateTime.toISOString(), status: 'Confirmed' } : appt
        ));

        toast({
            title: "Appointment Rescheduled!",
            description: `Your appointment with Dr. ${selectedAppointment.doctorName} is now on ${format(newDateTime, 'PPP')} at ${newTime}.`,
            className: 'bg-green-600 border-green-600 text-white'
        });
        
        setIsRescheduleOpen(false);
        setSelectedAppointment(null);
        setNewDate(new Date());
        setNewTime('');
    }

    const openRescheduleDialog = (appointment: Appointment) => {
        setSelectedAppointment(appointment);
        setNewDate(new Date(appointment.date));
        setNewTime(format(new Date(appointment.date), 'hh:mm a'));
        setIsRescheduleOpen(true);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Confirmed': return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">{status}</Badge>;
            case 'Pending': return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">{status}</Badge>;
            case 'Completed': return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">{status}</Badge>;
            case 'Cancelled': return <Badge variant="destructive">{status}</Badge>;
            default: return <Badge variant="secondary">{status}</Badge>;
        }
    }
    
    const hasActiveAppointment = appointments.some(appt => appt.status === 'Confirmed' || appt.status === 'Pending');
    
    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="animate-fade-in">
                    <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Calendar className="w-8 h-8 text-primary" /> 
                        My Appointments
                    </h2>
                    <p className="text-muted-foreground">A history of all your past and upcoming appointments.</p>
                </div>
                 <div>
                    <Button asChild disabled={hasActiveAppointment}>
                        <Link href="/user/book-appointment">
                            <PlusCircle className="mr-2 h-4 w-4" /> Book New Appointment
                        </Link>
                    </Button>
                    {hasActiveAppointment && (
                        <p className="text-xs text-muted-foreground mt-2 text-center md:text-right">Cancel or complete your active appointment to book a new one.</p>
                    )}
                </div>
            </div>
            
            <div className="space-y-4 animate-fade-in">
                {appointments.map(appt => (
                    <Card key={appt.id}>
                        <CardHeader className="flex flex-row items-start justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2"><Stethoscope className="w-5 h-5 text-primary"/> Dr. {appt.doctorName}</CardTitle>
                                <CardDescription>{appt.specialization}</CardDescription>
                            </div>
                            {getStatusBadge(appt.status)}
                        </CardHeader>
                        <CardContent>
                             <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Hospital className="w-4 h-4"/>
                                <span>{appt.hospital}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                                <Calendar className="w-4 h-4"/>
                                <span>{new Date(appt.date).toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true })}</span>
                            </div>
                        </CardContent>
                        {['Confirmed', 'Pending'].includes(appt.status) && (
                             <CardFooter className="flex gap-2">
                                <Button variant="outline" onClick={() => openRescheduleDialog(appt)}>Reschedule</Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive">Cancel Appointment</Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure you want to cancel?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. Your appointment with Dr. {appt.doctorName} will be cancelled.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Go Back</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={() => handleCancelAppointment(appt.id)}
                                                className="bg-destructive hover:bg-destructive/90"
                                            >
                                                Yes, Cancel Appointment
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </CardFooter>
                        )}
                    </Card>
                ))}
                
                {appointments.length === 0 && (
                    <Card className="h-48 flex items-center justify-center">
                        <div className="text-center">
                            <p className="text-muted-foreground mb-4">You have no appointments booked.</p>
                            <Button asChild>
                                <Link href="/user/book-appointment">
                                    <PlusCircle className="mr-2 h-4 w-4" /> Book an Appointment
                                </Link>
                            </Button>
                        </div>
                    </Card>
                )}
            </div>
            
            <Dialog open={isRescheduleOpen} onOpenChange={setIsRescheduleOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Reschedule Appointment</DialogTitle>
                        <DialogDescription>
                            Select a new date and time for your appointment with Dr. {selectedAppointment?.doctorName}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Select New Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn("w-full justify-start text-left font-normal", !newDate && "text-muted-foreground")}
                                >
                                    <Calendar className="mr-2 h-4 w-4" />
                                    {newDate ? format(newDate, "PPP") : <span>Pick a date</span>}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                <CalendarPicker
                                    mode="single"
                                    selected={newDate}
                                    onSelect={setNewDate}
                                    initialFocus
                                    disabled={(d) => d < new Date(new Date().setDate(new Date().getDate() - 1))}
                                />
                                </PopoverContent>
                            </Popover>
                        </div>
                         <div className="space-y-2">
                            <Label>Select New Time</Label>
                            <div className="grid grid-cols-3 gap-2">
                                {timeSlots.map(slot => (
                                    <Button 
                                        key={slot} 
                                        variant={newTime === slot ? 'default' : 'outline'}
                                        onClick={() => setNewTime(slot)}
                                    >
                                        {slot}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsRescheduleOpen(false)}>Cancel</Button>
                        <Button onClick={handleRescheduleAppointment} disabled={!newDate || !newTime}>
                           Update Appointment
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
