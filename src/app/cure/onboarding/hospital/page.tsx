
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
import { ArrowLeft, Building2, BedDouble, Stethoscope, Ambulance as AmbulanceIcon, Heart, Shield, UploadCloud } from 'lucide-react'
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

const hospitalDepartments = [
    { id: 'icu', label: 'ICU (Intensive Care Unit)' },
    { id: 'trauma', label: 'Trauma Center / Emergency Room' },
    { id: 'cardiac', label: 'Cardiac Care / Cardiology' },
    { id: 'neurology', label: 'Neurology' },
    { id: 'orthopedics', label: 'Orthopedics' },
    { id: 'pediatrics', label: 'Pediatrics' },
    { id: 'oncology', label: 'Oncology' },
    { id: 'maternity', label: 'Maternity / Gynecology' },
]

export default function HospitalOnboardingPage() {
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
        // Step 3: Business Details
        hospitalName: '',
        registrationNumber: '',
        hospitalType: '',
        totalBeds: '',
        bedsOccupied: '',
        hasEmergency: false,
        // Step 4: Services
        departments: [] as string[],
        blsAmbulances: '0',
        alsAmbulances: '0',
        cardiacAmbulances: '0',
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
            const q = query(collection(db, "curePartners"), where("phone", "==", formData.phone), limit(1));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                toast({ variant: 'destructive', title: "Already Registered", description: `A facility with this phone number is already registered.` });
                setIsLoading(false);
                return;
            }
            
            const partnerId = `CZ-HOSP-${formData.phone.slice(-4)}`;

            await addDoc(collection(db, "curePartners"), {
                ...restOfData,
                partnerId: partnerId,
                name: formData.hospitalName,
                businessType: 'Hospital',
                totalBeds: Number(formData.totalBeds) || 0,
                bedsOccupied: Number(formData.bedsOccupied) || 0,
                location: formData.location ? new GeoPoint(formData.location.lat, formData.location.lon) : null,
                type: 'cure',
                status: 'pending_verification',
                isOnline: false,
                createdAt: serverTimestamp(),
            });
            
            toast({
                title: "Application Submitted!",
                description: `Thank you, ${formData.hospitalName}. Your application is under review.`,
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
                        </div>
                    </div>
                );
            case 4:
                return (
                     <div className="space-y-6">
                        <h3 className="font-semibold text-lg border-b pb-2">Facility Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div className="space-y-2 md:col-span-2"><Label htmlFor="hospitalName">Hospital Name*</Label><Input id="hospitalName" name="hospitalName" value={formData.hospitalName} onChange={(e) => handleInputChange('hospitalName', e.target.value)} required /></div>
                            <div className="space-y-2">
                                <Label htmlFor="hospitalType">Hospital Type*</Label>
                                <Select name="hospitalType" required value={formData.hospitalType} onValueChange={(v) => handleInputChange('hospitalType', v)}>
                                    <SelectTrigger><SelectValue placeholder="Select type"/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Private Hospital">Private Hospital</SelectItem>
                                        <SelectItem value="Government Hospital">Government Hospital</SelectItem>
                                        <SelectItem value="Multi-speciality Hospital">Multi-speciality Hospital</SelectItem>
                                        <SelectItem value="Super-speciality Hospital">Super-speciality Hospital</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="registrationNumber">Hospital Registration Number*</Label>
                                <Input id="registrationNumber" name="registrationNumber" value={formData.registrationNumber} onChange={(e) => handleInputChange('registrationNumber', e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="totalBeds">Total Bed Count*</Label>
                                <Input id="totalBeds" name="totalBeds" type="number" value={formData.totalBeds} onChange={(e) => handleInputChange('totalBeds', e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="bedsOccupied">Currently Occupied Beds*</Label>
                                <Input id="bedsOccupied" name="bedsOccupied" type="number" value={formData.bedsOccupied} onChange={(e) => handleInputChange('bedsOccupied', e.target.value)} required />
                            </div>
                             <div className="flex items-center space-x-2 md:col-span-2 pt-4">
                                <Checkbox id="hasEmergency" name="hasEmergency" checked={formData.hasEmergency} onCheckedChange={(checked) => handleInputChange('hasEmergency', !!checked)}/>
                                <label htmlFor="hasEmergency" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    We have a 24/7 Emergency Department
                                </label>
                            </div>
                        </div>
                    </div>
                );
            case 5:
                return (
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <Label className="font-semibold text-lg">Departments & Fleet</Label>
                            <CardDescription>Select the departments available at your facility and specify your ambulance fleet count.</CardDescription>
                            <div className="p-4 border rounded-lg space-y-4">
                               <p className="font-medium text-sm">Available Departments</p>
                               <div className="grid grid-cols-2 gap-3">
                                   {hospitalDepartments.map(dept => (
                                       <div key={dept.id} className="flex items-center space-x-2">
                                            <Checkbox 
                                                id={dept.id} 
                                                checked={formData.departments.includes(dept.label)}
                                                onCheckedChange={(checked) => {
                                                    const newDepts = checked
                                                        ? [...formData.departments, dept.label]
                                                        : formData.departments.filter(d => d !== dept.label);
                                                    handleInputChange('departments', newDepts);
                                                }}
                                            />
                                            <Label htmlFor={dept.id} className="text-sm font-normal cursor-pointer">{dept.label}</Label>
                                        </div>
                                   ))}
                               </div>
                               <p className="font-medium text-sm pt-4">Ambulance Fleet Count</p>
                               <div className="grid grid-cols-3 gap-4">
                                   <div className="space-y-2"><Label htmlFor="blsAmbulances">BLS</Label><Input id="blsAmbulances" type="number" value={formData.blsAmbulances} onChange={e => handleInputChange('blsAmbulances', e.target.value)} /></div>
                                   <div className="space-y-2"><Label htmlFor="alsAmbulances">ALS</Label><Input id="alsAmbulances" type="number" value={formData.alsAmbulances} onChange={e => handleInputChange('alsAmbulances', e.target.value)} /></div>
                                   <div className="space-y-2"><Label htmlFor="cardiacAmbulances">Cardiac</Label><Input id="cardiacAmbulances" type="number" value={formData.cardiacAmbulances} onChange={e => handleInputChange('cardiacAmbulances', e.target.value)} /></div>
                               </div>
                            </div>
                        </div>
                    </div>
                );
             case 6:
                return (
                    <div className="space-y-4">
                        <h3 className="font-semibold text-lg border-b pb-2">Document Upload</h3>
                        <CardDescription>Please upload all required documents for verification.</CardDescription>
                        <div className="space-y-4 pt-2">
                            <div className="space-y-2"><Label htmlFor="doc-reg">Hospital Registration Certificate*</Label><Input id="doc-reg" type="file" /></div>
                            <div className="space-y-2"><Label htmlFor="doc-fire">Fire Safety Certificate (with expiry date)*</Label><Input id="doc-fire" type="file" /></div>
                            <div className="space-y-2"><Label htmlFor="doc-pan">Business PAN Card*</Label><Input id="doc-pan" type="file" /></div>
                            <div className="space-y-2"><Label htmlFor="doc-gst">GST Certificate (Optional)</Label><Input id="doc-gst" type="file" /></div>
                            <div className="space-y-2"><Label htmlFor="doc-photo">Hospital Exterior Photo*</Label><Input id="doc-photo" type="file" /></div>
                            <div className="space-y-2"><Label htmlFor="doc-ambulance">Ambulance RC Books* (multiple files allowed)</Label><Input id="doc-ambulance" type="file" multiple /></div>
                        </div>
                    </div>
                );
            case 7:
                 return (
                     <div className="space-y-6">
                         <div className="space-y-2">
                            <Label className="font-semibold text-lg">Set Hospital Location*</Label>
                            <CardDescription>Drag the map to pin your exact entrance location.</CardDescription>
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

    const stepTitles = ["Verify Phone", "Verify OTP", "Owner Details", "Facility Details", "Services & Fleet", "Document Upload", "Location & Submit"];


    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-muted/40">
            <div id="recaptcha-container" ref={recaptchaContainerRef}></div>
            <Card className="w-full max-w-2xl">
                <CardHeader className="text-center">
                    <div className="mx-auto"><Link href="/"><BrandLogo className="text-5xl justify-center" /></Link></div>
                    <CardTitle className="text-3xl mt-4">Hospital Onboarding</CardTitle>
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
