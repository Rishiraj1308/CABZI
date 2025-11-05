
'use client'

import React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Hospital, Stethoscope, ArrowLeft } from 'lucide-react'
import BrandLogo from '@/components/brand-logo'

export default function CureOnboardingSelectionPage() {
    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-muted/40">
            <Card className="w-full max-w-2xl text-center">
                <CardHeader>
                    <div className="mx-auto">
                        <Link href="/partner-hub"><BrandLogo iconClassName="w-12 h-12" /></Link>
                    </div>
                    <CardTitle className="text-3xl mt-4">Onboard as a Cure Partner</CardTitle>
                    <CardDescription>
                        To get started, please select your facility type.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
                    <Link href="/cure/onboarding/hospital" className="block">
                        <Card className="hover:border-primary hover:shadow-lg transition-all h-full flex flex-col items-center justify-center p-8">
                            <Hospital className="w-16 h-16 text-primary mb-4" />
                            <h3 className="text-xl font-bold">Hospital</h3>
                            <p className="text-sm text-muted-foreground mt-2">For multi-specialty, private, or government hospitals with emergency services.</p>
                        </Card>
                    </Link>
                    <Link href="/cure/onboarding/clinic" className="block">
                        <Card className="hover:border-primary hover:shadow-lg transition-all h-full flex flex-col items-center justify-center p-8">
                            <Stethoscope className="w-16 h-16 text-primary mb-4" />
                            <h3 className="text-xl font-bold">Clinic / Center</h3>
                            <p className="text-sm text-muted-foreground mt-2">For single-doctor clinics, polyclinics, or diagnostic centers.</p>
                        </Card>
                    </Link>
                </CardContent>
                 <CardFooter>
                    <Button asChild variant="link" className="w-full text-muted-foreground">
                        <Link href="/partner-hub">
                            <ArrowLeft className="mr-2 h-4 w-4" />Back to Partner Hub
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
