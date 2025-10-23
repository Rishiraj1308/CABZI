'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Car, Calendar, History, Gift, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { MotionDiv } from '@/components/ui/motion-div'

const serviceCards = [
    { type: 'path', title: 'Book a Ride', description: 'Fair fares for your daily commute.', icon: Car, color: 'text-primary', href: '/user/book' },
    { type: 'appointment', title: 'Book an Appointment', description: 'Consult with doctors from our partner hospitals.', icon: Calendar, color: 'text-blue-500', href: '/user/appointments' },
    { type: 'rides', title: 'My Rides', description: 'View your past trips and invoices.', icon: History, color: 'text-green-500', href: '/user/rides' },
    { type: 'offers', title: 'Offers & Promos', description: 'Exclusive deals to save on every ride.', icon: Gift, color: 'text-amber-500', href: '/user/offers' },
]

export default function UserDashboardPage() {
    const router = useRouter();

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
        },
        },
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
        },
    };

    return (
        <div className="p-4 md:p-6 space-y-6">
             <div className="animate-fade-in pl-16">
                <h2 className="text-3xl font-bold tracking-tight">Services</h2>
                <p className="text-muted-foreground">How can we help you today?</p>
            </div>
            <MotionDiv 
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {serviceCards.map(service => (
                    <MotionDiv key={service.type} variants={itemVariants}>
                        <Card 
                            className="hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer h-full flex flex-col" 
                            onClick={() => router.push(service.href)}
                        >
                            <CardHeader className="flex-row items-start gap-4 space-y-0">
                                <div className={`p-3 rounded-lg bg-muted`}>
                                    <service.icon className={`w-6 h-6 ${service.color}`}/>
                                </div>
                                <div className="flex-1">
                                    <CardTitle>{service.title}</CardTitle>
                                    <CardDescription>{service.description}</CardDescription>
                                </div>
                                <ArrowRight className="w-5 h-5 text-muted-foreground self-center"/>
                            </CardHeader>
                        </Card>
                    </MotionDiv>
                ))}
            </MotionDiv>
        </div>
    )
}
