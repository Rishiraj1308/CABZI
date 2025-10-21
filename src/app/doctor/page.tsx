'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, User, Clock, CheckCircle } from 'lucide-react';

const mockAppointments = [
  { time: '10:00 AM', patient: 'Priya Sharma', status: 'Confirmed' },
  { time: '10:30 AM', patient: 'Rohan Verma', status: 'Confirmed' },
  { time: '11:00 AM', patient: 'Anita Desai', status: 'Pending' },
  { time: '11:30 AM', patient: 'Suresh Kumar', status: 'Confirmed' },
]

export default function DoctorDashboardPage() {
  return (
    <div className="space-y-6">
       <div>
        <h2 className="text-3xl font-bold tracking-tight">Doctor's Dashboard</h2>
        <p className="text-muted-foreground">Welcome back, Doctor. Here's your schedule for today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
                <Calendar className="w-4 h-4 text-muted-foreground"/>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">12</div>
                <p className="text-xs text-muted-foreground">+3 from yesterday</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">New Patients</CardTitle>
                <User className="w-4 h-4 text-muted-foreground"/>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">4</div>
                <p className="text-xs text-muted-foreground">New consultations today</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Avg. Consultation Time</CardTitle>
                <Clock className="w-4 h-4 text-muted-foreground"/>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">15 min</div>
                <p className="text-xs text-muted-foreground">Maintained from last week</p>
            </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Today's Schedule</CardTitle>
            <CardDescription>A list of your confirmed and pending appointments for today.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="space-y-4">
                {mockAppointments.map((apt, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 rounded-lg bg-muted">
                        <div className="p-3 bg-background rounded-lg">
                            <Clock className="w-6 h-6 text-primary"/>
                        </div>
                        <div className="font-semibold">{apt.time}</div>
                        <div className="flex-1 font-medium">{apt.patient}</div>
                        {apt.status === 'Confirmed' ? (
                            <div className="flex items-center gap-2 text-green-600">
                                <CheckCircle className="w-5 h-5" />
                                Confirmed
                            </div>
                        ) : (
                             <div className="flex items-center gap-2 text-amber-600">
                                <Clock className="w-5 h-5" />
                                Pending
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
