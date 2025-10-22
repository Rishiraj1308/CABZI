
'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search, Calendar, Filter } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDb } from '@/firebase/client-provider'
import { collection, query, where, onSnapshot, Timestamp, orderBy } from 'firebase/firestore'
import { useToast } from '@/hooks/use-toast'

interface Appointment {
    id: string;
    patientName: string;
    appointmentDate: string;
    appointmentTime: string;
    status: 'Confirmed' | 'Pending' | 'Cancelled' | 'Completed';
    isRecurring: boolean;
}

export default function DoctorAppointmentsPage() {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const { toast } = useToast()
    const db = useDb()
    
    useEffect(() => {
        if (!db) return;

        const session = localStorage.getItem('cabzi-doctor-session');
        if (!session) {
            setIsLoading(false);
            toast({ variant: 'destructive', title: 'Not Authenticated' });
            return;
        }
        
        const { name } = JSON.parse(session);
        
        // This is a mock query for now. In a real app, you'd have an appointments collection
        // For demonstration, we'll keep the mock data filtered by the logged-in doctor's name
        const mockAppointments: (Appointment & { doctorName: string })[] = [
            { id: 'APT001', patientName: 'Priya Singh', doctorName: 'Dr. Ramesh Sharma', appointmentDate: '2024-09-10', appointmentTime: '11:00 AM', status: 'Confirmed', isRecurring: true },
            { id: 'APT002', patientName: 'Rajesh Verma', doctorName: name, appointmentDate: '2024-09-10', appointmentTime: '02:00 PM', status: 'Completed', isRecurring: false },
            { id: 'APT003', patientName: 'Anita Desai', doctorName: name, appointmentDate: '2024-09-11', appointmentTime: '10:00 AM', status: 'Confirmed', isRecurring: false },
            { id: 'APT004', patientName: 'Suresh Kumar', doctorName: 'Dr. Priya Gupta', appointmentDate: '2024-09-11', appointmentTime: '04:00 PM', status: 'Cancelled', isRecurring: false },
            { id: 'APT005', patientName: 'Geeta Iyer', doctorName: name, appointmentDate: '2024-09-12', appointmentTime: '09:30 AM', status: 'Confirmed', isRecurring: false },
        ];
        
        setAppointments(mockAppointments.filter(a => a.doctorName === name));
        setIsLoading(false);

    }, [db, toast]);

    const filteredAppointments = useMemo(() => {
        return appointments
            .filter(a => statusFilter === 'All' || a.status === statusFilter)
            .filter(a => a.patientName.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [appointments, searchQuery, statusFilter]);

    const getStatusBadge = (status: Appointment['status']) => {
        switch (status) {
            case 'Confirmed': return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">{status}</Badge>;
            case 'Completed': return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">{status}</Badge>;
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
                            <Calendar className="w-6 h-6 text-primary"/>
                            My Schedule
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
                                <SelectItem value="Confirmed">Confirmed</SelectItem>
                                <SelectItem value="Completed">Completed</SelectItem>
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
                                </TableRow>
                            ))
                        ) : filteredAppointments.length > 0 ? (
                            filteredAppointments.map((appt) => (
                                <TableRow key={appt.id}>
                                    <TableCell className="font-medium">{appt.patientName}</TableCell>
                                    <TableCell>
                                        <div>{appt.appointmentDate}</div>
                                        <div className="text-xs text-muted-foreground">{appt.appointmentTime}</div>
                                    </TableCell>
                                    <TableCell>{getStatusBadge(appt.status)}</TableCell>
                                    <TableCell>
                                        {appt.isRecurring ? <Badge variant="secondary">Recurring</Badge> : 'One-time'}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                                    You have no appointments scheduled.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
