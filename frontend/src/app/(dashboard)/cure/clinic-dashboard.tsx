
'use client'

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarCheck, UserPlus, Clock, BadgeCheck, Check, XCircle } from 'lucide-react';
import { useDb } from '@/lib/firebase/client-provider';
import { collection, query, where, onSnapshot, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, isToday } from 'date-fns';
import { useCurePartner } from './layout';

interface Appointment {
  id: string;
  patientName: string;
  appointmentTime: string;
  appointmentDate: Timestamp;
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
  consultationType: 'in-clinic' | 'video';
}

export default function ClinicDashboard() {
  const { partnerData, isLoading: isPartnerLoading } = useCurePartner();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const db = useDb();

  useEffect(() => {
    if (isPartnerLoading || !db || !partnerData?.id) return;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const q = query(
      collection(db, 'appointments'),
      where('hospitalId', '==', partnerData.id),
      where('appointmentDate', '>=', Timestamp.fromDate(todayStart)),
      where('appointmentDate', '<=', Timestamp.fromDate(todayEnd))
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const apptsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
      setAppointments(apptsData.sort((a,b) => a.appointmentDate.toMillis() - b.appointmentDate.toMillis()));
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching appointments:", error);
      toast.error("Could not fetch today's appointments.");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [db, partnerData, isPartnerLoading]);
  
  const handleStatusUpdate = async (id: string, newStatus: Appointment['status']) => {
    if (!db) return;
    try {
        await updateDoc(doc(db, 'appointments', id), { status: newStatus });
        toast.success(`Appointment status updated to ${newStatus}.`);
    } catch {
        toast.error("Failed to update status.");
    }
  }

  const { pending, confirmed, nextPatient } = useMemo(() => {
    const pending = appointments.filter(a => a.status === 'Pending');
    const confirmed = appointments.filter(a => a.status === 'Confirmed' || a.status === 'In Queue');
    const nextPatient = confirmed.length > 0 ? confirmed[0] : null;
    return { pending, confirmed, nextPatient };
  }, [appointments]);

  if (isPartnerLoading || isLoading) {
    return <Skeleton className="h-96 w-full"/>
  }

  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Clinic Dashboard</h1>
              <p className="text-muted-foreground">{partnerData?.name || 'Your Clinic'}</p>
            </div>
            <Card className="p-4">
                <p className="text-sm font-semibold">Today's Appointments</p>
                <p className="text-3xl font-bold">{appointments.length}</p>
            </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Main column */}
            <div className="md:col-span-2 space-y-6">
                 <Card>
                    <CardHeader>
                        <CardTitle>Pending Appointments ({pending.length})</CardTitle>
                        <CardDescription>New requests that need confirmation.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow><TableHead>Patient</TableHead><TableHead>Time</TableHead><TableHead>Type</TableHead><TableHead>Actions</TableHead></TableRow>
                            </TableHeader>
                            <TableBody>
                                {pending.length > 0 ? pending.map(appt => (
                                    <TableRow key={appt.id}>
                                        <TableCell className="font-medium">{appt.patientName}</TableCell>
                                        <TableCell>{appt.appointmentTime}</TableCell>
                                        <TableCell><Badge variant="outline" className="capitalize">{appt.consultationType}</Badge></TableCell>
                                        <TableCell className="flex gap-2">
                                            <Button size="sm" onClick={() => handleStatusUpdate(appt.id, 'Confirmed')}><Check className="w-4 h-4 mr-2"/>Confirm</Button>
                                            <Button size="sm" variant="destructive" onClick={() => handleStatusUpdate(appt.id, 'Cancelled')}><XCircle className="w-4 h-4 mr-2"/>Cancel</Button>
                                        </TableCell>
                                    </TableRow>
                                )) : <TableRow><TableCell colSpan={4} className="h-24 text-center">No pending appointments.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* Side column */}
            <div className="space-y-6">
                <Card>
                     <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Clock /> Next in Queue</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {nextPatient ? (
                             <div className="space-y-3 text-center">
                                <p className="text-4xl font-bold">{nextPatient.appointmentTime}</p>
                                <p className="text-xl font-semibold">{nextPatient.patientName}</p>
                                <Badge className="capitalize">{nextPatient.consultationType}</Badge>
                                <Button className="w-full" onClick={() => handleStatusUpdate(nextPatient.id, 'Completed')}><BadgeCheck className="w-4 h-4 mr-2"/>Mark as Completed</Button>
                            </div>
                        ) : <p className="text-sm text-center text-muted-foreground py-4">No patients in queue.</p>}
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader><CardTitle>Manage Team</CardTitle></CardHeader>
                    <CardContent>
                        <Button variant="outline" className="w-full">
                            <UserPlus className="w-4 h-4 mr-2"/> Add New Doctor
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>

    </div>
  );
}
