'use client'

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Users, Clock, UserPlus, MoreHorizontal, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useDb } from '@/lib/firebase';
import { collection, query, where, onSnapshot, Timestamp, orderBy, getDocs, doc, updateDoc, deleteDoc, writeBatch, collectionGroup } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
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
import { cn } from '@/lib/utils';
import { useCurePartner } from './layout';
import { AddDoctorDialog } from './components/add-doctor-dialog';


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
    partnerId: string;
    phone: string;
    docStatus?: 'Awaiting Final Approval' | 'Verified' | 'Rejected';
}

const ClinicDashboard = () => {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { partnerData } = useCurePartner();
    const { db } = useFirebase();

    useEffect(() => {
        if (!db || !partnerData) {
            setIsLoading(false);
            return;
        }

        let isSubscribed = true;

        const todayStart = startOfDay(new Date());
        const todayEnd = endOfDay(new Date());

        const apptQuery = query(
            collection(db, 'appointments'),
            where('hospitalId', '==', partnerData.id),
            where('appointmentDate', '>=', todayStart),
            where('appointmentDate', '<=', todayEnd),
            orderBy('appointmentDate', 'asc')
        );

        const unsubAppts = onSnapshot(apptQuery, (snapshot) => {
            if (isSubscribed) {
                const apptsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
                setAppointments(apptsData);
            }
        }, (error) => {
            if (isSubscribed) {
                console.error("Error fetching appointments: ", error);
                toast.error("Error", { description: 'Could not fetch appointments.' });
            }
        });
        
        const doctorsQuery = query(collection(db, `curePartners/${partnerData.id}/doctors`));
        const unsubDoctors = onSnapshot(doctorsQuery, (snapshot) => {
            if (isSubscribed) {
                const doctorsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Doctor));
                setDoctors(doctorsData);
                setIsLoading(false);
            }
        });

        return () => {
            isSubscribed = false;
            unsubAppts();
            unsubDoctors();
        };

    }, [db, partnerData]);
    
    const stats = useMemo(() => {
        const checkedInCount = appointments.filter(a => a.status === 'In Queue').length;
        const waitingCount = appointments.filter(a => a.status === 'Confirmed').length;
        const avgWaitTime = checkedInCount > 0 ? 15 : 0; // Mock calculation
        return {
            todayAppointments: appointments.length,
            waiting: waitingCount,
            avgWaitTime,
        }
    }, [appointments]);

    const handleCheckIn = async (appointmentId: string) => {
        if (!db) return;
        const apptRef = doc(db, 'appointments', appointmentId);
        try {
            await updateDoc(apptRef, { status: 'In Queue' });
            toast.success('Patient Checked In', { description: 'The patient has been added to the queue.' });
        } catch (error) {
            toast.error('Check-in Failed');
        }
    };
    
    const handleDeleteDoctor = async (doctorId: string, doctorName: string) => {
        if (!db || !partnerData) return;
        
        const batch = writeBatch(db);

        const hospitalDoctorRef = doc(db, `curePartners/${partnerData.id}/doctors`, doctorId);
        batch.delete(hospitalDoctorRef);

        const globalDoctorRef = doc(db, 'doctors', doctorId);
        batch.delete(globalDoctorRef);
        
        try {
          await batch.commit();
          toast.error('Doctor Removed', { description: `Dr. ${doctorName} has been removed from the roster.` });
        } catch (error) {
           toast.error('Error', { description: 'Could not remove the doctor.' });
        }
    };

    const handleToggleAvailability = async (doctorId: string, isAvailable: boolean) => {
        if (!db || !partnerData) return;
        const doctorRef = doc(db, `curePartners/${partnerData.id}/doctors`, doctorId);
        try {
            await updateDoc(doctorRef, { isAvailable });
        } catch (error) {
            toast.error('Update Failed');
        }
    };

    const queue = useMemo(() => {
        return appointments.filter(a => a.status === 'In Queue').sort((a,b) => a.appointmentDate.seconds - b.appointmentDate.seconds);
    }, [appointments]);
    
    const getDocStatusBadge = (status?: Doctor['docStatus']) => {
        switch(status) {
            case 'Verified': return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">{status}</Badge>;
            case 'Awaiting Final Approval': return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">Awaiting Approval</Badge>;
            case 'Rejected': return <Badge variant="destructive">{status}</Badge>;
            default: return <Badge variant="secondary">{status || 'Unknown'}</Badge>;
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Clinic Dashboard</h2>
                <p className="text-muted-foreground">Manage your appointments, doctors, and patient interactions.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard title="Today's Appointments" value={`${stats.todayAppointments}`} icon={Calendar} isLoading={isLoading} />
                <StatCard title="Patients Waiting" value={`${stats.waiting}`} icon={Users} isLoading={isLoading} />
                <StatCard title="Avg. Wait Time" value={`${stats.avgWaitTime} min`} icon={Clock} isLoading={isLoading} />
            </div>
            
            <Tabs defaultValue="appointments" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="appointments">Appointment Queue</TabsTrigger>
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
                                               {appt.status === 'In Queue' && queueNumber !== -1 ? (
                                                    <div className="w-12 h-12 flex flex-col items-center justify-center bg-primary text-primary-foreground rounded-lg">
                                                       <span className="text-xs -mb-1">Queue</span>
                                                       <span className="font-bold text-xl">{queueNumber + 1}</span>
                                                   </div>
                                               ) : (
                                                    <div className="w-12 text-center">
                                                        <p className="font-bold text-sm">{new Date(appt.appointmentDate.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
                                                    </div>
                                               )}
                                               <div className="flex-1">
                                                    <p className="font-semibold">{appt.patientName}</p>
                                                    <p className="text-xs text-muted-foreground">{appt.doctorName}</p>
                                               </div>
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
                <TabsContent value="doctors" className="mt-4">
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Doctor Roster</CardTitle>
                             <AddDoctorDialog partnerData={partnerData} />
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Doctor</TableHead>
                                        <TableHead>Specialization</TableHead>
                                        <TableHead>Verification</TableHead>
                                        <TableHead>Availability</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                   {isLoading ? (
                                     Array.from({ length: 3 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-28 rounded-full" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                                            <TableCell className="text-right"><Skeleton className="h-8 w-8 rounded-full ml-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                   ) : doctors.length > 0 ? (
                                     doctors.map(doctor => (
                                        <TableRow key={doctor.id}>
                                            <TableCell className="font-medium">Dr. {doctor.name}</TableCell>
                                            <TableCell><Badge variant="secondary">{doctor.specialization}</Badge></TableCell>
                                            <TableCell>{getDocStatusBadge(doctor.docStatus)}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Switch checked={doctor.isAvailable} onCheckedChange={(c) => handleToggleAvailability(doctor.id, c)} disabled={doctor.docStatus !== 'Verified'}/>
                                                    <span className={cn('text-xs font-semibold', doctor.isAvailable ? 'text-green-600' : 'text-muted-foreground')}>{doctor.isAvailable ? 'Online' : 'Offline'}</span>
                                                </div>
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
                                        <TableCell colSpan={5} className="text-center h-24">No doctors on roster.</TableCell>
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
