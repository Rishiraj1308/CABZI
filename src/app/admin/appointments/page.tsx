'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search, CalendarCheck } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

// Mock data until Firestore collection is implemented
const mockAppointments = [
    { id: 'APT001', patientName: 'Priya Singh', hospitalName: 'Max Healthcare, Saket', department: 'Cardiology', doctorName: 'Dr. Sharma', appointmentDate: '2024-09-10', appointmentTime: '11:00 AM', status: 'Confirmed' },
    { id: 'APT002', patientName: 'Rajesh Verma', hospitalName: 'Apollo Hospital, Sarita Vihar', department: 'Orthopedics', doctorName: 'Dr. Gupta', appointmentDate: '2024-09-10', appointmentTime: '02:00 PM', status: 'Confirmed' },
    { id: 'APT003', patientName: 'Anita Desai', hospitalName: 'Fortis Escorts, Okhla', department: 'General Physician', doctorName: 'Dr. Verma', appointmentDate: '2024-09-11', appointmentTime: '10:00 AM', status: 'Pending' },
    { id: 'APT004', patientName: 'Suresh Kumar', hospitalName: 'Max Healthcare, Saket', department: 'Neurology', doctorName: 'Dr. Reddy', appointmentDate: '2024-09-11', appointmentTime: '04:00 PM', status: 'Cancelled' },
];

interface Appointment {
    id: string;
    patientName: string;
    hospitalName: string;
    department: string;
    doctorName: string;
    appointmentDate: string;
    appointmentTime: string;
    status: 'Confirmed' | 'Pending' | 'Cancelled';
}

export default function AdminAppointmentsPage() {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Simulate fetching data
    useEffect(() => {
        setTimeout(() => {
            setAppointments(mockAppointments);
            setIsLoading(false);
        }, 1000);
    }, []);

    const filteredAppointments = useMemo(() => {
        if (!searchQuery) {
            return appointments;
        }
        return appointments.filter(a =>
            a.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.hospitalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.doctorName.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [appointments, searchQuery]);

    const getStatusBadge = (status: Appointment['status']) => {
        switch (status) {
            case 'Confirmed': return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">{status}</Badge>;
            case 'Pending': return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">{status}</Badge>;
            case 'Cancelled': return <Badge variant="destructive">{status}</Badge>;
            default: return <Badge variant="secondary">{status}</Badge>;
        }
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <CalendarCheck className="w-6 h-6 text-primary"/>
                            Appointments Log
                        </CardTitle>
                        <CardDescription>A complete log of all doctor appointments booked on the platform.</CardDescription>
                    </div>
                    <div className="relative w-full md:w-auto">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search by names..."
                            className="pl-8 sm:w-full md:w-[300px]"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Patient</TableHead>
                            <TableHead>Hospital & Doctor</TableHead>
                            <TableHead>Date & Time</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-36" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                                </TableRow>
                            ))
                        ) : filteredAppointments.length > 0 ? (
                            filteredAppointments.map((appt) => (
                                <TableRow key={appt.id}>
                                    <TableCell className="font-medium">{appt.patientName}</TableCell>
                                    <TableCell>
                                        <div className="font-medium">{appt.hospitalName}</div>
                                        <div className="text-xs text-muted-foreground">{appt.doctorName} ({appt.department})</div>
                                    </TableCell>
                                    <TableCell>
                                        <div>{appt.appointmentDate}</div>
                                        <div className="text-xs text-muted-foreground">{appt.appointmentTime}</div>
                                    </TableCell>
                                    <TableCell>{getStatusBadge(appt.status)}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                                    No appointments have been booked yet.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
