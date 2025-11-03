

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
import { useFirebase } from '@/firebase/client-provider'
import { collection, addDoc, serverTimestamp, GeoPoint, query, where, getDocs, writeBatch, doc, limit } from "firebase/firestore";
import { Checkbox } from '@/components/ui/checkbox'
import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'
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
    const { db } = useFirebase();
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
    
    const handleLocationSelect = async () => {
        if (mapRef.current && location) {
            const newAddress = await mapRef.current.getAddress(location.coords.lat, location.coords.lon);
            if (newAddress) {
                setLocation(prev => prev ? { ...prev, address: newAddress } : null);
            }
        }
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

        if (!db) {
            toast({ variant: 'destructive', title: "Database Error", description: "Could not connect to Firestore." });
            setIsLoading(false);
            return;
        }

        const formData = new FormData(e.target as HTMLFormElement);
        const ownerName = formData.get('ownerName') as string;
        const phone = formData.get('phone') as string;
        const businessPan = formData.get('businessPan') as string;
        const gstNumber = formData.get('gstNumber') as string;
        const firmName = partnerType === 'garage' ? formData.get('firmName') as string : ownerName;
        const businessType = partnerType === 'garage' ? formData.get('businessType') as string : 'Individual';

        if (!ownerName || !phone || !businessPan || !firmName || !businessType || selectedServices.length === 0 || (partnerType === 'garage' && !location)) {
            toast({ variant: 'destructive', title: "Incomplete Form", description: "Please fill out all business details, select services and set your location." });
            setIsLoading(false);
            return;
        }
        
        // This is a simplified check. A real app might check multiple collections.
        const q = query(collection(db, "mechanics"), where("phone", "==", phone), limit(1));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            toast({ variant: 'destructive', title: "Already Registered", description: "This phone number is already associated with a ResQ partner." });
            setIsLoading(false);
            return;
        }

        try {
            const partnerId = `CZR-${phone.slice(-4)}${(firmName || '').slice(0, 2).toUpperCase()}`;

            await addDoc(collection(db, "mechanics"), {
                partnerId: partnerId,
                name: ownerName,
                firmName: firmName,
                phone: phone,
                businessType: businessType,
                panCard: businessPan,
                gstNumber: gstNumber,
                services: selectedServices,
                location: location ? new GeoPoint(location.coords.lat, location.coords.lon) : null,
                address: location?.address,
                type: 'mechanic',
                status: 'pending_verification',
                isAvailable: false,
                createdAt: serverTimestamp(),
                walletBalance: 0,
            });
            
            toast({
                title: "Application Submitted!",
                description: `Thank you, ${firmName}. Your application as a ResQ partner is under review.`,
            });

            setTimeout(() => {
                router.push(`/login?role=driver&phone=${encodeURIComponent(phone)}`);
            }, 1500);

        } catch (error) {
            console.error("Error during mechanic onboarding: ", error);
            toast({ variant: 'destructive', title: "Submission Failed", description: "Something went wrong. Please try again." });
            setIsLoading(false);
        }
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
                    <Link href="/partner-hub" legacyBehavior><ArrowLeft className="mr-2 h-4 w-4" />Back to Partner Hub</Link>
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
                                <Label htmlFor="ownerName">{partnerType === 'garage' ? "Owner's Full Name" : 'Your Name'}</Label>
                                <Input id="ownerName" name="ownerName" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Contact Phone Number</Label>
                                <Input id="phone" name="phone" type="tel" maxLength={10} required />
                            </div>
                        </div>
                    </div>
                );
            case 2:
                return (
                     <div className="space-y-6">
                         <h3 className="text-lg font-medium mb-4">KYC & Tax Information</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="businessPan">{partnerType === 'garage' ? 'Business PAN' : 'Personal PAN'}</Label>
                                <Input id="businessPan" name="businessPan" required className="uppercase" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="gstNumber">GST Number (Optional)</Label>
                                <Input id="gstNumber" name="gstNumber" className="uppercase" />
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
            case 4: // Garage only step
                 return (
                     <div className="space-y-2">
                        <Label className="text-lg font-medium">Set Your Workshop Location</Label>
                        <CardDescription>Drag the map to pin your exact garage location. This is crucial for job allocation.</CardDescription>
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
