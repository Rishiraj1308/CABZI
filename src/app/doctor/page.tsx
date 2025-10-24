'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, Clock, CheckCircle, Percent, Video, Building, FileText, PlayCircle, Plus } from 'lucide-react';

const mockDashboardStats = {
    todayAppointments: 12,
    newPatients: 4,
    avgConsultationTime: 15,
    pendingFollowUps: 3,
    completionRate: 95,
};

const mockAppointments = [
  { 
    time: '10:00 AM', 
    patient: 'Priya Sharma', 
    age: 28,
    gender: 'Female',
    mode: 'In-Clinic',
    visitType: 'New',
    reason: 'Fever and body ache for 2 days.',
    status: 'Confirmed' 
  },
  { 
    time: '10:30 AM', 
    patient: 'Rohan Verma', 
    age: 45,
    gender: 'Male',
    mode: 'Online',
    visitType: 'Follow-up',
    reason: 'Blood pressure check-up.',
    status: 'Confirmed' 
  },
  { 
    time: '11:00 AM', 
    patient: 'Anita Desai',
    age: 62,
    gender: 'Female',
    mode: 'In-Clinic',
    visitType: 'New',
    reason: 'Joint pain and swelling in knees.',
    status: 'Checked-in' 
  },
  { 
    time: '11:30 AM', 
    patient: 'Suresh Kumar', 
    age: 35,
    gender: 'Male',
    mode: 'In-Clinic',
    visitType: 'Follow-up',
    reason: 'Post-operative recovery check.',
    status: 'Completed' 
  },
];

const StatCard = ({ title, value, icon: Icon, description }: { title: string, value: string, icon: React.ElementType, description: string }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="w-4 h-4 text-muted-foreground"/>
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
    </Card>
);

const getStatusBadge = (status: string) => {
    switch(status) {
        case 'Confirmed': return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">{status}</Badge>;
        case 'Checked-in': return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">{status}</Badge>;
        case 'Completed': return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">{status}</Badge>;
        case 'Cancelled': return <Badge variant="destructive">{status}</Badge>;
        default: return <Badge variant="secondary">{status}</Badge>;
    }
}


export default function DoctorDashboardPage() {
  return (
    <div className="space-y-6">
       <div>
        <h2 className="text-3xl font-bold tracking-tight">Doctor's Dashboard</h2>
        <p className="text-muted-foreground">Welcome back, Doctor. Here's your snapshot for today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCard title="Today’s Appointments" value={`${mockDashboardStats.todayAppointments}`} icon={Calendar} description="+3 from yesterday" />
        <StatCard title="New Patients Today" value={`${mockDashboardStats.newPatients}`} icon={User} description="New consultations scheduled" />
        <StatCard title="Avg. Consultation Time" value={`${mockDashboardStats.avgConsultationTime} min`} icon={Clock} description="Maintained from last week" />
        <StatCard title="Pending Follow-Ups" value={`${mockDashboardStats.pendingFollowUps}`} icon={Calendar} description="Scheduled for today" />
        <StatCard title="Completion Rate" value={`${mockDashboardStats.completionRate}%`} icon={Percent} description="Today's consultation completion" />
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Today's Schedule</CardTitle>
            <CardDescription>A list of your confirmed and pending appointments for today.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="space-y-4">
                {mockAppointments.map((apt, index) => (
                    <Card key={index} className="bg-muted/50">
                        <CardHeader className="p-4">
                           <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-semibold text-primary">{apt.time}</p>
                                    <CardTitle className="text-xl">{apt.patient}</CardTitle>
                                    <CardDescription>{apt.age} / {apt.gender}</CardDescription>
                                </div>
                                {getStatusBadge(apt.status)}
                           </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 space-y-3 text-sm">
                             <div className="flex items-center gap-4 text-muted-foreground">
                                <Badge variant="outline">{apt.mode === 'Online' ? <Video className="w-3 h-3 mr-1.5"/> : <Building className="w-3 h-3 mr-1.5"/>}{apt.mode}</Badge>
                                <Badge variant="outline">{apt.visitType}</Badge>
                            </div>
                            <p className="text-muted-foreground"><span className="font-semibold text-foreground">Reason:</span> {apt.reason}</p>
                        </CardContent>
                         <CardFooter className="p-4 pt-0 flex gap-2">
                            <Button variant="outline" size="sm"><FileText className="w-4 h-4 mr-2"/>View Details</Button>
                            <Button size="sm" disabled={apt.status !== 'Checked-in'}><PlayCircle className="w-4 h-4 mr-2"/>Start Consultation</Button>
                            <Button variant="secondary" size="sm"><Plus className="w-4 h-4 mr-2"/>Add Notes</Button>
                            <Button variant="secondary" size="sm" disabled={apt.status === 'Completed'}><CheckCircle className="w-4 h-4 mr-2"/>Mark Complete</Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
