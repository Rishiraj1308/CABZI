'use client'

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Stethoscope, Calendar, Users, BarChart, FileText, Clock, UserCheck } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


const StatCard = ({ title, value, icon: Icon }: { title: string, value: string, icon: React.ElementType }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="w-4 h-4 text-muted-foreground"/>
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
        </CardContent>
    </Card>
);


const mockAppointments = [
    { name: 'Priya Sharma', time: '10:00 AM', status: 'In Queue' as const },
    { name: 'Rohan Verma', time: '10:30 AM', status: 'Confirmed' as const },
    { name: 'Anita Desai', time: '11:00 AM', status: 'Confirmed' as const },
];

const mockDoctors = [
    { name: 'Dr. Alok Verma', status: 'Online' as const },
    { name: 'Dr. Sunita Reddy', status: 'Online' as const },
    { name: 'Dr. Mohan Kumar', status: 'Offline' as const },
]


const ClinicDashboard = () => {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Clinic Dashboard</h2>
                <p className="text-muted-foreground">Manage your appointments, doctors, and patient interactions.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard title="Today's Appointments" value="12" icon={Calendar} />
                <StatCard title="New Patients" value="5" icon={UserCheck} />
                <StatCard title="Avg. Wait Time" value="15 min" icon={Clock} />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Today&apos;s Appointment Queue</CardTitle>
                    </CardHeader>
                    <CardContent>
                       <div className="space-y-3">
                           {mockAppointments.map(appt => (
                               <div key={appt.name} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                                   <Avatar className="h-9 w-9"><AvatarFallback>{appt.name.substring(0,1)}</AvatarFallback></Avatar>
                                   <div className="flex-1 font-medium">{appt.name}</div>
                                   <div className="text-sm text-muted-foreground">{appt.time}</div>
                                   <Badge variant={appt.status === 'In Queue' ? 'default' : 'secondary'}>{appt.status}</Badge>
                                   <Button variant="outline" size="sm">Check-in</Button>
                               </div>
                           ))}
                       </div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Doctor Roster</CardTitle>
                    </CardHeader>
                    <CardContent>
                       <div className="space-y-3">
                            {mockDoctors.map(doc => (
                                <div key={doc.name} className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${doc.status === 'Online' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                    <span className="flex-1 font-medium text-sm">{doc.name}</span>
                                    <Badge variant="outline">{doc.status}</Badge>
                                </div>
                            ))}
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
