
'use client'

import { useState } from 'react'
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
import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'

const LiveMap = dynamic(() => import('@/components/live-map'), { 
    ssr: false,
    loading: () => <Skeleton className="w-full h-full bg-muted" />
});


export default function CureOnboardingPage() {
    const { toast } = useToast()
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [currentStep, setCurrentStep] = useState(1);
    const totalSteps = 3;
    
    // Form state
    const [formData, setFormData] = useState({
        hospitalName: '',
        hospitalRegNo: '',
        hospitalType: '',
        contactPerson: '',
        phone: '',
        pan: '',
        gst: '',
        location: null as { address: string; coords: { lat: number; lon: number; }; } | null,
    });
    
    const handleInputChange = (field: keyof typeof formData, value: string | { address: string; coords: { lat: number; lon: number; }; } | null) => {
        setFormData(prev => ({...prev, [field]: value}));
    }

    const handleNextStep = () => {
        if (currentStep === 1) {
            if (!formData.hospitalName || !formData.hospitalRegNo || !formData.hospitalType || !formData.location) {
                toast({ variant: 'destructive', title: "Incomplete Details", description: "Please fill all fields in this step and set a location." });
                return;
            }
        }
        if (currentStep === 2) {
             if (!formData.contactPerson || !formData.phone || !formData.pan) {
                toast({ variant: 'destructive', title: "Incomplete Details", description: "Please fill all contact and PAN details." });
                return;
            }
        }
        setCurrentStep(prev => prev + 1);
    };

    const handlePrevStep = () => setCurrentStep(prev => prev - 1);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const { hospitalName, hospitalRegNo, hospitalType, contactPerson, phone, pan, gst, location } = formData;

        if (!hospitalName || !hospitalRegNo || !hospitalType || !contactPerson || !phone || !pan || !location) {
            toast({ variant: 'destructive', title: "Incomplete Form", description: "Please ensure all steps are filled out correctly." });
            setIsLoading(false);
            return;
        }

        if (!db) {
            toast({ variant: 'destructive', title: 'Database Error' });
            setIsLoading(false);
            return;
        }

        try {
            // Check for phone number duplication
            const q = query(collection(db, "ambulances"), where("phone", "==", phone), limit(1));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                toast({
                    variant: 'destructive',
                    title: "Phone Number Already Registered",
                    description: `This phone number is already registered. Please use a different number or log in.`,
                    duration: 7000,
                });
                setIsLoading(false);
                return;
            }

            const partnerId = `CZC-${phone.slice(-4)}${hospitalRegNo.replace(/\s/g, '').slice(-4).toUpperCase()}`
            
            await addDoc(collection(db, "ambulances"), {
                partnerId,
                name: hospitalName,
                registrationNumber: hospitalRegNo,
                businessType: hospitalType,
                contactPerson,
                phone,
                panCard: pan,
                gstNumber: gst,
                address: location.address,
                location: new GeoPoint(location.coords.lat, location.coords.lon),
                type: 'cure',
                status: 'pending_verification',
                isOnline: false,
                createdAt: serverTimestamp(),
            });
            
            toast({
                title: "Application Submitted!",
                description: `Thank you, ${hospitalName}. Your application is under review.`,
            });
            
            setTimeout(() => {
                router.push(`/login?role=driver&phone=${encodeURIComponent(phone)}`);
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
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="hospitalName">Hospital / Clinic Name</Label>
                            <Input id="hospitalName" value={formData.hospitalName} onChange={e => handleInputChange('hospitalName', e.target.value)} required />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="hospitalRegNo">Registration Certificate No.</Label>
                                <Input id="hospitalRegNo" value={formData.hospitalRegNo} onChange={e => handleInputChange('hospitalRegNo', e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="hospitalType">Facility Type</Label>
                                <Select value={formData.hospitalType} onValueChange={(v) => handleInputChange('hospitalType', v)} required>
                                    <SelectTrigger id="hospitalType"><SelectValue placeholder="Select type" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Clinic">Clinic</SelectItem>
                                        <SelectItem value="Specialty Clinic">Specialty Clinic</SelectItem>
                                        <SelectItem value="Private Hospital">Private Hospital</SelectItem>
                                        <SelectItem value="Govt Hospital">Government Hospital</SelectItem>
                                        <SelectItem value="Trust Hospital">Trust Hospital</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="address">Set Your Facility Location</Label>
                             <div className="h-64 w-full rounded-md overflow-hidden border">
                                <LiveMap onLocationFound={(addr, coords) => handleInputChange('location', { address: addr, coords })} />
                            </div>
                            {formData.location && <p className="text-sm text-green-600 font-medium text-center">Location Set: {formData.location.address}</p>}
                        </div>
                    </div>
                )
            case 2:
                 return (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="contactPerson">Contact Person&apos;s Name</Label>
                                <Input id="contactPerson" value={formData.contactPerson} onChange={e => handleInputChange('contactPerson', e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Contact Phone Number</Label>
                                 <div className="flex items-center gap-0 rounded-md border border-input focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                                    <span className="pl-3 text-muted-foreground text-sm">+91</span>
                                    <Input id="phone" type="tel" maxLength={10} placeholder="12345 67890" value={formData.phone} onChange={e => handleInputChange('phone', e.target.value)} required className="border-0 h-9 focus-visible:ring-0 focus-visible:ring-offset-0 flex-1" />
                                </div>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="pan">Business PAN Card</Label>
                                <Input id="pan" value={formData.pan} onChange={e => handleInputChange('pan', e.target.value.toUpperCase())} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="gst">GST Number (Optional)</Label>
                                <Input id="gst" value={formData.gst} onChange={e => handleInputChange('gst', e.target.value.toUpperCase())} />
                            </div>
                        </div>
                         <div className="space-y-2">
                           <Label>Required Documents (Upload will be enabled after verification)</Label>
                           <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                               <li>Facility Registration Certificate</li>
                               <li>Fire &amp; Safety Certificate (if applicable)</li>
                               <li>Ambulance RC Book &amp; Fitness Certificate for all vehicles</li>
                               <li>Driver&apos;s License for all ambulance drivers</li>
                           </ul>
                        </div>
                    </div>
                )
            case 3:
                return (
                     <div className="space-y-4">
                        <Card><CardContent className="p-4">
                            <p className="text-sm text-muted-foreground">Facility Name</p>
                            <p className="font-semibold">{formData.hospitalName}</p>
                        </CardContent></Card>
                         <Card><CardContent className="p-4">
                            <p className="text-sm text-muted-foreground">Location</p>
                            <p className="font-semibold">{formData.location?.address || "Not set"}</p>
                        </CardContent></Card>
                         <Card><CardContent className="p-4">
                            <p className="text-sm text-muted-foreground">Contact Person</p>
                            <p className="font-semibold">{formData.contactPerson} ({formData.phone})</p>
                        </CardContent></Card>
                         <p className="text-xs text-muted-foreground text-center pt-4">By submitting, you agree to Cabzi&apos;s Terms of Service, Privacy Policy, and our Service Level Agreement for Cure Partners.</p>
                     </div>
                )
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-muted/40">
            <Card className="w-full max-w-2xl">
                <CardHeader className="text-center">
                    <div className="mx-auto"><BrandLogo className="text-5xl justify-center" /></div>
                    <CardTitle className="text-3xl mt-4">Cure Partner Onboarding</CardTitle>
                    <CardDescription>
                       Join our life-saving network. Please provide your facility&apos;s details.
                    </CardDescription>
                     <div className="flex items-center gap-4 pt-4 justify-center">
                        <Progress value={(currentStep / totalSteps) * 100} className="w-1/2 mx-auto" />
                    </div>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent>
                       {renderStepContent()}
                    </CardContent>
                    <CardFooter className="flex-col gap-4">
                        <div className="w-full flex justify-between">
                            <Button type="button" variant="outline" onClick={handlePrevStep} disabled={currentStep === 1}>Previous Step</Button>
                            {currentStep < 3 && <Button type="button" onClick={handleNextStep}>Next Step</Button>}
                            {currentStep === 3 && <Button type="submit" disabled={isLoading}>{isLoading ? 'Submitting...' : 'Submit Application'}</Button>}
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

