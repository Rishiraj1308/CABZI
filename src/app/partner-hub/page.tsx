
'use client'

import Link from 'next/link'
import BrandLogo from '@/components/brand-logo'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowRight, Wrench, Car, Ambulance } from 'lucide-react'
import { cn } from '@/lib/utils'


export default function PartnerHub() {
    
    const partnerCards = [
        {
            type: 'Cure',
            href: '/cure/onboarding',
            icon: Ambulance,
            title: 'Cure Partner',
            description: 'Onboard your Hospital/Clinic to join our life-saving network.',
            buttonText: 'Join as Cure Partner',
            className: 'hover:border-destructive hover:shadow-red-500/10',
            buttonClassName: 'border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive',
            iconContainerClassName: 'bg-red-500/10',
            iconClassName: 'text-red-600',
        },
        {
            type: 'Path',
            href: '/driver/onboarding',
            icon: Car,
            title: 'Path Partner',
            description: 'Drive with 0% commission and maximize your earnings on every ride.',
            buttonText: 'Join as a Path Partner',
            className: 'hover:border-primary hover:shadow-blue-500/10',
            buttonClassName: '',
            iconContainerClassName: 'bg-primary/10',
            iconClassName: 'text-primary',
        },
        {
            type: 'ResQ',
            href: '/mechanic/onboarding',
            icon: Wrench,
            title: 'ResQ Partner',
            description: 'Provide on-the-spot roadside assistance and get more service jobs.',
            buttonText: 'Join as a ResQ Partner',
            className: 'hover:border-amber-500 hover:shadow-amber-500/10',
            buttonClassName: 'border-amber-500 text-amber-600 hover:bg-amber-500/10 hover:text-amber-700',
            iconContainerClassName: 'bg-amber-500/10',
            iconClassName: 'text-amber-600',
        }
    ]

    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-muted/40">
            <Card className="w-full max-w-4xl text-center">
                <CardHeader>
                    <div className="mx-auto">
                       <Link href="/">
                        <BrandLogo iconClassName="w-12 h-12" />
                       </Link>
                    </div>
                    <CardTitle className="text-3xl mt-4">Join the Cabzi <span className="text-red-600">C</span><span className="text-primary">P</span><span className="text-amber-600">R</span> Partners Network</CardTitle>
                    <CardDescription>
                        Become a part of India's first complete mobility, safety, and life-saving ecosystem.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {partnerCards.map(partner => (
                         <Link key={partner.type} href={partner.href} className="flex">
                            <Card className={cn("transition-all h-full flex flex-col w-full", partner.className)}>
                               <CardHeader>
                                    <div className={cn("mx-auto p-4 rounded-full", partner.iconContainerClassName)}>
                                        <partner.icon className={cn("w-8 h-8", partner.iconClassName)} />
                                    </div>
                                   <CardTitle className="pt-4">{partner.title}</CardTitle>
                               </CardHeader>
                               <CardContent className="flex-1">
                                   <p className="text-sm text-muted-foreground">{partner.description}</p>
                               </CardContent>
                               <CardFooter>
                                   <Button variant="outline" className={cn("w-full", partner.buttonClassName)}>{partner.buttonText} <ArrowRight className="ml-2 w-4 h-4"/></Button>
                               </CardFooter>
                            </Card>
                        </Link>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}
