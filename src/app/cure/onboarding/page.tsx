
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
import { db } from '@/lib/firebase'
import { collection, addDoc, serverTimestamp, GeoPoint, query, where, getDocs, limit } from "firebase/firestore";
import { ArrowLeft } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'

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


export default function CureOnboardingPage() {
    const { toast } = useToast()
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [currentStep, setCurrentStep] = useState(1);
    const totalSteps = 4;
    const mapRef = useRef<any>(null);
    const [selectedServices, setSelectedServices] = useState<string[]>([]);

    const [formData, setFormData] = useState({
        clinicName: '',
        clinicType: '',
        address: '',
        clinicPhone: '',
        email: '',
        ownerName: '',
        ownerRole: '',
        ownerPhone: '',
        ownerEmail: '',
        clinicRegNo: '',
        issuingAuthority: '',
        gstNumber: '',
        weekdaysTime: '',
        weekendsTime: '',
        bankAccountName: '',
        bankAccountNumber: '',
        bankIfscCode: '',
        agreedToTerms: false,
        location: null as { lat: number, lon: number } | null,
    });

    useEffect(() => {
        if (currentStep === 1 && mapRef.current) {
             mapRef.current?.locate();
        }
    }, [currentStep]);


    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({...prev, [name]: value}));
    };
    
    const handleSelectChange = (name: keyof Omit<typeof formData, 'location' | 'agreedToTerms'>, value: string) => {
        setFormData(prev => ({...prev, [name]: value}));
    }
    
    const handleServiceChange = (serviceLabel: string) => {
        setSelectedServices(prev => 
            prev.includes(serviceLabel) 
                ? prev.filter(label => label !== serviceLabel)
                : [...prev, serviceLabel]
        );
    }
    
    const handleNextStep = () => {
        // Add validation for each step before proceeding
        setCurrentStep(prev => prev + 1);
    };

    const handlePrevStep = () => setCurrentStep(prev => prev - 1);
    
    const handleLocationSelect = async () => {
        if (mapRef.current) {
            const center = mapRef.current.getCenter();
            if (center) {
                const address = await mapRef.current.getAddress(center.lat, center.lng);
                setFormData(prev => ({ 
                    ...prev, 
                    address: address || 'Could not fetch address', 
                    location: { lat: center.lat, lon: center.lng } 
                }));
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
         if (!formData.location) {
            toast({ variant: 'destructive', title: 'Location Required', description: 'Please confirm your facility location on the map.' });
            return;
        }

        setIsLoading(true);

        if (!db) {
            toast({ variant: 'destructive', title: 'Database Error' });
            setIsLoading(false);
            return;
        }

        try {
            const { location, agreedToTerms, ...restOfData } = formData;
            const q = query(collection(db, "ambulances"), where("clinicPhone", "==", formData.clinicPhone), limit(1));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                toast({ variant: 'destructive', title: "Already Registered", description: `A facility with this phone number is already registered.` });
                setIsLoading(false);
                return;
            }
            
            await addDoc(collection(db, "ambulances"), {
                ...restOfData,
                services: selectedServices,
                location: new GeoPoint(location!.lat, location!.lon),
                businessType: formData.clinicType,
                name: formData.clinicName,
                phone: formData.clinicPhone,
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
                router.push(`/login?role=driver&phone=${encodeURIComponent(formData.clinicPhone)}`);
            }, 1500);

        } catch (error) {
            console.error("Error during Cure onboarding: ", error);
            toast({ variant: 'destructive', title: "Submission Failed", description: "Something went wrong." });
            setIsLoading(false);
        }
    }
    
    const renderStepContent = () => {
        switch (currentStep) {
            case 1: // Facility Details
                return (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div className="space-y-2">
                                <Label htmlFor="clinicType">Facility Type*</Label>
                                <Select name="clinicType" required onValueChange={v => handleSelectChange('clinicType', v)} value={formData.clinicType}>
                                    <SelectTrigger><SelectValue placeholder="Select type"/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Clinic">Clinic</SelectItem>
                                        <SelectItem value="Specialist Clinic">Specialist Clinic</SelectItem>
                                        <SelectItem value="Diagnostic Center">Diagnostic Center</SelectItem>
                                        <SelectItem value="Private Hospital">Private Hospital</SelectItem>
                                        <SelectItem value="Government Hospital">Government Hospital</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="clinicName">
                                    {formData.clinicType.toLowerCase().includes('hospital') ? 'Hospital Name*' : 'Clinic Name*'}
                                </Label>
                                <Input id="clinicName" name="clinicName" value={formData.clinicName} onChange={handleInputChange} required />
                            </div>
                            <div className="space-y-2"><Label htmlFor="clinicPhone">Contact Number*</Label><Input id="clinicPhone" name="clinicPhone" type="tel" value={formData.clinicPhone} onChange={handleInputChange} required /></div>
                            <div className="space-y-2"><Label htmlFor="email">Email ID</Label><Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} /></div>
                        </div>
                        <div className="space-y-2">
                            <Label>Set Facility Location*</Label>
                            <CardDescription>Drag the map to pin your exact location.</CardDescription>
                            <div className="h-48 w-full rounded-md overflow-hidden border">
                                <LiveMap ref={mapRef} onLocationFound={(addr: any, coords: any) => setFormData(prev => ({ ...prev, address: addr, location: coords }))} />
                            </div>
                            <Button type="button" className="w-full" onClick={handleLocationSelect}>Confirm My Location on Map</Button>
                            {formData.address && <p className="text-sm text-green-600 font-medium text-center">{formData.address}</p>}
                        </div>
                    </div>
                );
            case 2: // Owner Details
                 return (
                    <div className="space-y-6">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2"><Label htmlFor="ownerName">Owner Full Name*</Label><Input id="ownerName" name="ownerName" value={formData.ownerName} onChange={handleInputChange} required /></div>
                            <div className="space-y-2"><Label htmlFor="ownerRole">Designation / Role*</Label><Input id="ownerRole" name="ownerRole" value={formData.ownerRole} onChange={handleInputChange} required /></div>
                            <div className="space-y-2"><Label htmlFor="ownerPhone">Contact Number*</Label><Input id="ownerPhone" name="ownerPhone" type="tel" value={formData.ownerPhone} onChange={handleInputChange} required /></div>
                            <div className="space-y-2"><Label htmlFor="ownerEmail">Email ID*</Label><Input id="ownerEmail" name="ownerEmail" type="email" value={formData.ownerEmail} onChange={handleInputChange} required /></div>
                        </div>
                         <div className="space-y-2"><Label>Upload Owner ID Proof (Aadhaar, PAN, etc.)</Label><div className="flex items-center justify-center w-full p-6 border-2 border-dashed rounded-lg text-center text-muted-foreground"><p>Upload will be enabled after verification.</p></div></div>
                    </div>
                );
            case 3: // Licenses
                return (
                    <div className="space-y-6">
                        {formData.clinicType !== 'Clinic' && (
                             <div className="space-y-2"><Label htmlFor="clinicRegNo">Facility Registration Number*</Label><Input id="clinicRegNo" name="clinicRegNo" value={formData.clinicRegNo} onChange={handleInputChange} required /></div>
                        )}
                        <div className="space-y-2"><Label htmlFor="issuingAuthority">Issuing Authority*</Label><Input id="issuingAuthority" name="issuingAuthority" placeholder="e.g., Delhi Medical Council" value={formData.issuingAuthority} onChange={handleInputChange} required /></div>
                        <div className="space-y-2"><Label htmlFor="gstNumber">GST Number (if applicable)</Label><Input id="gstNumber" name="gstNumber" value={formData.gstNumber} onChange={handleInputChange} /></div>
                        <div className="space-y-2"><Label>Upload Registration Document</Label><div className="flex items-center justify-center w-full p-6 border-2 border-dashed rounded-lg text-center text-muted-foreground"><p>Upload will be enabled after verification.</p></div></div>
                    </div>
                );
            case 4: // Operational Info
                return (
                     <div className="space-y-6">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2"><Label htmlFor="weekdaysTime">Clinic Timings (Weekdays)*</Label><Input id="weekdaysTime" name="weekdaysTime" placeholder="e.g., 9 AM - 8 PM" value={formData.weekdaysTime} onChange={handleInputChange} required /></div>
                            <div className="space-y-2"><Label htmlFor="weekendsTime">Clinic Timings (Weekends)*</Label><Input id="weekendsTime" name="weekendsTime" placeholder="e.g., 10 AM - 4 PM or Closed" value={formData.weekendsTime} onChange={handleInputChange} required /></div>
                        </div>
                        <div className="space-y-2">
                          <Label>Services Offered*</Label>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3 p-4 border rounded-lg">
                            {serviceCategories.map(service => (
                                <div key={service.id} className="flex items-center space-x-2">
                                    <Checkbox 
                                        id={service.id} 
                                        onCheckedChange={() => handleServiceChange(service.label)}
                                        checked={selectedServices.includes(service.label)}
                                    />
                                    <Label htmlFor={service.id} className="text-sm font-normal cursor-pointer">{service.label}</Label>
                                </div>
                            ))}
                          </div>
                        </div>
                         <div>
                            <h4 className="font-medium mb-2">Bank Details (for payments)</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-lg">
                                <div className="space-y-2 md:col-span-2"><Label htmlFor="bankAccountName">Account Holder Name*</Label><Input id="bankAccountName" name="bankAccountName" value={formData.bankAccountName} onChange={handleInputChange} required /></div>
                                <div className="space-y-2"><Label htmlFor="bankAccountNumber">Account Number*</Label><Input id="bankAccountNumber" name="bankAccountNumber" type="number" value={formData.bankAccountNumber} onChange={handleInputChange} required /></div>
                                <div className="space-y-2"><Label htmlFor="bankIfscCode">IFSC Code*</Label><Input id="bankIfscCode" name="bankIfscCode" value={formData.bankIfscCode} onChange={handleInputChange} required className="uppercase"/></div>
                            </div>
                         </div>
                         <div className="flex items-center space-x-2 pt-4">
                            <Checkbox id="terms" checked={formData.agreedToTerms} onCheckedChange={(checked) => setFormData(prev => ({...prev, agreedToTerms: !!checked}))} />
                            <Label htmlFor="terms" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                              I agree to Cabzi&apos;s terms & conditions and consent to the verification of all documents and credentials provided.
                            </Label>
                        </div>
                    </div>
                );
        }
    }

    const stepTitles = ["Facility Details", "Owner Info", "Licenses", "Operational Info"];

    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-muted/40">
            <Card className="w-full max-w-3xl">
                <CardHeader className="text-center">
                    <div className="mx-auto"><BrandLogo className="text-5xl justify-center" /></div>
                    <CardTitle className="text-3xl mt-4">Cure Partner Onboarding</CardTitle>
                    <CardDescription>
                       Step {currentStep}: {stepTitles[currentStep - 1]}
                    </CardDescription>
                     <div className="px-10 pt-4">
                        <Progress value={(currentStep / totalSteps) * 100} className="w-full" />
                    </div>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="min-h-[400px]">
                       {renderStepContent()}
                    </CardContent>
                    <CardFooter className="flex-col gap-4">
                        <div className="w-full flex justify-between">
                            <Button type="button" variant="outline" onClick={handlePrevStep} disabled={currentStep === 1}>Previous Step</Button>
                            {currentStep < totalSteps && <Button type="button" onClick={handleNextStep}>Next Step</Button>}
                            {currentStep === totalSteps && <Button type="submit" disabled={isLoading}>{isLoading ? 'Submitting...' : 'Submit Application'}</Button>}
                        </div>
                        <Button asChild variant="link" className="text-muted-foreground">
                            <Link href="/partner-hub"><ArrowLeft className="mr-2 h-4 w-4" />Back to Partner Hub</Link>
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
