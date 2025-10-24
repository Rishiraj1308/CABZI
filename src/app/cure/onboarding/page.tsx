
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
import { ArrowLeft, PlusCircle, Trash2, UploadCloud } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'


export default function CureOnboardingPage() {
    const { toast } = useToast()
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [currentStep, setCurrentStep] = useState(1);
    const totalSteps = 5;

    const [formData, setFormData] = useState({
        clinicName: '',
        clinicType: '',
        address: '',
        landmark: '',
        clinicPhone: '',
        email: '',
        website: '',
        ownerName: '',
        ownerRole: '',
        ownerPhone: '',
        ownerEmail: '',
        clinicRegNo: '',
        issuingAuthority: '',
        gstNumber: '',
        weekdaysTime: '',
        weekendsTime: '',
        servicesOffered: '',
        bankAccountName: '',
        bankAccountNumber: '',
        bankIfscCode: '',
        agreedToTerms: false,
    });
    
    const [doctors, setDoctors] = useState([
        { fullName: '', qualifications: '', regNumber: '', experience: '', consultationFee: '' }
    ]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({...prev, [name]: value}));
    };
    
    const handleSelectChange = (name: keyof typeof formData, value: string) => {
        setFormData(prev => ({...prev, [name]: value}));
    }
    
    const handleDoctorChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const newDoctors = [...doctors];
        newDoctors[index] = { ...newDoctors[index], [name]: value };
        setDoctors(newDoctors);
    }
    
    const addDoctor = () => {
        setDoctors([...doctors, { fullName: '', qualifications: '', regNumber: '', experience: '', consultationFee: '' }]);
    }

    const removeDoctor = (index: number) => {
        const newDoctors = doctors.filter((_, i) => i !== index);
        setDoctors(newDoctors);
    }
    
    const handleNextStep = () => {
        // Add validation for each step before proceeding
        setCurrentStep(prev => prev + 1);
    };

    const handlePrevStep = () => setCurrentStep(prev => prev - 1);

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
            const q = query(collection(db, "ambulances"), where("clinicPhone", "==", formData.clinicPhone), limit(1));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                toast({ variant: 'destructive', title: "Already Registered", description: `A facility with this phone number is already registered.` });
                setIsLoading(false);
                return;
            }
            
            await addDoc(collection(db, "ambulances"), {
                ...formData,
                doctors: doctors,
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
            case 1: // Clinic Details
                return (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2"><Label htmlFor="clinicName">Clinic Name*</Label><Input id="clinicName" name="clinicName" value={formData.clinicName} onChange={handleInputChange} required /></div>
                            <div className="space-y-2"><Label htmlFor="clinicType">Clinic Type*</Label><Select name="clinicType" required onValueChange={v => handleSelectChange('clinicType', v)} value={formData.clinicType}><SelectTrigger><SelectValue placeholder="Select type"/></SelectTrigger><SelectContent><SelectItem value="General">General</SelectItem><SelectItem value="Specialist">Specialist</SelectItem><SelectItem value="Diagnostic">Diagnostic</SelectItem><SelectItem value="Multi-specialty">Multi-specialty</SelectItem></SelectContent></Select></div>
                            <div className="space-y-2 md:col-span-2"><Label htmlFor="address">Full Address*</Label><Textarea id="address" name="address" value={formData.address} onChange={handleInputChange} required /></div>
                            <div className="space-y-2"><Label htmlFor="landmark">Landmark / Area</Label><Input id="landmark" name="landmark" value={formData.landmark} onChange={handleInputChange} /></div>
                            <div className="space-y-2"><Label htmlFor="clinicPhone">Clinic Contact Number*</Label><Input id="clinicPhone" name="clinicPhone" type="tel" value={formData.clinicPhone} onChange={handleInputChange} required /></div>
                            <div className="space-y-2"><Label htmlFor="email">Email ID (Optional)</Label><Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} /></div>
                            <div className="space-y-2"><Label htmlFor="website">Website / Social Media (Optional)</Label><Input id="website" name="website" value={formData.website} onChange={handleInputChange} /></div>
                        </div>
                        <div className="space-y-2"><Label>Upload Clinic Photos</Label><div className="flex items-center justify-center w-full p-6 border-2 border-dashed rounded-lg text-center text-muted-foreground"><UploadCloud className="w-8 h-8 mx-auto mb-2"/><p>Upload button will be enabled after verification.</p></div></div>
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
            case 3: // Doctor Details
                return (
                    <div className="space-y-4">
                        {doctors.map((doctor, index) => (
                            <Card key={index} className="p-4 bg-muted/30">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-semibold">Doctor {index + 1}</h4>
                                    {index > 0 && <Button variant="destructive" size="icon" onClick={() => removeDoctor(index)}><Trash2 className="w-4 h-4"/></Button>}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <div className="space-y-1"><Label>Full Name*</Label><Input name="fullName" value={doctor.fullName} onChange={e => handleDoctorChange(index, e)} required/></div>
                                     <div className="space-y-1"><Label>Qualifications*</Label><Input name="qualifications" placeholder="MBBS, MD" value={doctor.qualifications} onChange={e => handleDoctorChange(index, e)} required/></div>
                                     <div className="space-y-1"><Label>Medical Registration No.*</Label><Input name="regNumber" value={doctor.regNumber} onChange={e => handleDoctorChange(index, e)} required/></div>
                                     <div className="space-y-1"><Label>Years of Experience*</Label><Input name="experience" type="number" value={doctor.experience} onChange={e => handleDoctorChange(index, e)} required/></div>
                                     <div className="md:col-span-2 space-y-1"><Label>Consultation Fees (Optional)</Label><Input name="consultationFee" type="number" placeholder="e.g., 800" value={doctor.consultationFee} onChange={e => handleDoctorChange(index, e)} /></div>
                                </div>
                            </Card>
                        ))}
                         <Button type="button" variant="outline" onClick={addDoctor} className="w-full mt-4"><PlusCircle className="mr-2 h-4 w-4"/> Add Another Doctor</Button>
                    </div>
                );
            case 4: // Licenses
                return (
                    <div className="space-y-6">
                        <div className="space-y-2"><Label htmlFor="clinicRegNo">Clinic Registration Number*</Label><Input id="clinicRegNo" name="clinicRegNo" value={formData.clinicRegNo} onChange={handleInputChange} required /></div>
                        <div className="space-y-2"><Label htmlFor="issuingAuthority">Issuing Authority*</Label><Input id="issuingAuthority" name="issuingAuthority" placeholder="e.g., Delhi Medical Council" value={formData.issuingAuthority} onChange={handleInputChange} required /></div>
                        <div className="space-y-2"><Label htmlFor="gstNumber">GST Number (if applicable)</Label><Input id="gstNumber" name="gstNumber" value={formData.gstNumber} onChange={handleInputChange} /></div>
                        <div className="space-y-2"><Label>Upload Clinic Registration Document</Label><div className="flex items-center justify-center w-full p-6 border-2 border-dashed rounded-lg text-center text-muted-foreground"><p>Upload will be enabled after verification.</p></div></div>
                    </div>
                );
            case 5: // Operational Info
                return (
                     <div className="space-y-6">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2"><Label htmlFor="weekdaysTime">Clinic Timings (Weekdays)*</Label><Input id="weekdaysTime" name="weekdaysTime" placeholder="e.g., 9 AM - 8 PM" value={formData.weekdaysTime} onChange={handleInputChange} required /></div>
                            <div className="space-y-2"><Label htmlFor="weekendsTime">Clinic Timings (Weekends)*</Label><Input id="weekendsTime" name="weekendsTime" placeholder="e.g., 10 AM - 4 PM or Closed" value={formData.weekendsTime} onChange={handleInputChange} required /></div>
                        </div>
                        <div className="space-y-2"><Label htmlFor="servicesOffered">Services Offered*</Label><Textarea id="servicesOffered" name="servicesOffered" placeholder="e.g., General Consultation, Lab Tests, Pharmacy..." value={formData.servicesOffered} onChange={handleInputChange} required /></div>
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

    const stepTitles = ["Clinic Details", "Owner Info", "Doctor Details", "Licenses", "Operational Info"];

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
