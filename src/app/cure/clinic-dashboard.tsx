
'use client'

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Stethoscope, Calendar, Users, BarChart, FileText, Clock, UserCheck } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useDb } from '@/firebase/client-provider';
import { collection, query, where, onSnapshot, Timestamp, orderBy, getDocs, doc, updateDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { endOfDay, startOfDay } from 'date-fns';

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
}

interface Doctor {
    id: string;
    name: string;
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
            setIsLoading(false); // Ensure loading is stopped
            return;
        };

        const { partnerId } = JSON.parse(session);
        if (!partnerId) {
            toast({ variant: 'destructive', title: 'Error', description: 'Partner ID is missing from session.' });
            setIsLoading(false); // Ensure loading is stopped
            return;
        }
        
        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
        const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

        const apptQuery = query(
            collection(db, 'appointments'),
            where('hospitalId', '==', partnerId),
            where('appointmentDate', '>=', startOfToday),
            where('appointmentDate', '<=', endOfToday),
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

        setIsLoading(false); // Stop loading after setting up listeners

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
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
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
                                                <p className="text-xs text-muted-foreground">{appt.appointmentDate.toDate().toLocaleDateString()}</p>
                                           </div>
                                           <div className="text-sm text-muted-foreground">{appt.appointmentTime}</div>
                                           <Badge variant={appt.status === 'In Queue' ? 'default' : 'secondary'}>{appt.status}</Badge>
                                           <Button variant="outline" size="sm" onClick={() => handleCheckIn(appt.id)} disabled={appt.status !== 'Confirmed'}>Check-in</Button>
                                       </div>
                                   )
                               })
                           ) : (
                                <div className="text-center py-10 text-muted-foreground">No new appointment requests.</div>
                           )}
                       </div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Doctor Roster</CardTitle>
                    </CardHeader>
                    <CardContent>
                       <div className="space-y-3">
                             {isLoading ? (
                                Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)
                           ) : doctors.length > 0 ? (
                                doctors.map(doc => (
                                    <div key={doc.id} className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${doc.isAvailable ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                        <span className="flex-1 font-medium text-sm">Dr. {doc.name}</span>
                                        <Badge variant="outline">{doc.isAvailable ? 'Online' : 'Offline'}</Badge>
                                    </div>
                                ))
                           ) : (
                                <div className="text-center py-10 text-muted-foreground">No doctors on roster.</div>
                           )}
                       </div>
                        <Button variant="outline" className="w-full mt-4" asChild>
                            <Link href="/cure/doctors">Manage Roster</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default ClinicDashboard;
