
'use client'

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, PlusCircle, Hospital, Stethoscope } from 'lucide-react';
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
} from "@/components/ui/alert-dialog"

const initialAppointments = [
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


export default function MyAppointmentsPage() {
    const { toast } = useToast();
    const [appointments, setAppointments] = useState(initialAppointments);

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

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Confirmed': return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">{status}</Badge>;
            case 'Pending': return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">{status}</Badge>;
            case 'Completed': return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">{status}</Badge>;
            case 'Cancelled': return <Badge variant="destructive">{status}</Badge>;
            default: return <Badge variant="secondary">{status}</Badge>;
        }
    }
    
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
                    <Button asChild>
                        <Link href="/user/book-appointment">
                            <PlusCircle className="mr-2 h-4 w-4" /> Book New Appointment
                        </Link>
                    </Button>
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
                                <Button variant="outline" onClick={() => toast({title: 'This feature is coming soon!'})}>Reschedule</Button>
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
        </div>
    )
}
