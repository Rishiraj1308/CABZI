
'use client'

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, PlusCircle, Hospital, Stethoscope } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

const mockAppointments = [
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

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Confirmed': return <Badge className="bg-blue-100 text-blue-800">{status}</Badge>;
            case 'Pending': return <Badge className="bg-yellow-100 text-yellow-800">{status}</Badge>;
            case 'Completed': return <Badge className="bg-green-100 text-green-800">{status}</Badge>;
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
                 <Button asChild>
                    <Link href="/user/book-appointment">
                        <PlusCircle className="mr-2 h-4 w-4" /> Book New Appointment
                    </Link>
                </Button>
            </div>
            
            <div className="space-y-4 animate-fade-in">
                {mockAppointments.map(appt => (
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
                        {appt.status !== 'Completed' && (
                            <CardFooter className="flex gap-2">
                                <Button variant="outline" onClick={() => toast({title: 'This feature is coming soon!'})}>Reschedule</Button>
                                <Button variant="destructive" onClick={() => toast({title: 'This feature is coming soon!'})}>Cancel Appointment</Button>
                            </CardFooter>
                        )}
                    </Card>
                ))}
                
                {mockAppointments.length === 0 && (
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
