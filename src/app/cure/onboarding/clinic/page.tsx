
'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import BrandLogo from '@/components/brand-logo'
import { useDb } from '@/firebase/client-provider'
import { collection, addDoc, serverTimestamp, query, where, getDocs, limit } from "firebase/firestore";
import { ArrowLeft } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'


export default function ClinicOnboardingPage() {
    const { toast } = useToast()
    const router = useRouter()
    const db = useDb();
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        if (!db) {
            toast({ variant: 'destructive', title: 'Database Error' });
            setIsLoading(false);
            return;
        }

        const formData = new FormData(e.target as HTMLFormElement);
        const data = Object.fromEntries(formData.entries());

        if (!data.clinicName || !data.clinicPhone || !data.doctorName || !data.doctorRegNo) {
            toast({ variant: 'destructive', title: "Incomplete Form", description: "Please fill all required fields." });
            setIsLoading(false);
            return;
        }
        
        const q = query(collection(db, "ambulances"), where("phone", "==", data.clinicPhone), limit(1));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            toast({ variant: 'destructive', title: "Already Registered", description: `A facility with this phone number is already registered.` });
            setIsLoading(false);
            return;
        }

        try {
            const partnerId = `CZ-CLINIC-${(data.clinicPhone as string).slice(-4)}`;
            await addDoc(collection(db, "ambulances"), {
                name: data.clinicName,
                phone: data.clinicPhone,
                businessType: 'Clinic',
                clinicType: data.clinicType,
                doctorName: data.doctorName,
                doctorRegNo: data.doctorRegNo,
                specialization: data.specialization,
                partnerId: partnerId,
                type: 'cure',
                status: 'pending_verification',
                isOnline: false,
                createdAt: serverTimestamp(),
            });
            
            toast({
                title: "Application Submitted!",
                description: `Thank you, ${data.clinicName}. Your application is under review.`,
            });

             setTimeout(() => {
                router.push(`/login?role=cure&phone=${encodeURIComponent(data.clinicPhone as string)}`);
            }, 1500);

        } catch (error) {
            console.error("Error during Clinic onboarding: ", error);
            toast({ variant: 'destructive', title: "Submission Failed", description: "Something went wrong." });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-muted/40">
            <Card className="w-full max-w-2xl">
                <CardHeader className="text-center">
                    <div className="mx-auto"><BrandLogo className="text-5xl justify-center" /></div>
                    <CardTitle className="text-3xl mt-4">Clinic / Center Onboarding</CardTitle>
                    <CardDescription>
                       A simplified form for clinics, polyclinics, and diagnostic centers.
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="clinicType">Facility Type*</Label>
                                <Select name="clinicType" required>
                                    <SelectTrigger><SelectValue placeholder="Select type"/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Single-Doctor Clinic">Single-Doctor Clinic</SelectItem>
                                        <SelectItem value="Polyclinic">Polyclinic</SelectItem>
                                        <SelectItem value="Diagnostic Center">Diagnostic Center</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="clinicName">Clinic/Center Name*</Label>
                                <Input id="clinicName" name="clinicName" required />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="clinicPhone">Contact Number*</Label>
                                <Input id="clinicPhone" name="clinicPhone" type="tel" required />
                            </div>
                        </div>
                        <div className="border-t pt-6 space-y-6">
                             <h3 className="text-lg font-medium">Lead Doctor's Details</h3>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="doctorName">Doctor's Full Name*</Label>
                                    <Input id="doctorName" name="doctorName" required />
                                </div>
                                 <div className="space-y-2">
                                    <Label htmlFor="specialization">Specialization</Label>
                                    <Input id="specialization" name="specialization" placeholder="e.g., General Physician" />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="doctorRegNo">Medical Registration No.*</Label>
                                    <Input id="doctorRegNo" name="doctorRegNo" required />
                                </div>
                             </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex-col gap-4">
                        <Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? 'Submitting...' : 'Submit Application'}</Button>
                        <Button asChild variant="link" className="text-muted-foreground">
                            <Link href="/cure/onboarding"><ArrowLeft className="mr-2 h-4 w-4" />Back to Partner Type Selection</Link>
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
