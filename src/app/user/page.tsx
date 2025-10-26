
'use client'

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Car, Wrench, Ambulance, Calendar, FlaskConical } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { MotionDiv } from '@/components/ui/motion-div';

const serviceCards = [
    {
        title: 'Ride',
        description: 'Fair fares for your daily commute.',
        icon: Car,
        href: '/user/book',
        color: 'text-primary',
        category: 'Mobility & Transport',
    },
     {
        title: 'ResQ',
        description: 'Get help for vehicle breakdowns.',
        icon: Wrench,
        href: '/user/resq',
        color: 'text-amber-500',
        category: 'Mobility & Transport',
    },
    {
        title: 'Emergency SOS',
        description: 'Dispatch the nearest ambulance.',
        icon: Ambulance,
        href: '/user/book', // SOS logic will be on the book page
        color: 'text-red-500',
        category: 'Health & Safety',
    },
     {
        title: 'Book Appointment',
        description: 'Consult with doctors at partner hospitals.',
        icon: Calendar,
        href: '/user/book-appointment',
        color: 'text-blue-500',
        category: 'Health & Safety',
    },
    {
        title: 'Lab Tests',
        description: 'Book tests from certified labs.',
        icon: FlaskConical,
        href: '#',
        color: 'text-purple-500',
        category: 'Health & Safety',
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

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.08,
                delayChildren: 0.1,
            },
        },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 15 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.5,
                ease: 'easeOut'
            }
        },
    };

    return (
        <MotionDiv 
            className="p-4 md:p-6 space-y-8 pt-12"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
             <MotionDiv variants={itemVariants} className="text-center md:text-left">
                <h2 className="text-3xl font-bold tracking-tight font-headline">How can we help you today?</h2>
                <p className="text-muted-foreground">Choose a service to get started.</p>
            </MotionDiv>
            
            <div className="space-y-8">
                {Object.entries(servicesByCat).map(([category, services]) => (
                    <MotionDiv key={category} variants={itemVariants}>
                        <h3 className="text-xl font-bold mb-4 px-2">{category}</h3>
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {services.map((service, index) => (
                                <MotionDiv key={service.title} variants={itemVariants}>
                                    <Link href={service.href} legacyBehavior>
                                        <a onClick={(e) => {
                                            if (service.href === '#') {
                                                e.preventDefault();
                                                toast({ title: 'Coming Soon!', description: 'This feature is under development.' });
                                            }
                                        }}>
                                            <Card className="h-full transition-all text-center bg-background/80 backdrop-blur-sm hover:shadow-lg hover:border-primary/50">
                                                 <CardContent className="p-4 flex flex-col items-center justify-center gap-2">
                                                    <div className="p-3 bg-muted rounded-full">
                                                      <service.icon className={`w-6 h-6 ${service.color}`} />
                                                    </div>
                                                    <p className="font-semibold text-sm">{service.title}</p>
                                                </CardContent>
                                            </Card>
                                        </a>
                                    </Link>
                                </MotionDiv>
                            ))}
                        </div>
                    </MotionDiv>
                ))}
            </div>
        </MotionDiv>
    );
}
