'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import BrandLogo from '@/components/shared/brand-logo'
import { Car, Wrench, Ambulance, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const partnerOptions = [
  {
    icon: Car,
    title: "Path Partner (Driver)",
    description: "Drive with 0% commission and maximize your earnings on every ride.",
    href: "/driver/onboarding",
    cta: "Start Earning",
    iconBgClass: "bg-primary/10",
    iconColorClass: "text-primary",
  },
  {
    icon: Wrench,
    title: "ResQ Partner (Mechanic)",
    description: "Provide on-demand roadside assistance to our network of drivers.",
    href: "/mechanic/onboarding",
    cta: "Provide Service",
    iconBgClass: "bg-amber-500/10",
    iconColorClass: "text-amber-600",
  },
  {
    icon: Ambulance,
    title: "Cure Partner (Hospital)",
    description: "Integrate your ambulance fleet with our emergency response network.",
    href: "/cure/onboarding",
    cta: "Save Lives",
    iconBgClass: "bg-red-500/10",
    iconColorClass: "text-red-600",
  },
]

export default function PartnerHubPage() {
  const router = useRouter()
  return (
    <div className="relative min-h-screen w-full lg:grid lg:grid-cols-2">
      <div className="relative hidden flex-col items-center justify-center bg-muted p-10 text-foreground lg:flex">
         <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/20" />
         <div className="relative z-20 flex flex-col items-center text-center">
            <BrandLogo hideText={false} iconClassName="w-20 h-20" />
            <h1 className="mt-6 text-4xl font-bold tracking-tighter">
                Become a Partner in Progress
            </h1>
            <p className="mt-2 max-w-sm text-muted-foreground">
                Join an ecosystem built on fairness, security, and growth. Your journey to empowerment starts here.
            </p>
         </div>
      </div>
       <div className="flex items-center justify-center p-6 lg:p-8">
            <div className="mx-auto w-full max-w-md space-y-6">
                <div className="text-center">
                    <h1 className="text-3xl font-bold tracking-tight">Choose Your Partnership</h1>
                    <p className="mt-2 text-muted-foreground">
                        Select the role that best fits you or your business.
                    </p>
                </div>
                 <div className="space-y-4">
                    {partnerOptions.map((opt) => (
                         <Card 
                            key={opt.title} 
                            className="group cursor-pointer transition-all duration-300 hover:border-primary/50 hover:shadow-lg" 
                            onClick={() => router.push(opt.href)}
                        >
                            <CardContent className="flex items-center gap-4 p-4">
                                <div className={cn("p-3 rounded-full bg-muted transition-colors", opt.iconBgClass)}>
                                    <opt.icon className={cn("w-6 h-6 text-primary", opt.iconColorClass)} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold">{opt.title}</h3>
                                    <p className="text-xs text-muted-foreground">{opt.description}</p>
                                </div>
                                <ArrowRight className="w-5 h-5 text-muted-foreground/50 transition-transform group-hover:translate-x-1" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
                <div className="text-center text-sm text-muted-foreground">
                    Already a partner?{' '}
                    <a href="/partner-login" className="font-semibold text-primary underline-offset-4 hover:underline">
                        Login here
                    </a>
                </div>
            </div>
      </div>
    </div>
  )
}
