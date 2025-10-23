
'use client'

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Car, Wrench, Ambulance, Calendar } from 'lucide-react';
import Link from 'next/link';
import { MotionDiv } from '@/components/ui/motion-div';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const serviceCards = [
    {
        title: 'Book a Ride',
        description: 'Get a fair fare to your destination, with 0% commission for our partners.',
        icon: Car,
        href: '/user/book',
        color: 'text-primary',
        hoverColor: 'hover:border-primary',
        isPrimary: true,
    },
    {
        title: 'CURE Emergency',
        description: 'Instantly connect with the nearest hospital and dispatch an ambulance.',
        icon: Ambulance,
        href: '/user/book', // This will be handled by the page to show SOS
        color: 'text-red-500',
        hoverColor: 'hover:border-red-500',
        isPrimary: false,
    },
     {
        title: 'Book Appointment',
        description: 'Find specialists and book appointments at our partner hospitals.',
        icon: Calendar,
        href: '/user/appointments',
        color: 'text-blue-500',
        hoverColor: 'hover:border-blue-500',
        isPrimary: false,
    },
    {
        title: 'ResQ Assistance',
        description: 'Coming soon: On-the-spot help for vehicle breakdowns.',
        icon: Wrench,
        href: '#',
        color: 'text-amber-500',
        hoverColor: 'hover:border-amber-500',
        isPrimary: false,
    },
];

export default function UserDashboard() {
    const { toast } = useToast();
    
    return (
        <div className="p-4 md:p-6 space-y-6">
             <div className="animate-fade-in text-center md:text-left">
                <h2 className="text-3xl font-bold tracking-tight">Welcome to Cabzi</h2>
                <p className="text-muted-foreground">How can we help you today?</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {serviceCards.map((service, index) => (
                    <MotionDiv
                        key={service.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                    >
                        <Link href={service.href} legacyBehavior>
                             <a onClick={(e) => {
                                 if (service.href === '#') {
                                     e.preventDefault();
                                     toast({ title: 'Coming Soon!', description: 'This feature is under development.' });
                                 }
                             }}>
                                <Card className={`h-full transition-all ${service.hoverColor} ${service.isPrimary ? 'bg-primary/5' : ''}`}>
                                    <CardHeader className="flex flex-row items-center gap-4">
                                        <service.icon className={`w-10 h-10 ${service.color}`} />
                                        <div>
                                            <CardTitle>{service.title}</CardTitle>
                                            <CardDescription>{service.description}</CardDescription>
                                        </div>
                                    </CardHeader>
                                </Card>
                            </a>
                        </Link>
                    </MotionDiv>
                 ))}
            </div>
        </div>
    );
}

