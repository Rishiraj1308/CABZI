
'use client'

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Stethoscope, Calendar, Users, BarChart, FileText, Clock, UserCheck, UserPlus, MoreHorizontal, Trash2, Phone } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useDb } from '@/firebase/client-provider';
import { collection, query, where, onSnapshot, Timestamp, orderBy, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { startOfDay, endOfDay } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const StatCard = ({ title, value, icon: Icon, isLoading }: { title: string, value: string, icon: React.ElementType, isLoading?: boolean }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="w-4 h-4 text-muted-foreground"/>
        </CardHeader>
        <CardContent>
            {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{value}</div>}
        </CardContent>
    </Card>
);

interface Appointment {
    id: string;
    patientName: string;
    appointmentDate: Timestamp;
    appointmentTime: string;
    status: 'Pending' | 'Confirmed' | 'In Queue' | 'Completed' | 'Cancelled';
    doctorName: string;
}

interface Doctor {
    id: string;
    name: string;
    specialization: string;
    isAvailable: boolean;
}

const ClinicDashboard = () => {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [stats, setStats] = useState({ todayAppointments: 0, newPatients: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const db = useDb();
    const { toast } = useToast();

    useEffect(() => {
        if (!db) {
            setIsLoading(false);
            return;
        }

        const session = localStorage.getItem('curocity-cure-session');
        if (!session) {
            toast({ variant: 'destructive', title: 'Error', description: 'Session not found. Please log in again.' });
            setIsLoading(false); 
            return;
        };

        const { partnerId } = JSON.parse(session);
        if (!partnerId) {
            toast({ variant: 'destructive', title: 'Error', description: 'Partner ID is missing from session.' });
            setIsLoading(false);
            return;
        }
        
        const todayStart = startOfDay(new Date());
        const todayEnd = endOfDay(new Date());

        const apptQuery = query(
            collection(db, 'appointments'),
            where('hospitalId', '==', partnerId),
            where('appointmentDate', '>=', todayStart),
            where('appointmentDate', '<=', todayEnd),
            orderBy('appointmentDate', 'asc')
        );

        const unsubAppts = onSnapshot(apptQuery, (snapshot) => {
            const apptsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
            setAppointments(apptsData);
            setStats(prev => ({...prev, todayAppointments: apptsData.length}));
        }, (error) => {
            console.error("Error fetching appointments: ", error);
            toast({ variant: 'destructive', title: "Error", description: 'Could not fetch appointments.' });
        });
        
        const doctorsQuery = query(collection(db, `ambulances/${partnerId}/doctors`));
        const unsubDoctors = onSnapshot(doctorsQuery, (snapshot) => {
            const doctorsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Doctor));
            setDoctors(doctorsData);
        });

        setIsLoading(false); 

        return () => {
            unsubAppts();
            unsubDoctors();
        };

    }, [db, toast]);
    
    const handleCheckIn = async (appointmentId: string) => {
        if (!db) return;
        const apptRef = doc(db, 'appointments', appointmentId);
        try {
            await updateDoc(apptRef, { status: 'In Queue' });
            toast({ title: 'Patient Checked In', description: 'The patient has been added to the queue.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Check-in Failed' });
        }
    };
    
    const handleDeleteDoctor = async (doctorId: string, doctorName: string) => {
        const session = localStorage.getItem('curocity-cure-session');
        if (!db || !session) return;
        const { partnerId } = JSON.parse(session);
        if (!partnerId) return;

        const doctorRef = doc(db, `ambulances/${partnerId}/doctors`, doctorId);
        try {
          await deleteDoc(doctorRef);
          toast({ variant: 'destructive', title: 'Doctor Removed', description: `Dr. ${doctorName} has been removed from the roster.` });
        } catch (error) {
           toast({ variant: 'destructive', title: 'Error', description: 'Could not remove the doctor.' });
        }
    };
    
    const queue = useMemo(() => {
        return appointments.filter(a => a.status === 'In Queue').sort((a,b) => a.appointmentDate.seconds - b.appointmentDate.seconds);
    }, [appointments]);


    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Clinic Dashboard</h2>
                <p className="text-muted-foreground">Manage your appointments, doctors, and patient interactions.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard title="Today's Appointments" value={`${stats.todayAppointments}`} icon={Calendar} isLoading={isLoading} />
                <StatCard title="New Patients (Today)" value={`${stats.newPatients}`} icon={UserCheck} isLoading={isLoading} />
                <StatCard title="Avg. Wait Time" value="15 min" icon={Clock} isLoading={isLoading} />
            </div>
            
            <Tabs defaultValue="appointments" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="appointments">Appointment Queue</TabsTrigger>
                    <TabsTrigger value="schedules">Doctor Schedules</TabsTrigger>
                    <TabsTrigger value="doctors">Manage Roster</TabsTrigger>
                </TabsList>
                <TabsContent value="appointments" className="mt-4">
                     <Card>
                        <CardHeader>
                            <CardTitle>Upcoming Appointment Queue</CardTitle>
                        </CardHeader>
                        <CardContent>
                           <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                               {isLoading ? (
                                    Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
                               ) : appointments.length > 0 ? (
                                   appointments.map(appt => {
                                       const queueNumber = queue.findIndex(q => q.id === appt.id);
                                       return (
                                           <div key={appt.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                                               {queueNumber !== -1 ? (
                                                    <div className="w-10 h-10 flex flex-col items-center justify-center bg-primary text-primary-foreground rounded-lg">
                                                       <span className="text-xs -mb-1">Queue</span>
                                                       <span className="font-bold text-lg">{queueNumber + 1}</span>
                                                   </div>
                                               ) : (
                                                   <Avatar className="h-9 w-9"><AvatarFallback>{appt.patientName.substring(0,1)}</AvatarFallback></Avatar>
                                               )}
                                               <div className="flex-1">
                                                    <p className="font-semibold">{appt.patientName}</p>
                                                    <p className="text-xs text-muted-foreground">{appt.appointmentDate.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                               </div>
                                               <div className="text-sm text-muted-foreground">{appt.doctorName}</div>
                                               <Badge variant={appt.status === 'In Queue' ? 'default' : 'secondary'}>{appt.status}</Badge>
                                               <Button variant="outline" size="sm" onClick={() => handleCheckIn(appt.id)} disabled={appt.status !== 'Confirmed'}>Check-in</Button>
                                           </div>
                                       )
                                   })
                               ) : (
                                    <div className="text-center py-10 text-muted-foreground">No appointments for today.</div>
                               )}
                           </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="schedules" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Doctor Schedules</CardTitle>
                            <CardDescription>This is a placeholder. Functionality to manage schedules will be added soon.</CardDescription>
                        </CardHeader>
                        <CardContent className="h-48 flex items-center justify-center">
                            <p className="text-muted-foreground">Doctor schedule management coming soon.</p>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="doctors" className="mt-4">
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Doctor Roster</CardTitle>
                             <Button asChild>
                                <Link href="/cure/doctors">
                                    <UserPlus className="mr-2 h-4 w-4"/> Add / Manage Doctors
                                </Link>
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Doctor</TableHead>
                                        <TableHead>Specialization</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                   {isLoading ? (
                                     Array.from({ length: 3 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                                            <TableCell className="text-right"><Skeleton className="h-8 w-8 rounded-full ml-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                   ) : doctors.length > 0 ? (
                                     doctors.map(doctor => (
                                        <TableRow key={doctor.id}>
                                            <TableCell className="font-medium">Dr. {doctor.name}</TableCell>
                                            <TableCell><Badge variant="secondary">{doctor.specialization}</Badge></TableCell>
                                            <TableCell>
                                                <Badge variant={doctor.isAvailable ? 'default' : 'outline'} className={doctor.isAvailable ? 'bg-green-100 text-green-800' : ''}>
                                                    {doctor.isAvailable ? 'Online' : 'Offline'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                 <AlertDialog>
                                                     <DropdownMenu>
                                                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                        <DropdownMenuContent>
                                                            <AlertDialogTrigger asChild>
                                                                <DropdownMenuItem className="text-destructive" onSelect={(e) => e.preventDefault()}>
                                                                    <Trash2 className="mr-2 h-4 w-4"/> Remove
                                                                </DropdownMenuItem>
                                                            </AlertDialogTrigger>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                     <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                            <AlertDialogDescription>This will permanently remove Dr. {doctor.name} from your roster.</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDeleteDoctor(doctor.id, doctor.name)} className="bg-destructive hover:bg-destructive/90">Yes, Remove</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                 </AlertDialog>
                                            </TableCell>
                                        </TableRow>
                                     ))
                                   ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center h-24">No doctors on roster.</TableCell>
                                    </TableRow>
                                   )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default ClinicDashboard;
