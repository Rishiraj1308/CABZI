
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import BrandLogo from '@/components/brand-logo'
import { db } from '@/lib/firebase'
import { collection, addDoc, serverTimestamp, GeoPoint, query, where, getDocs, writeBatch, doc, limit } from "firebase/firestore";
import { Checkbox } from '@/components/ui/checkbox'
import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Wrench, Building } from 'lucide-react'
import { Progress } from '@/components/ui/progress'

const LiveMap = dynamic(() => import('@/components/live-map'), { 
    ssr: false,
    loading: () => <Skeleton className="w-full h-full bg-muted" />
});

const onSpotServices = [
    { id: 'tyre_puncture', label: 'Tyre Puncture Fix' },
    { id: 'stepney_change', label: 'Stepney Change' },
    { id: 'battery_jumpstart', label: 'Battery Jump-Start' },
    { id: 'fuel_delivery', label: 'Emergency Fuel Delivery' },
    { id: 'minor_repair', label: 'Quick Minor Repair' },
    { id: 'towing_assist', label: 'Towing / Crane Assist' },
]

const garageServices = [
    { id: 'full_servicing', label: 'Full Servicing / AMC' },
    { id: 'brake_clutch', label: 'Brake / Clutch Work' },
    { id: 'suspension_repair', label: 'Suspension / Shocker Repair' },
    { id: 'engine_overhaul', 'label': 'Engine Tuning / Overhaul' },
    { id: 'ac_repair', label: 'AC Repair & Gas Filling' },
    { id: 'denting_painting', label: 'Body Denting & Painting' },
]


export default function MechanicOnboardingPage() {
    const { toast } = useToast()
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [isMounted, setIsMounted] = useState(false)
    const [selectedServices, setSelectedServices] = useState<string[]>([]);
    const [location, setLocation] = useState<{ address: string, coords: { lat: number, lon: number } } | null>(null);
    const [gender, setGender] = useState('');
    const mapRef = useRef<any>(null);

    const [step, setStep] = useState<'selection' | 'form'>('selection');
    const [partnerType, setPartnerType] = useState<'individual' | 'garage' | null>(null);
    const [currentFormStep, setCurrentFormStep] = useState(1);
    
    const totalFormSteps = partnerType === 'garage' ? 4 : 3;

    useEffect(() => { 
        setIsMounted(true);
        if (step === 'form' && currentFormStep === totalFormSteps && mapRef.current) {
            setTimeout(() => {
                mapRef.current?.locate();
            }, 500);
        }
    }, [step, currentFormStep, totalFormSteps]);

    const handleServiceChange = (serviceId: string) => {
        setSelectedServices(prev => 
            prev.includes(serviceId) 
                ? prev.filter(id => id !== serviceId)
                : [...prev, serviceId]
        );
    }
    
    const selectPartnerType = (type: 'individual' | 'garage') => {
        setPartnerType(type);
        setStep('form');
    }
    
    const handleNextStep = () => setCurrentFormStep(prev => prev + 1);
    const handlePrevStep = () => setCurrentFormStep(prev => prev - 1);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const formData = new FormData(e.target as HTMLFormElement);
        // ... (rest of your form submission logic)
        
        toast({ title: "Submission successful (simulation)"});
        setIsLoading(false);
    }
    
    const renderSelectionStep = () => (
        <Card className="w-full max-w-2xl text-center">
            <CardHeader>
                 <CardTitle className="text-3xl mt-4">Join as a ResQ Partner</CardTitle>
                 <CardDescription>First, tell us what kind of partner you are.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="hover:border-primary hover:shadow-lg transition-all h-full flex flex-col items-center justify-center p-6 cursor-pointer" onClick={() => selectPartnerType('individual')}>
                    <Wrench className="w-16 h-16 text-primary mb-4" />
                    <h3 className="text-xl font-bold">Individual Mechanic</h3>
                    <p className="text-sm text-muted-foreground mt-2">I am a freelancer offering on-spot repair services.</p>
                </Card>
                <Card className="hover:border-primary hover:shadow-lg transition-all h-full flex flex-col items-center justify-center p-6 cursor-pointer" onClick={() => selectPartnerType('garage')}>
                    <Building className="w-16 h-16 text-primary mb-4" />
                    <h3 className="text-xl font-bold">Garage / Workshop</h3>
                    <p className="text-sm text-muted-foreground mt-2">I own a garage and offer a wide range of services.</p>
                </Card>
            </CardContent>
             <CardFooter>
                 <Button asChild variant="link" className="w-full text-muted-foreground">
                    <Link href="/partner-hub"><ArrowLeft className="mr-2 h-4 w-4" />Back to Partner Hub</Link>
                </Button>
            </CardFooter>
        </Card>
    );
    
    const renderFormSteps = () => {
        switch(currentFormStep) {
            case 1:
                return (
                    <div className="space-y-6">
                        {partnerType === 'garage' && (
                            <>
                               <h3 className="text-lg font-medium mb-4">Business Information</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="firmName">Garage / Firm Name</Label>
                                        <Input id="firmName" name="firmName" required />
                                    </div>
                                     <div className="space-y-2">
                                        <Label htmlFor="businessType">Type of Business</Label>
                                        <Select name="businessType" required>
                                            <SelectTrigger><SelectValue placeholder="Select business type" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="sole_proprietor">Sole Proprietor</SelectItem>
                                                <SelectItem value="partnership">Partnership</SelectItem>
                                                <SelectItem value="pvt_ltd">Private Limited</SelectItem>
                                                <SelectItem value="other">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </>
                        )}
                        <h3 className="text-lg font-medium mb-4">{partnerType === 'garage' ? "Owner's" : "Personal"} Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="name">{partnerType === 'garage' ? "Owner's Full Name" : 'Your Name'}</Label>
                                <Input id="name" name="name" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Contact Phone Number</Label>
                                <Input id="phone" name="phone" type="tel" maxLength={10} required />
                            </div>
                             <div className="space-y-2 md:col-span-2">
                                <Label>Gender</Label>
                                <RadioGroup name="gender" required className="flex gap-4 pt-2" value={gender} onValueChange={setGender}>
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="male" id="male" /><Label htmlFor="male">Male</Label></div>
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="female" id="female" /><Label htmlFor="female">Female</Label></div>
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="other" id="other" /><Label htmlFor="other">Other</Label></div>
                                </RadioGroup>
                            </div>
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-6">
                         <h3 className="text-lg font-medium mb-4">KYC & Vehicle Details</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="pan-card">PAN Card Number</Label>
                                <Input id="pan-card" name="pan-card" required className="uppercase" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="aadhaar-number">Aadhaar Number</Label>
                                <Input id="aadhaar-number" name="aadhaar-number" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="driving-licence">Driving Licence Number</Label>
                                <Input id="driving-licence" name="driving-licence" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="vehicle-number">Service Vehicle Number (RC)</Label>
                                <Input id="vehicle-number" name="vehicle-number" placeholder="e.g., DL 1S AB 1234" required />
                            </div>
                         </div>
                    </div>
                );
            case 3:
                return (
                     <div className="space-y-4">
                        <Label className="text-lg font-medium">Services Offered</Label>
                        <Card className="p-4">
                            <CardTitle className="text-md mb-2">On-Spot Service</CardTitle>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3">
                                {onSpotServices.map(service => (
                                    <div key={service.id} className="flex items-center space-x-2">
                                        <Checkbox id={service.id} onCheckedChange={() => handleServiceChange(service.label)} />
                                        <Label htmlFor={service.id} className="text-sm font-normal cursor-pointer">{service.label}</Label>
                                    </div>
                                ))}
                            </div>
                        </Card>
                        {partnerType === 'garage' && (
                            <Card className="p-4">
                                <CardTitle className="text-md mb-2">Workshop Services</CardTitle>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2">
                                    {garageServices.map(service => (
                                        <div key={service.id} className="flex items-center space-x-2">
                                            <Checkbox id={service.id} onCheckedChange={() => handleServiceChange(service.label)} />
                                            <Label htmlFor={service.id} className="text-sm font-normal cursor-pointer">{service.label}</Label>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )}
                    </div>
                );
            case 4:
                 return (
                     <div className="space-y-2">
                        <Label className="text-lg font-medium">Set Your Workshop/Base Location</Label>
                        <CardDescription>Drag the map to pin your exact location. This is crucial for job allocation.</CardDescription>
                         <div className="h-64 w-full rounded-md overflow-hidden border">
                            <LiveMap ref={mapRef} onLocationFound={(addr, coords) => setLocation({ address: addr, coords })} />
                        </div>
                        {location && <p className="text-sm text-green-600 font-medium text-center pt-2">Location Selected: {location.address}</p>}
                    </div>
                 );
            default:
                return null;
        }
    }
    
    const renderForm = () => (
        <Card className="w-full max-w-3xl">
            <CardHeader className="text-center">
                <CardTitle className="text-3xl mt-4">Become a ResQ Partner</CardTitle>
                <CardDescription>You are registering as an <span className="font-bold text-primary capitalize">{partnerType}</span>.</CardDescription>
            </CardHeader>
             <form onSubmit={handleSubmit}>
                <CardContent className="space-y-6">
                    <div className="px-10">
                      <Progress value={(currentFormStep / totalFormSteps) * 100} className="w-full" />
                    </div>
                    <div className="p-4 border rounded-lg min-h-[300px]">
                        {renderFormSteps()}
                    </div>
                </CardContent>
                <CardFooter className="flex-col gap-4">
                    <div className="w-full flex justify-between">
                         <Button type="button" variant="outline" onClick={handlePrevStep} disabled={currentFormStep === 1}>Previous</Button>
                         {currentFormStep < totalFormSteps && <Button type="button" onClick={handleNextStep}>Next</Button>}
                         {currentFormStep === totalFormSteps && <Button type="submit" disabled={isLoading}>{isLoading ? 'Submitting...' : 'Submit Application'}</Button>}
                    </div>
                     <Button variant="link" className="text-muted-foreground" onClick={() => setStep('selection')}>
                       <ArrowLeft className="mr-2 h-4 w-4" /> Back to Partner Type
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );

    if (!isMounted) {
        return (
             <div className="flex min-h-screen items-center justify-center p-4 bg-muted/40">
                <Skeleton className="h-[600px] w-full max-w-3xl" />
            </div>
        )
    }

    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-muted/40">
           {step === 'selection' ? renderSelectionStep() : renderForm()}
        </div>
    )
}
