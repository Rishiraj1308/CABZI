'use client'

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Stethoscope, Calendar, Users, BarChart, FileText } from 'lucide-react';
import Link from 'next/link';

const ClinicDashboard = () => {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Clinic Dashboard</h2>
                <p className="text-muted-foreground">Manage your appointments, doctors, and patient interactions.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Today's Appointments</CardDescription>
                        <CardTitle className="text-4xl">12</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">+2 from yesterday</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>New Patient Registrations</CardDescription>
                        <CardTitle className="text-4xl">5</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-muted-foreground">This week</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Total Doctors</CardDescription>
                        <CardTitle className="text-4xl">3</CardTitle>
                    </CardHeader>
                     <CardContent>
                        <p className="text-xs text-muted-foreground">On your roster</p>
                    </CardContent>
                </Card>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Button variant="outline" className="h-24 flex-col gap-1" asChild>
                        <Link href="/cure/doctors">
                            <Calendar className="w-8 h-8 text-primary"/>
                            <span>Manage Appointments</span>
                        </Link>
                    </Button>
                    <Button variant="outline" className="h-24 flex-col gap-1" asChild>
                         <Link href="/cure/doctors">
                            <Users className="w-8 h-8 text-primary"/>
                            <span>Manage Doctors</span>
                        </Link>
                    </Button>
                     <Button variant="outline" className="h-24 flex-col gap-1" asChild>
                         <Link href="/cure/billing">
                            <BarChart className="w-8 h-8 text-primary"/>
                            <span>View Billings</span>
                        </Link>
                    </Button>
                     <Button variant="outline" className="h-24 flex-col gap-1" asChild>
                         <Link href="/cure/profile">
                            <FileText className="w-8 h-8 text-primary"/>
                            <span>Clinic Profile</span>
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
};

export default ClinicDashboard;
