
'use client'

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Car, Wrench, Ambulance, Calendar } from 'lucide-react';
import Link from 'next/link';
import { MotionDiv } from '@/components/ui/motion-div';
import { useToast } from '@/hooks/use-toast';

const serviceCards = [
    {
        title: 'Book a Ride',
        description: 'Fair fares for your daily commute.',
        icon: Car,
        href: '/user/book',
        color: 'text-primary',
        category: 'Mobility & Transport'
    },
    {
        title: 'Emergency SOS',
        description: 'Dispatch the nearest ambulance.',
        icon: Ambulance,
        href: '/user/book', // SOS logic will be on the book page
        color: 'text-red-500',
        category: 'Health & Safety'
    },
     {
        title: 'Book Appointment',
        description: 'Consult with doctors at partner hospitals.',
        icon: Calendar,
        href: '/user/appointments',
        color: 'text-blue-500',
        category: 'Health & Safety'
    },
    {
        title: 'Roadside Assistance',
        description: 'Get help for vehicle breakdowns.',
        icon: Wrench,
        href: '#',
        color: 'text-amber-500',
        category: 'Mobility & Transport'
    },
];

export default function UserDashboard() {
    const { toast } = useToast();
    
    const servicesByCat = serviceCards.reduce((acc, service) => {
        if (!acc[service.category]) {
            acc[service.category] = [];
        }
        acc[service.category].push(service);
        return acc;
    }, {} as Record<string, typeof serviceCards>);

    return (
        <div className="p-4 md:p-6 space-y-6">
             <div className="animate-fade-in text-center md:text-left">
                <h2 className="text-3xl font-bold tracking-tight">Welcome to Cabzi</h2>
                <p className="text-muted-foreground">Your everyday super-app. How can we help you today?</p>
            </div>
            
            {Object.entries(servicesByCat).map(([category, services]) => (
                <div key={category}>
                    <h3 className="text-lg font-semibold mb-2 px-2">{category}</h3>
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {services.map((service, index) => (
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
                                        <Card className="h-full transition-all hover:border-primary hover:shadow-lg text-center">
                                             <CardContent className="p-4 flex flex-col items-center justify-center gap-2">
                                                <div className="p-3 bg-muted rounded-full">
                                                  <service.icon className={`w-8 h-8 ${service.color}`} />
                                                </div>
                                                <p className="font-semibold text-sm">{service.title}</p>
                                            </CardContent>
                                        </Card>
                                    </a>
                                </Link>
                            </MotionDiv>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
