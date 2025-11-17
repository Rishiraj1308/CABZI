
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import BrandLogo from '@/components/shared/brand-logo'
import { useDb } from '@/lib/firebase/client-provider'
import { collection, doc, setDoc, serverTimestamp, query, where, getDocs, limit } from "firebase/firestore";
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, UploadCloud } from 'lucide-react'


const vehicleBrands = [
  'Maruti Suzuki', 'Hyundai', 'Tata', 'Mahindra', 'Toyota', 'Honda', 'Kia',
  'Renault', 'MG', 'Volkswagen', 'Skoda', 'Nissan', 'Force Motors', 'Bajaj', 
  'TVS', 'Hero', 'Royal Enfield', 'Other',
];

export default function OnboardingPage() {
    const { toast } = useToast()
    const router = useRouter()
    const db = useDb();
    const [isLoading, setIsLoading] = useState(false)
    const [isMounted, setIsMounted] = useState(false)
    const [isCurocityPink, setIsCurocityPink] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState({
        name: '', phone: '', gender: '', dob: '', panCard: '', aadhaarNumber: '',
        vehicleType: '', vehicleBrand: '', vehicleName: '', vehicleNumber: '', drivingLicence: '',
    });

    const totalSteps = 3;

    useEffect(() => {
        setIsMounted(true)
    }, [])

    const handleInputChange = (field: keyof typeof formData, value: string) => {
        const processedValue = field === 'aadhaarNumber' ? value.replace(/\D/g, '') : value;
        setFormData(prev => ({...prev, [field]: processedValue}));
    }

    const handleGenderChange = (value: string) => {
        setFormData(prev => ({...prev, gender: value}));
        if (value !== 'female') {
            setIsCurocityPink(false);
        }
    }
    
    const validateStep1 = () => {
        if (!formData.name || !formData.phone || !formData.gender || !formData.dob) {
            toast({ variant: 'destructive', title: "Incomplete Details", description: "Please fill out your name, phone, gender and date of birth." });
            return false;
        }
        if (formData.phone.length !== 10) {
            toast({ variant: 'destructive', title: "Invalid Phone Number", description: "Please enter a valid 10-digit mobile number." });
            return false;
        }
        return true;
    };
    
    const validateStep2 = () => {
         if (!formData.panCard || !formData.aadhaarNumber) {
            toast({ variant: 'destructive', title: "Incomplete Details", description: "Please enter your PAN and Aadhaar number." });
            return false;
        }
        const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
        if (!panRegex.test(formData.panCard.toUpperCase())) {
            toast({ variant: 'destructive', title: 'Invalid PAN Format', description: 'Please enter a valid PAN card number (e.g., ABCDE1234F).' });
            return false;
        }
        const aadhaarRegex = /^\d{12}$/;
        if (!aadhaarRegex.test(formData.aadhaarNumber)) {
            toast({ variant: 'destructive', title: 'Invalid Aadhaar Format', description: 'Please enter a valid 12-digit Aadhaar number.' });
            return false;
        }
        return true;
    }

    const handleNextStep = () => {
        if (currentStep === 1 && !validateStep1()) return;
        if (currentStep === 2 && !validateStep2()) return;
        setCurrentStep(prev => prev + 1);
    };

    const handlePrevStep = () => setCurrentStep(prev => prev - 1);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        
        if (!formData.vehicleType || !formData.vehicleBrand || !formData.vehicleName || !formData.vehicleNumber || !formData.drivingLicence) {
             toast({ variant: 'destructive', title: "Incomplete Form", description: "Please fill all vehicle details on the final step." });
             setIsLoading(false);
             return;
        }

        if (!db) {
            toast({ variant: 'destructive', title: "Database Error" });
            setIsLoading(false);
            return;
        }

        const { name, phone, gender, dob, panCard, aadhaarNumber, vehicleType, vehicleBrand, vehicleName, vehicleNumber, drivingLicence } = formData;

        try {
            const partnersRef = collection(db, "partners");
            const q = query(partnersRef, where("phone", "==", phone), limit(1));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                toast({ variant: 'destructive', title: "Phone Number Already Registered" });
                setIsLoading(false);
                return;
            }

            const systematicId = `CZP-${phone.slice(-4)}-${vehicleNumber.slice(-4).toUpperCase()}`;
            const partnerDocRef = doc(db, "partners", systematicId);

            const curocityBankAccountNumber = `11${phone}`
            const photoUrl = 'https://placehold.co/100x100.png';

            await setDoc(partnerDocRef, {
                partnerId: systematicId, 
                curocityBankAccountNumber, name, phone, gender, dob, panCard, 
                vehicleType, vehicleBrand, vehicleName, vehicleNumber, isCurocityPink, 
                drivingLicence, aadhaarNumber, photoUrl,
                status: 'pending_verification',
                isOnline: false,
                createdAt: serverTimestamp(),
                walletBalance: 0,
            });
            
            toast({ title: "Onboarding Successful!", description: `Welcome, ${name}! Your partner ID is ${systematicId}. Redirecting to login...` });
            router.push(`/partner-login?phone=${encodeURIComponent(phone)}`);

        } catch (error) {
            console.error("Error during onboarding: ", error);
            toast({ variant: 'destructive', title: "Submission Failed" });
            setIsLoading(false);
        }
    }
    
    if(!isMounted) return <div className="flex min-h-screen items-center justify-center p-4 bg-muted/40"><Skeleton className="w-full max-w-2xl h-[600px]" /></div>

    const stepTitles = ["Basic Information", "Identity (KYC)", "Vehicle Details"];

    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-muted/40">
            <Card className="w-full max-w-2xl">
                <CardHeader className="text-center">
                    <div className="mx-auto"><Link href="/"><BrandLogo className="text-5xl justify-center" /></Link></div>
                    <CardTitle className="text-3xl mt-4">Become a Path Partner</CardTitle>
                    <CardDescription>
                       Step {currentStep}: {stepTitles[currentStep - 1]}
                    </CardDescription>
                     <div className="px-10 pt-4">
                        <Progress value={(currentStep / totalSteps) * 100} className="w-full" />
                    </div>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="min-h-[300px]">
                        <div className="p-4 border rounded-lg">
                           {formData && currentStep === 1 && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2"><Label htmlFor="name">Full Name*</Label><Input id="name" name="name" placeholder="e.g., Ramesh Kumar" required value={formData.name} onChange={(e) => handleInputChange('name', e.target.value)} /></div>
                                        <div className="space-y-2"><Label htmlFor="phone">Phone Number*</Label><div className="flex items-center gap-0 rounded-md border border-input focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"><span className="pl-3 text-muted-foreground text-sm">+91</span><Input id="phone" name="phone" type="tel" maxLength={10} placeholder="12345 67890" required className="border-0 h-9 focus-visible:ring-0 focus-visible:ring-offset-0 flex-1" value={formData.phone} onChange={(e) => handleInputChange('phone', e.target.value)} /></div></div>
                                        <div className="space-y-2"><Label>Gender*</Label><RadioGroup name="gender" required className="flex gap-4 pt-2" value={formData.gender} onValueChange={handleGenderChange}><div className="flex items-center space-x-2"><RadioGroupItem value="male" id="male" /><Label htmlFor="male">Male</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="female" id="female" /><Label htmlFor="female">Female</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="other" id="other" /><Label htmlFor="other">Other</Label></div></RadioGroup></div>
                                        <div className="space-y-2"><Label htmlFor="dob">Date of Birth*</Label><Input id="dob" name="dob" type="date" required value={formData.dob} onChange={(e) => handleInputChange('dob', e.target.value)} /></div>
                                    </div>
                                </div>
                            )}
                            {formData && currentStep === 2 && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2"><Label htmlFor="pan-card">PAN Card Number*</Label><Input id="pan-card" name="pan-card" placeholder="e.g., ABCDE1234F" required className="uppercase" value={formData.panCard} onChange={(e) => handleInputChange('panCard', e.target.value)} /></div>
                                    <div className="space-y-2"><Label htmlFor="aadhaar-number">Aadhaar Number*</Label><Input id="aadhaar-number" name="aadhaar-number" placeholder="e.g., 1234 5678 9012" required value={formData.aadhaarNumber} onChange={(e) => handleInputChange('aadhaarNumber', e.target.value)} maxLength={12} /></div>
                                    </div>
                                    <div className="space-y-2 pt-4">
                                        <Label>Upload Documents</Label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="flex items-center justify-center w-full p-6 border-2 border-dashed rounded-lg text-center text-muted-foreground flex-col gap-2"><UploadCloud className="w-8 h-8" /><p>Upload Aadhaar Card</p></div>
                                        <div className="flex items-center justify-center w-full p-6 border-2 border-dashed rounded-lg text-center text-muted-foreground flex-col gap-2"><UploadCloud className="w-8 h-8" /><p>Upload PAN Card</p></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {formData && currentStep === 3 && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2"><Label htmlFor="vehicle-type">Vehicle Type*</Label><Select name="vehicle-type" required onValueChange={(value) => handleInputChange('vehicleType', value)} value={formData.vehicleType}><SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger><SelectContent><SelectItem value="bike">Bike</SelectItem><SelectItem value="auto">Auto</SelectItem><SelectItem value="toto">Toto</SelectItem><SelectItem value="cab-lite">Cab (Lite)</SelectItem><SelectItem value="cab-prime">Cab (Prime)</SelectItem><SelectItem value="cab-xl">Cab (XL)</SelectItem></SelectContent></Select></div>
                                        <div className="space-y-2"><Label htmlFor="vehicle-brand">Vehicle Brand*</Label><Select name="vehicle-brand" required onValueChange={(value) => handleInputChange('vehicleBrand', value)} value={formData.vehicleBrand}><SelectTrigger><SelectValue placeholder="Select brand" /></SelectTrigger><SelectContent>{vehicleBrands.map(brand => (<SelectItem key={brand} value={brand}>{brand}</SelectItem>))}</SelectContent></Select></div>
                                        <div className="space-y-2"><Label htmlFor="vehicle-name">Vehicle Model*</Label><Input id="vehicle-name" name="vehicle-name" placeholder="e.g., Swift Dzire" required value={formData.vehicleName} onChange={(e) => handleInputChange('vehicleName', e.target.value)} /></div>
                                        <div className="space-y-2"><Label htmlFor="vehicle-number">Vehicle Number (RC)*</Label><Input id="vehicle-number" name="vehicle-number" placeholder="e.g., DL 01 AB 1234" required value={formData.vehicleNumber} onChange={(e) => handleInputChange('vehicleNumber', e.target.value)} /></div>
                                        <div className="space-y-2 md:col-span-2"><Label htmlFor="driving-licence">Driving Licence Number*</Label><Input id="driving-licence" name="driving-licence" placeholder="e.g., DL1420110012345" required value={formData.drivingLicence} onChange={(e) => handleInputChange('drivingLicence', e.target.value)} /></div>
                                    </div>
                                    <div className="mt-6 flex items-center space-x-2">
                                        <Switch id="curocity-pink" name="curocity-pink" checked={isCurocityPink} onCheckedChange={(checked) => setIsCurocityPink(checked as boolean)} disabled={formData.gender !== 'female'} />
                                        <Label htmlFor="curocity-pink" className={`text-sm font-medium leading-none ${formData.gender !== 'female' ? 'cursor-not-allowed opacity-50' : 'peer-disabled:cursor-not-allowed peer-disabled:opacity-70'}`}>Register as a Curocity Pink Partner (Women only)</Label>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                    <CardFooter className="flex-col gap-4">
                        <div className="w-full flex justify-between">
                            <Button type="button" variant="outline" onClick={handlePrevStep} disabled={currentStep === 1}><ArrowLeft className="w-4 h-4 mr-2"/> Previous Step</Button>
                            {currentStep < totalSteps && <Button type="button" onClick={handleNextStep}>Next Step</Button>}
                            {currentStep === totalSteps && <Button type="submit" className="btn-glow bg-accent text-accent-foreground hover:bg-accent/90" disabled={isLoading}>{isLoading ? 'Submitting...' : 'Finish & Submit'}</Button>}
                        </div>
                        <p className="text-xs text-muted-foreground pt-2">Already a partner? <Link href="/partner-login" className="text-primary underline">Log in</Link></p>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}

    