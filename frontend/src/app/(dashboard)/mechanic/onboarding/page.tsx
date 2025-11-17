
'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import Link from 'next/link';
import BrandLogo from '@/components/shared/brand-logo';
import { useDb } from '@/lib/firebase/client-provider';
import { collection, doc, setDoc, serverTimestamp, query, where, getDocs, limit } from 'firebase/firestore';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, UploadCloud, MapPin, Wrench } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const LiveMap = dynamic(() => import('@/components/live-map'), {
    ssr: false,
    loading: () => <Skeleton className="w-full h-full bg-muted" />,
});

const mechanicServices = [
    { id: 'tyre', label: 'Tyre Puncture / Flat Tyre' },
    { id: 'battery', label: 'Battery Jump-Start' },
    { id: 'engine', label: 'Minor Engine Repair' },
    { id: 'towing', label: 'Towing Service' },
    { id: 'fuel', label: 'Emergency Fuel Delivery' },
    { id: 'inspection', label: 'General Inspection' },
];

export default function MechanicOnboardingPage() {
    const router = useRouter();
    const db = useDb();
    const [isLoading, setIsLoading] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const totalSteps = 3;

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        panCard: '',
        aadhaarNumber: '',
        garageName: '',
        isMobileMechanic: true,
        workshopLocation: null as { lat: number; lon: number } | null,
        services: [] as string[],
    });

    const handleInputChange = (field: keyof typeof formData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleCheckboxChange = (item: string, checked: boolean) => {
        setFormData(prev => ({
            ...prev,
            services: checked ? [...prev.services, item] : prev.services.filter(i => i !== item)
        }));
    };
    
    const handleNextStep = () => setCurrentStep(prev => prev < totalSteps ? prev + 1 : prev);
    const handlePrevStep = () => setCurrentStep(prev => prev > 1 ? prev - 1 : prev);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        if (!db) {
            toast.error("Database Error");
            setIsLoading(false);
            return;
        }

        try {
            const systematicId = `CZR-${formData.phone.slice(-4)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
            const docRef = doc(db, 'mechanics', systematicId);

            await setDoc(docRef, {
                ...formData,
                partnerId: systematicId,
                status: 'pending_verification',
                isOnline: false,
                createdAt: serverTimestamp(),
            });

            toast.success("Application Submitted!", { description: "Your details have been sent for verification." });
            router.push('/partner-login');

        } catch (error) {
            console.error("Error submitting mechanic onboarding:", error);
            toast.error("Submission Failed");
        } finally {
            setIsLoading(false);
        }
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2 col-span-2"><Label>Full Name*</Label><Input required value={formData.name} onChange={e => handleInputChange('name', e.target.value)} /></div>
                        <div className="space-y-2"><Label>Phone Number*</Label><Input required type="tel" value={formData.phone} onChange={e => handleInputChange('phone', e.target.value)} /></div>
                        <div className="space-y-2"><Label>PAN Card*</Label><Input required value={formData.panCard} onChange={e => handleInputChange('panCard', e.target.value)} /></div>
                        <div className="space-y-2"><Label>Aadhaar Number*</Label><Input required value={formData.aadhaarNumber} onChange={e => handleInputChange('aadhaarNumber', e.target.value)} /></div>
                        <div className="space-y-2"><Label>Garage/Workshop Name (Optional)</Label><Input value={formData.garageName} onChange={e => handleInputChange('garageName', e.target.value)} /></div>
                    </div>
                );
            case 2:
                return (
                     <div className="space-y-4">
                        <Label>Services Offered*</Label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                           {mechanicServices.map(service => (
                             <div key={service.id} className="flex items-center space-x-2 p-2 bg-muted/50 rounded-md">
                               <Checkbox id={service.id} checked={formData.services.includes(service.label)} onCheckedChange={(c) => handleCheckboxChange(service.label, c as boolean)} />
                               <label htmlFor={service.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{service.label}</label>
                             </div>
                           ))}
                        </div>
                    </div>
                );
            case 3:
                return (
                     <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <Checkbox id="isMobileMechanic" checked={formData.isMobileMechanic} onCheckedChange={(c) => handleInputChange('isMobileMechanic', c)} />
                            <Label htmlFor="isMobileMechanic">I am a mobile mechanic (I travel to the customer)</Label>
                        </div>
                        {!formData.isMobileMechanic && (
                             <div className="space-y-2">
                                <Label>Pin your workshop location on the map</Label>
                                <div className="h-48 mt-2 rounded-lg overflow-hidden border">
                                    <LiveMap activePartners={[]} />
                                </div>
                             </div>
                        )}
                         <div className="space-y-2 pt-4">
                            <Label>Upload Documents</Label>
                            <div className="flex items-center justify-center w-full p-6 border-2 border-dashed rounded-lg text-center text-muted-foreground flex-col gap-2">
                                <UploadCloud className="w-8 h-8" />
                                <p>Upload ID & Shop License</p>
                            </div>
                        </div>
                    </div>
                );
        }
    };
    
    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-muted/40">
            <Card className="w-full max-w-2xl">
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl font-bold pt-4 flex items-center justify-center gap-2"><Wrench className="w-8 h-8 text-amber-500"/>Become a ResQ Partner</CardTitle>
                    <CardDescription>Step {currentStep} of {totalSteps}: {["Personal Info", "Services", "Location & Docs"][currentStep-1]}</CardDescription>
                    <div className="pt-4"><Progress value={(currentStep / totalSteps) * 100} /></div>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="min-h-[300px]">
                        {renderStepContent()}
                    </CardContent>
                    <CardFooter className="flex-col gap-4">
                        <div className="w-full flex justify-between">
                            <Button type="button" variant="outline" onClick={handlePrevStep} disabled={currentStep === 1}><ArrowLeft className="w-4 h-4 mr-2"/> Previous</Button>
                            {currentStep < totalSteps && <Button type="button" onClick={handleNextStep}>Next Step</Button>}
                            {currentStep === totalSteps && <Button type="submit" disabled={isLoading}>{isLoading ? 'Submitting...' : 'Finish Onboarding'}</Button>}
                        </div>
                         <p className="text-xs text-muted-foreground pt-2">Already a partner? <Link href="/partner-login" className="text-primary underline">Log in</Link></p>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
