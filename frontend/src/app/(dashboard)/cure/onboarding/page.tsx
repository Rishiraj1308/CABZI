
'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import BrandLogo from '@/components/shared/brand-logo';
import { useDb } from '@/lib/firebase/client-provider';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, UploadCloud } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

const LiveMap = dynamic(() => import('@/components/live-map'), {
    ssr: false,
    loading: () => <Skeleton className="w-full h-full bg-muted" />,
});

const hospitalServices = ["24/7 Emergency", "ICU", "Ambulance", "Pharmacy", "Radiology (X-Ray/CT)", "Pathology Lab"];
const hospitalDepts = ["General Medicine", "Cardiology", "Orthopedics", "Neurology", "Pediatrics", "Gynecology", "Dermatology", "ENT"];

export default function CureOnboardingPage() {
    const router = useRouter();
    const db = useDb();
    const [isLoading, setIsLoading] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const totalSteps = 4;
    
    const [formData, setFormData] = useState({
        businessType: 'Hospital',
        name: '',
        ownerName: '',
        ownerEmail: '',
        phone: '',
        registrationNumber: '',
        hospitalType: '',
        clinicType: '',
        doctorName: '',
        doctorRegNo: '',
        address: '',
        location: null as { lat: number; lon: number } | null,
        services: [] as string[],
        departments: [] as string[],
        blsAmbulances: 0,
        alsAmbulances: 0,
        cardiacAmbulances: 0,
    });

    const handleInputChange = (field: keyof typeof formData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };
    
    const handleCheckboxChange = (group: 'services' | 'departments', item: string, checked: boolean) => {
        setFormData(prev => ({
            ...prev,
            [group]: checked ? [...prev[group], item] : prev[group].filter(i => i !== item)
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
            const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
            const idPrefix = formData.businessType === 'Hospital' ? `CZH-${randomSuffix}` : `CZC-${randomSuffix}`;
            
            const docRef = doc(db, 'curePartners', idPrefix);

            const dataToSave = { ...formData, partnerId: idPrefix, status: 'pending_verification', createdAt: serverTimestamp(), isOnline: false };
            
            await setDoc(docRef, dataToSave);

            toast.success("Application Submitted!", { description: "Your facility details have been sent for verification." });
            router.push('/partner-login');

        } catch (error) {
            console.error("Error submitting Cure onboarding:", error);
            toast.error("Submission Failed");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchLocation = useCallback(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    handleInputChange('location', { lat: latitude, lon: longitude });
                },
                (error) => {
                    toast.error("Location Error", { description: "Could not get your location. Please pin it manually."});
                },
                { enableHighAccuracy: true }
            );
        }
    }, []);

    useEffect(() => {
        if (currentStep === 2 && !formData.location) {
            fetchLocation();
        }
    }, [currentStep, formData.location, fetchLocation]);

    const handleMapMarkerDrag = async (newLocation: { lat: number; lon: number }) => {
        handleInputChange('location', newLocation);
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${newLocation.lat}&lon=${newLocation.lon}`);
            const data = await response.json();
            if (data.display_name) {
                handleInputChange('address', data.display_name);
            }
        } catch (error) {
            console.error("Error fetching address from coords:", error);
        }
    };
    
    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2 col-span-2"><Label>Facility Type</Label><Select required onValueChange={(v) => handleInputChange('businessType', v)} value={formData.businessType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Hospital">Hospital</SelectItem><SelectItem value="Clinic">Clinic</SelectItem></SelectContent></Select></div>
                        <div className="space-y-2 col-span-2"><Label>Facility Name</Label><Input required value={formData.name} onChange={e => handleInputChange('name', e.target.value)}/></div>
                        <div className="space-y-2"><Label>Owner Name</Label><Input required value={formData.ownerName} onChange={e => handleInputChange('ownerName', e.target.value)}/></div>
                        <div className="space-y-2">
                           <Label>Official Phone</Label>
                            <div className="flex items-center gap-0 rounded-md border border-input focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                                <span className="pl-3 text-muted-foreground text-sm">+91</span>
                                <Input required type="tel" maxLength={10} placeholder="12345 67890" value={formData.phone} onChange={e => handleInputChange('phone', e.target.value)} className="border-0 h-9 focus-visible:ring-0 focus-visible:ring-offset-0 flex-1" />
                            </div>
                        </div>
                        <div className="space-y-2 col-span-2"><Label>Official Email</Label><Input required type="email" value={formData.ownerEmail} onChange={e => handleInputChange('ownerEmail', e.target.value)}/></div>
                        <div className="space-y-2"><Label>Registration Number</Label><Input required value={formData.registrationNumber} onChange={e => handleInputChange('registrationNumber', e.target.value)}/></div>
                        {formData.businessType === 'Hospital' ? (
                             <div className="space-y-2"><Label>Hospital Type</Label><Select required onValueChange={(v) => handleInputChange('hospitalType', v)} value={formData.hospitalType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Multi-Specialty">Multi-Specialty</SelectItem><SelectItem value="Super-Specialty">Super-Specialty</SelectItem><SelectItem value="General">General</SelectItem><SelectItem value="Govt Hospital">Govt Hospital</SelectItem></SelectContent></Select></div>
                        ) : (
                             <div className="space-y-2"><Label>Clinic Type</Label><Select required onValueChange={(v) => handleInputChange('clinicType', v)} value={formData.clinicType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Private Clinic">Private Clinic</SelectItem><SelectItem value="Polyclinic">Polyclinic</SelectItem><SelectItem value="Govt. Dispensary">Govt. Dispensary</SelectItem></SelectContent></Select></div>
                        )}
                         {formData.businessType === 'Clinic' && (
                            <>
                                <div className="space-y-2"><Label>Lead Doctor Name</Label><Input required value={formData.doctorName} onChange={e => handleInputChange('doctorName', e.target.value)}/></div>
                                <div className="space-y-2"><Label>Lead Doctor Medical Reg. No.</Label><Input required value={formData.doctorRegNo} onChange={e => handleInputChange('doctorRegNo', e.target.value)}/></div>
                            </>
                         )}
                    </div>
                );
            case 2:
                return (
                     <div>
                        <Label>Pin your location on the map</Label>
                        <div className="h-64 mt-2 rounded-lg overflow-hidden border">
                            <LiveMap 
                                activePartners={[]}
                                center={formData.location ? [formData.location.lat, formData.location.lon] : undefined}
                                onMarkerDrag={handleMapMarkerDrag}
                                isDraggable={true}
                            />
                        </div>
                        <div className="mt-4">
                            <Label>Detected Address</Label>
                            <Input value={formData.address} readOnly placeholder="Address will appear here..." />
                        </div>
                    </div>
                )
            case 3:
                return (
                    <div className="space-y-6">
                        <div><Label>Services Offered</Label><div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">{hospitalServices.map(s => <div key={s} className="flex items-center space-x-2"><Checkbox id={`s-${s}`} checked={formData.services.includes(s)} onCheckedChange={(c) => handleCheckboxChange('services', s, c as boolean)} /><label htmlFor={`s-${s}`} className="text-sm font-medium">{s}</label></div>)}</div></div>
                        <div><Label>Departments Available</Label><div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">{hospitalDepts.map(d => <div key={d} className="flex items-center space-x-2"><Checkbox id={`d-${d}`} checked={formData.departments.includes(d)} onCheckedChange={(c) => handleCheckboxChange('departments', d, c as boolean)} /><label htmlFor={`d-${d}`} className="text-sm font-medium">{d}</label></div>)}</div></div>
                        {formData.businessType === 'Hospital' && (
                             <div>
                                <Label>Ambulance Fleet Size</Label>
                                <div className="grid grid-cols-3 gap-4 mt-2">
                                    <div className="space-y-1"><Label htmlFor="bls" className="text-xs">BLS</Label><Input id="bls" type="number" min={0} value={formData.blsAmbulances} onChange={e => handleInputChange('blsAmbulances', parseInt(e.target.value))}/></div>
                                    <div className="space-y-1"><Label htmlFor="als" className="text-xs">ALS</Label><Input id="als" type="number" min={0} value={formData.alsAmbulances} onChange={e => handleInputChange('alsAmbulances', parseInt(e.target.value))}/></div>
                                    <div className="space-y-1"><Label htmlFor="cardiac" className="text-xs">Cardiac</Label><Input id="cardiac" type="number" min={0} value={formData.cardiacAmbulances} onChange={e => handleInputChange('cardiacAmbulances', parseInt(e.target.value))}/></div>
                                </div>
                             </div>
                        )}
                    </div>
                );
            case 4:
                return (
                    <div className="space-y-4">
                        <Label>Upload Documents</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div className="flex items-center justify-center w-full p-6 border-2 border-dashed rounded-lg text-center text-muted-foreground flex-col gap-2"><UploadCloud className="w-8 h-8" /><p className="text-sm">Hospital Registration Cert.</p></div>
                           <div className="flex items-center justify-center w-full p-6 border-2 border-dashed rounded-lg text-center text-muted-foreground flex-col gap-2"><UploadCloud className="w-8 h-8" /><p className="text-sm">Fire & Safety Certificate</p></div>
                        </div>
                    </div>
                );
        }
    };
    
    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-muted/40">
            <Card className="w-full max-w-2xl">
                <CardHeader>
                    <CardTitle className="text-center">Become a Cure Partner</CardTitle>
                    <CardDescription className="text-center">Step {currentStep} of {totalSteps}: {["Business Details", "Location", "Services", "Documents"][currentStep-1]}</CardDescription>
                    <div className="pt-4"><Progress value={(currentStep / totalSteps) * 100} /></div>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="min-h-[350px]">
                        {renderStepContent()}
                    </CardContent>
                    <CardFooter className="flex-col gap-4">
                        <div className="w-full flex justify-between">
                            <Button type="button" variant="outline" onClick={handlePrevStep} disabled={currentStep === 1}><ArrowLeft className="w-4 h-4 mr-2"/> Previous</Button>
                            {currentStep < totalSteps && <Button type="button" onClick={handleNextStep}>Next Step <ArrowLeft className="w-4 h-4 ml-2 rotate-180"/></Button>}
                            {currentStep === totalSteps && <Button type="submit" disabled={isLoading}>{isLoading ? 'Submitting...' : 'Finish & Submit'}</Button>}
                        </div>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
