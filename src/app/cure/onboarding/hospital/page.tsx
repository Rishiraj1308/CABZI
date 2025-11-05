
'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import BrandLogo from '@/components/brand-logo'
import { useFirebase } from '@/firebase/client-provider'
import { collection, addDoc, serverTimestamp, GeoPoint, query, where, getDocs, limit } from "firebase/firestore";
import { ArrowLeft } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from 'firebase/auth'

const LiveMap = dynamic(() => import('@/components/live-map'), {
    ssr: false,
    loading: () => <Skeleton className="w-full h-full bg-muted" />,
});

const serviceCategories = [
    { id: 'consultation', label: 'General Consultation' },
    { id: 'emergency', label: '24/7 Emergency Care' },
    { id: 'ipd', label: 'In-Patient Services (IPD)' },
    { id: 'pharmacy', label: 'Pharmacy' },
    { id: 'diagnostics', label: 'Lab / Diagnostics' },
    { id: 'icu', label: 'ICU / Critical Care' },
    { id: 'minor_ot', label: 'Minor OT / Surgery' },
    { id: 'ambulance', label: 'Ambulance Services' },
];


export default function HospitalOnboardingPage() {
    const { toast } = useToast()
    const router = useRouter()
    const { db, auth } = useFirebase();
    const [isLoading, setIsLoading] = useState(false)
    const [currentStep, setCurrentStep] = useState(1);
    const totalSteps = 5;
    const mapRef = useRef<any>(null);
    const [selectedServices, setSelectedServices] = useState<string[]>([]);
    
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
    const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
    const recaptchaContainerRef = useRef<HTMLDivElement>(null);


    const [formData, setFormData] = useState({
        // Step 1: Phone
        phone: '',
        otp: '',
        // Step 2: Owner
        ownerName: '',
        ownerEmail: '',
        ownerAltPhone: '',
        // Step 3: Facility
        clinicName: '',
        clinicRegNo: '',
        issuingAuthority: '',
        // Step 4: Location & Services
        address: '',
        location: null as { lat: number, lon: number } | null,
        // Step 5: Final
        agreedToTerms: false,
    });

     // Initialize Recaptcha only once
    useEffect(() => {
        if (auth && recaptchaContainerRef.current && !recaptchaVerifierRef.current) {
            recaptchaVerifierRef.current = new RecaptchaVerifier(auth, recaptchaContainerRef.current, { size: 'invisible' });
        }
    }, [auth]);
    
    const handleInputChange = (field: keyof typeof formData, value: string | boolean) => {
        setFormData(prev => ({...prev, [field]: value}));
    };
    
    const handleNextStep = async () => {
        if (currentStep === 1) { // Send OTP
            if (formData.phone.length !== 10) {
                toast({ variant: 'destructive', title: 'Invalid Phone Number' });
                return;
            }
            setIsLoading(true);
            try {
                if (!auth || !recaptchaVerifierRef.current) throw new Error("Auth not ready");
                const fullPhoneNumber = `+91${formData.phone}`;
                const confirmation = await signInWithPhoneNumber(auth, fullPhoneNumber, recaptchaVerifierRef.current);
                setConfirmationResult(confirmation);
                toast({ title: 'OTP Sent!', description: `An OTP has been sent to ${fullPhoneNumber}.` });
                setCurrentStep(2);
            } catch (error) {
                toast({ variant: 'destructive', title: 'Failed to Send OTP', description: 'Please check the number or try again later.' });
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        } else if (currentStep === 2) { // Verify OTP
            if (!confirmationResult || formData.otp.length !== 6) {
                toast({ variant: 'destructive', title: 'Invalid OTP' });
                return;
            }
            setIsLoading(true);
            try {
                await confirmationResult.confirm(formData.otp);
                toast({ title: 'Phone Verified!', className: 'bg-green-600 text-white border-green-600'});
                setCurrentStep(3);
            } catch (error) {
                 toast({ variant: 'destructive', title: 'OTP Verification Failed' });
            } finally {
                setIsLoading(false);
            }
        }
        else {
             setCurrentStep(prev => prev + 1);
        }
    };

    const handlePrevStep = () => setCurrentStep(prev => prev - 1);
    
    const handleLocationSelect = async () => {
        if (mapRef.current) {
            const center = mapRef.current.getCenter();
            if (center) {
                const address = await mapRef.current.getAddress(center.lat, center.lng);
                handleInputChange('address', address || 'Could not fetch address');
                handleInputChange('location', { lat: center.lat, lon: center.lng });
                toast({ title: "Location Confirmed!", description: address });
            }
        }
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if(!formData.agreedToTerms) {
            toast({ variant: 'destructive', title: "Agreement Required", description: "You must agree to the terms and conditions to proceed." });
            return;
        }

        setIsLoading(true);

        if (!db) {
            toast({ variant: 'destructive', title: 'Database Error' });
            setIsLoading(false);
            return;
        }

        try {
            const { agreedToTerms, otp, ...restOfData } = formData;
            const q = query(collection(db, "ambulances"), where("phone", "==", formData.phone), limit(1));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                toast({ variant: 'destructive', title: "Already Registered", description: `A facility with this phone number is already registered.` });
                setIsLoading(false);
                return;
            }
            
            const partnerId = `CZ-HOSP-${formData.phone.slice(-4)}`;

            await addDoc(collection(db, "ambulances"), {
                ...restOfData,
                partnerId: partnerId,
                services: selectedServices,
                location: new GeoPoint(formData.location!.lat, formData.location!.lon),
                businessType: 'Hospital',
                name: formData.clinicName,
                type: 'cure',
                status: 'pending_verification',
                isOnline: false,
                createdAt: serverTimestamp(),
            });
            
            toast({
                title: "Application Submitted!",
                description: `Thank you, ${formData.clinicName}. Your application is under review.`,
            });
            
            setTimeout(() => {
                router.push(`/login?role=cure&phone=${encodeURIComponent(formData.phone)}`);
            }, 1500);

        } catch (error) {
            console.error("Error during Cure onboarding: ", error);
            toast({ variant: 'destructive', title: "Submission Failed", description: "Something went wrong." });
            setIsLoading(false);
        }
    }
    
    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="space-y-4">
                        <Label htmlFor="phone">Enter Hospital's Official Phone Number*</Label>
                        <div className="flex items-center gap-0 rounded-md border border-input focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                            <span className="pl-3 text-muted-foreground text-sm">+91</span>
                            <Input id="phone" name="phone" type="tel" maxLength={10} placeholder="12345 67890" required className="border-0 h-9 focus-visible:ring-0 focus-visible:ring-offset-0 flex-1" value={formData.phone} onChange={(e) => handleInputChange('phone', e.target.value)} />
                        </div>
                    </div>
                )
            case 2:
                return (
                    <div className="space-y-4">
                        <Label htmlFor="otp">Enter OTP*</Label>
                        <Input id="otp" name="otp" type="tel" maxLength={6} placeholder="Enter the 6-digit OTP" required value={formData.otp} onChange={(e) => handleInputChange('otp', e.target.value)} />
                    </div>
                )
            case 3:
                 return (
                    <div className="space-y-6">
                        <h3 className="font-semibold text-lg border-b pb-2">Owner / Contact Person's Details</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2"><Label htmlFor="ownerName">Full Name*</Label><Input id="ownerName" name="ownerName" value={formData.ownerName} onChange={(e) => handleInputChange('ownerName', e.target.value)} required /></div>
                            <div className="space-y-2"><Label htmlFor="ownerEmail">Email ID*</Label><Input id="ownerEmail" name="ownerEmail" type="email" value={formData.ownerEmail} onChange={(e) => handleInputChange('ownerEmail', e.target.value)} required /></div>
                             <div className="space-y-2"><Label htmlFor="ownerAltPhone">Alternate Phone (Optional)</Label><Input id="ownerAltPhone" name="ownerAltPhone" type="tel" value={formData.ownerAltPhone} onChange={(e) => handleInputChange('ownerAltPhone', e.target.value)} /></div>
                        </div>
                    </div>
                );
            case 4:
                return (
                     <div className="space-y-6">
                        <h3 className="font-semibold text-lg border-b pb-2">Hospital Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div className="space-y-2 md:col-span-2"><Label htmlFor="clinicName">Hospital Name*</Label><Input id="clinicName" name="clinicName" value={formData.clinicName} onChange={(e) => handleInputChange('clinicName', e.target.value)} required /></div>
                            <div className="space-y-2"><Label htmlFor="clinicRegNo">Hospital Registration Number*</Label><Input id="clinicRegNo" name="clinicRegNo" value={formData.clinicRegNo} onChange={(e) => handleInputChange('clinicRegNo', e.target.value)} required /></div>
                            <div className="space-y-2"><Label htmlFor="issuingAuthority">Issuing Authority*</Label><Input id="issuingAuthority" name="issuingAuthority" placeholder="e.g., Delhi Medical Council" value={formData.issuingAuthority} onChange={(e) => handleInputChange('issuingAuthority', e.target.value)} required /></div>
                        </div>
                    </div>
                );
            case 5:
                return (
                     <div className="space-y-6">
                         <div className="space-y-2">
                            <Label className="font-semibold text-lg">Set Hospital Location*</Label>
                            <CardDescription>Drag the map to pin your exact location.</CardDescription>
                            <div className="h-48 w-full rounded-md overflow-hidden border">
                                <LiveMap ref={mapRef} onLocationFound={(addr, coords) => {
                                    handleInputChange('address', addr);
                                    handleInputChange('location', coords);
                                }} />
                            </div>
                            <Button type="button" className="w-full" onClick={handleLocationSelect}>Confirm My Location on Map</Button>
                            {formData.address && <p className="text-sm text-green-600 font-medium text-center">{formData.address}</p>}
                        </div>
                         <div className="flex items-start space-x-2 pt-4">
                            <Checkbox id="terms" checked={!!formData.agreedToTerms} onCheckedChange={(checked) => handleInputChange('agreedToTerms', !!checked)} />
                            <Label htmlFor="terms" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                              I agree to Curocity's terms & conditions and consent to the verification of all documents and credentials provided.
                            </Label>
                        </div>
                    </div>
                );
        }
    }

    const stepTitles = ["Verify Phone", "Verify OTP", "Owner Details", "Facility Details", "Location & Final Submit"];

    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-muted/40">
            <div id="recaptcha-container" ref={recaptchaContainerRef}></div>
            <Card className="w-full max-w-2xl">
                <CardHeader className="text-center">
                    <div className="mx-auto"><BrandLogo className="text-5xl justify-center" /></div>
                    <CardTitle className="text-3xl mt-4">Hospital Onboarding</CardTitle>
                    <CardDescription>
                       Step {currentStep} of {totalSteps}: {stepTitles[currentStep - 1]}
                    </CardDescription>
                     <div className="px-10 pt-4">
                        <Progress value={(currentStep / totalSteps) * 100} className="w-full" />
                    </div>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="min-h-[250px] flex flex-col justify-center">
                       {renderStepContent()}
                    </CardContent>
                    <CardFooter className="flex-col gap-4">
                        <div className="w-full flex justify-between">
                            <Button type="button" variant="outline" onClick={handlePrevStep} disabled={currentStep === 1}>Previous Step</Button>
                            {currentStep < totalSteps ? (
                                <Button type="button" onClick={handleNextStep} disabled={isLoading}>
                                    {isLoading ? 'Verifying...' : 'Next Step'}
                                </Button>
                            ) : (
                                <Button type="submit" disabled={isLoading}>{isLoading ? 'Submitting...' : 'Submit Application'}</Button>
                            )}
                        </div>
                        <Button asChild variant="link" className="text-muted-foreground">
                            <Link href="/cure/onboarding"><ArrowLeft className="mr-2 h-4 w-4" />Back to Partner Type Selection</Link>
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}

