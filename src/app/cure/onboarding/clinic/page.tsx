
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
import { collection, addDoc, serverTimestamp, query, where, getDocs, limit, GeoPoint } from "firebase/firestore";
import { ArrowLeft, UploadCloud } from 'lucide-react'
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

const clinicServices = [
    { id: 'opd', label: 'OPD Consultation' },
    { id: 'first_aid', label: 'First-Aid / Minor Injury Care' },
    { id: 'pharmacy', label: 'In-house Pharmacy' },
    { id: 'pathology', label: 'Basic Pathology / Blood Tests' },
]

export default function ClinicOnboardingPage() {
    const { toast } = useToast()
    const router = useRouter()
    const { db, auth } = useFirebase();
    const [isLoading, setIsLoading] = useState(false)
    const [currentStep, setCurrentStep] = useState(1);
    const totalSteps = 7;
    const mapRef = useRef<any>(null);
    
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
        // Step 3: Clinic
        clinicName: '',
        clinicType: '',
        doctorName: '',
        doctorRegNo: '',
        specialization: '',
        // Step 4: Services
        services: [] as string[],
        // Step 5: Document Upload
        // Step 6: Location
        address: '',
        location: null as { lat: number, lon: number } | null,
        // Step 7: Final
        agreedToTerms: false,
    });

    // Initialize Recaptcha only once
    useEffect(() => {
        if (auth && recaptchaContainerRef.current && !recaptchaVerifierRef.current) {
            recaptchaVerifierRef.current = new RecaptchaVerifier(auth, recaptchaContainerRef.current, { size: 'invisible' });
        }
    }, [auth]);

    const handleInputChange = (field: keyof typeof formData, value: string | boolean | string[]) => {
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
        } else {
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
            toast({ variant: 'destructive', title: "Agreement Required" });
            return;
        }

        setIsLoading(true);

        if (!db) {
            toast({ variant: 'destructive', title: 'Database Error' });
            setIsLoading(false);
            return;
        }

        const { otp, agreedToTerms, ...restOfData } = formData;
        
        if (!restOfData.clinicName || !restOfData.phone || !restOfData.doctorName || !restOfData.doctorRegNo) {
            toast({ variant: 'destructive', title: "Incomplete Form", description: "Please fill all required fields." });
            setIsLoading(false);
            return;
        }
        
        const q = query(collection(db, "ambulances"), where("phone", "==", restOfData.phone), limit(1));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            toast({ variant: 'destructive', title: "Already Registered", description: `A facility with this phone number is already registered.` });
            setIsLoading(false);
            return;
        }

        try {
            const partnerId = `CZ-CLINIC-${restOfData.phone.slice(-4)}`;
            await addDoc(collection(db, "ambulances"), {
                ...restOfData,
                partnerId: partnerId,
                name: restOfData.clinicName,
                businessType: 'Clinic',
                location: formData.location ? new GeoPoint(formData.location.lat, formData.location.lon) : null,
                type: 'cure',
                status: 'pending_verification',
                isOnline: false,
                createdAt: serverTimestamp(),
            });
            
            toast({
                title: "Application Submitted!",
                description: `Thank you, ${restOfData.clinicName}. Your application is under review.`,
            });

             setTimeout(() => {
                router.push(`/login?role=cure&phone=${encodeURIComponent(restOfData.phone as string)}`);
            }, 1500);

        } catch (error) {
            console.error("Error during Clinic onboarding: ", error);
            toast({ variant: 'destructive', title: "Submission Failed", description: "Something went wrong." });
        } finally {
            setIsLoading(false);
        }
    }
    
    const renderStepContent = () => {
         switch (currentStep) {
            case 1:
                return (
                    <div className="space-y-4">
                        <Label htmlFor="phone">Enter Clinic's Official Phone Number*</Label>
                        <div className="flex items-center gap-0 rounded-md border border-input focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                            <span className="pl-3 text-muted-foreground text-sm">+91</span>
                            <Input id="phone" name="phone" type="tel" maxLength={10} placeholder="12345 67890" required className="border-0 h-9 focus-visible:ring-0 focus-visible:ring-offset-0 flex-1" value={formData.phone} onChange={(e) => handleInputChange('phone', e.target.value)} />
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-4">
                        <Label htmlFor="otp">Enter OTP*</Label>
                        <Input id="otp" name="otp" type="tel" maxLength={6} placeholder="Enter the 6-digit OTP" required value={formData.otp} onChange={(e) => handleInputChange('otp', e.target.value)} />
                    </div>
                );
            case 3:
                return (
                    <div className="space-y-6">
                        <h3 className="font-semibold text-lg border-b pb-2">Owner / Doctor's Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2"><Label htmlFor="ownerName">Your Full Name*</Label><Input id="ownerName" name="ownerName" value={formData.ownerName} onChange={(e) => handleInputChange('ownerName', e.target.value)} required /></div>
                            <div className="space-y-2"><Label htmlFor="ownerEmail">Email ID*</Label><Input id="ownerEmail" name="ownerEmail" type="email" value={formData.ownerEmail} onChange={(e) => handleInputChange('ownerEmail', e.target.value)} required /></div>
                        </div>
                    </div>
                );
            case 4:
                return (
                     <div className="space-y-6">
                         <h3 className="font-semibold text-lg border-b pb-2">Facility Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="clinicType">Facility Type*</Label>
                                <Select name="clinicType" required value={formData.clinicType} onValueChange={(v) => handleInputChange('clinicType', v)}>
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
                                <Input id="clinicName" name="clinicName" value={formData.clinicName} onChange={(e) => handleInputChange('clinicName', e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="doctorName">Lead Doctor's Name*</Label>
                                <Input id="doctorName" name="doctorName" value={formData.doctorName} onChange={(e) => handleInputChange('doctorName', e.target.value)} required />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="specialization">Specialization</Label>
                                <Input id="specialization" name="specialization" placeholder="e.g., General Physician" value={formData.specialization} onChange={(e) => handleInputChange('specialization', e.target.value)}/>
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="doctorRegNo">Medical Registration No.*</Label>
                                <Input id="doctorRegNo" name="doctorRegNo" value={formData.doctorRegNo} onChange={(e) => handleInputChange('doctorRegNo', e.target.value)} required />
                            </div>
                        </div>
                    </div>
                );
            case 5:
                 return (
                    <div className="space-y-4">
                        <Label className="font-semibold text-lg">Services Offered</Label>
                        <CardDescription>Select all services available at your clinic.</CardDescription>
                         <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
                            {clinicServices.map(service => (
                                <div key={service.id} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={service.id}
                                        checked={formData.services.includes(service.label)}
                                        onCheckedChange={(checked) => {
                                            const newServices = checked
                                                ? [...formData.services, service.label]
                                                : formData.services.filter(s => s !== service.label);
                                            handleInputChange('services', newServices);
                                        }}
                                    />
                                    <Label htmlFor={service.id} className="text-sm font-normal cursor-pointer">{service.label}</Label>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 6:
                return (
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg border-b pb-2">Document Upload</h3>
                        <CardDescription>Please upload the following for verification.</CardDescription>
                        <div className="space-y-4 pt-2">
                            <div className="space-y-2"><Label htmlFor="doc-owner-pan">Owner's PAN Card*</Label><Input id="doc-owner-pan" type="file" required /></div>
                            <div className="space-y-2"><Label htmlFor="doc-reg">Clinic Registration (if applicable)</Label><Input id="doc-reg" type="file" /></div>
                            <div className="space-y-2"><Label htmlFor="doc-photo">Clinic Exterior Photo*</Label><Input id="doc-photo" type="file" required /></div>
                        </div>
                    </div>
                );
            case 7:
                 return (
                     <div className="space-y-6">
                         <div className="space-y-2">
                            <Label className="font-semibold text-lg">Set Facility Location*</Label>
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

    const stepTitles = ["Verify Phone", "Verify OTP", "Owner Details", "Facility Details", "Services", "Documents", "Location & Submit"];


    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-muted/40">
             <div id="recaptcha-container" ref={recaptchaContainerRef}></div>
            <Card className="w-full max-w-2xl">
                <CardHeader className="text-center">
                    <div className="mx-auto"><Link href="/"><BrandLogo className="text-5xl justify-center" /></Link></div>
                    <CardTitle className="text-3xl mt-4">Clinic / Center Onboarding</CardTitle>
                     <CardDescription>
                       Step {currentStep} of {totalSteps}: {stepTitles[currentStep - 1]}
                    </CardDescription>
                    <div className="px-10 pt-4">
                        <Progress value={(currentStep / totalSteps) * 100} className="w-full" />
                    </div>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                     <CardContent className="min-h-[300px] flex flex-col justify-center">
                       {renderStepContent()}
                    </CardContent>
                    <CardFooter className="flex-col gap-4">
                        <div className="w-full flex justify-between">
                            <Button type="button" variant="outline" onClick={handlePrevStep} disabled={currentStep === 1}>Previous</Button>
                            {currentStep < totalSteps ? (
                                <Button type="button" onClick={handleNextStep} disabled={isLoading}>
                                    {isLoading ? 'Verifying...' : 'Next Step'}
                                </Button>
                            ) : (
                                <Button type="submit" disabled={isLoading}>{isLoading ? 'Submitting...' : 'Submit Application'}</Button>
                            )}
                        </div>
                        <Button asChild variant="link" className="text-muted-foreground">
                            <Link href="/cure/onboarding"><ArrowLeft className="mr-2 h-4 w-4" />Back to Partner Type</Link>
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
