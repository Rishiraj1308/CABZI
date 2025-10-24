
'use client'

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Stethoscope, Calendar, Users, BarChart, FileText, Clock, UserCheck } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useDb } from '@/firebase/client-provider';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

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

    useEffect(() => {
        if (!db) return;
        const session = localStorage.getItem('cabzi-cure-session');
        if (!session) {
            setIsLoading(false);
            return;
        };

        const { partnerId } = JSON.parse(session);
        if (!partnerId) {
            setIsLoading(false);
            return;
        }

        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
        const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

        // Fetch today's appointments
        const apptQuery = query(
            collection(db, 'appointments'),
            where('hospitalId', '==', partnerId),
            where('appointmentDate', '>=', Timestamp.fromDate(startOfToday)),
            where('appointmentDate', '<=', Timestamp.fromDate(endOfToday))
        );
        const unsubAppts = onSnapshot(apptQuery, (snapshot) => {
            const apptsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
            setAppointments(apptsData);
            setStats(prev => ({...prev, todayAppointments: apptsData.length}));
        });
        
        // Fetch doctors for the roster
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

    }, [db]);

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
                        <CardTitle>Today&apos;s Appointment Queue</CardTitle>
                    </CardHeader>
                    <CardContent>
                       <div className="space-y-3">
                           {isLoading ? (
                                Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
                           ) : appointments.length > 0 ? (
                               appointments.map(appt => (
                                   <div key={appt.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                                       <Avatar className="h-9 w-9"><AvatarFallback>{appt.patientName.substring(0,1)}</AvatarFallback></Avatar>
                                       <div className="flex-1 font-medium">{appt.patientName}</div>
                                       <div className="text-sm text-muted-foreground">{appt.appointmentTime}</div>
                                       <Badge variant={appt.status === 'In Queue' ? 'default' : 'secondary'}>{appt.status}</Badge>
                                       <Button variant="outline" size="sm">Check-in</Button>
                                   </div>
                               ))
                           ) : (
                                <div className="text-center py-10 text-muted-foreground">No appointments for today.</div>
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
