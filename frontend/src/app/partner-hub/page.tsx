
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
    cta: "Join as a Path Partner",
    className: 'hover:border-primary hover:shadow-blue-500/10',
  },
  {
    icon: Wrench,
    title: "ResQ Partner (Mechanic / Garage)",
    description: "Provide on-demand roadside assistance. For individual mechanics and garages.",
    href: "/mechanic/onboarding",
    cta: "Join as ResQ Partner",
    className: 'hover:border-amber-500 hover:shadow-amber-500/10',
  },
  {
    icon: Ambulance,
    title: "Cure Partner (Hospital / Clinic)",
    description: "Integrate your ambulance fleet and doctors with our emergency response network.",
    href: "/cure/onboarding",
    cta: "Join as Cure Partner",
    className: 'hover:border-destructive hover:shadow-red-500/10',
  },
]

export default function PartnerHubPage() {
  const router = useRouter()
  return (
    <div className="flex min-h-screen items-center justify-center p-4 aurora-background">
      <Card className="w-full max-w-4xl">
        <CardHeader className="text-center">
          <div className="mx-auto flex w-fit items-center justify-center rounded-full bg-primary/10 p-2">
            <BrandLogo hideText={true} />
          </div>
          <CardTitle className="text-3xl font-bold pt-4">Join the Curocity Partner Network</CardTitle>
          <CardDescription>Choose your partnership path and start a new journey with us.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
          {partnerOptions.map((opt) => (
            <Card 
              key={opt.title} 
              className={cn("flex flex-col hover:ring-2 hover:ring-primary cursor-pointer transition-all duration-300", opt.className)} 
              onClick={() => router.push(opt.href)}
            >
              <CardHeader className="items-center text-center">
                <div className={cn("p-3 rounded-full bg-primary/10")}>
                   <opt.icon className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="pt-2 text-xl">{opt.title}</CardTitle>
                <CardDescription className="text-xs h-10">{opt.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col justify-end">
                 <Button className="w-full mt-auto" onClick={(e) => { e.stopPropagation(); router.push(opt.href); }}>
                  {opt.cta} <ArrowRight className="w-4 h-4 ml-2"/>
                </Button>
              </CardContent>
            </Card>
          ))}
        </CardContent>
         <CardFooter className="text-center flex justify-center">
          <p className="text-sm text-muted-foreground">Already a partner? <a href="/partner-login" className="underline font-semibold text-primary">Login here</a></p>
        </CardFooter>
      </Card>
    </div>
  )
}
