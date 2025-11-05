
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

const LiveMap = dynamic(() => import('@/components/live-map'), { 
    ssr: false,
    loading: () => <Skeleton className="w-full h-full bg-muted" />,
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
    const mapRef = useRef<any>(null);
    const [partnerType, setPartnerType] = useState<'individual' | 'garage' | null>(null);

    useEffect(() => { 
        setIsMounted(true);
        if (partnerType === 'garage' && mapRef.current) {
            setTimeout(() => {
                mapRef.current?.locate();
            }, 500);
        }
    }, [partnerType]);

    const handleServiceChange = (serviceId: string) => {
        setSelectedServices(prev => 
            prev.includes(serviceId) 
                ? prev.filter(id => id !== serviceId)
                : [...prev, serviceId]
        );
    }
    
    const handleLocationSelect = async () => {
        if (mapRef.current) {
             const center = mapRef.current.getCenter();
            if (center) {
                const address = await mapRef.current.getAddress(center.lat, center.lng);
                setLocation({ address: address || 'Could not fetch address', coords: { lat: center.lat, lon: center.lng } });
                toast({ title: "Location Confirmed!", description: address });
            }
        }
    }
    

    const selectPartnerType = (type: 'individual' | 'garage') => {
        setPartnerType(type);
    }

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
        const firmName = formData.get('firmName') as string;
        const businessType = formData.get('businessType') as string;

        if (!ownerName || !phone || !businessPan || selectedServices.length === 0) {
            toast({ variant: 'destructive', title: "Incomplete Form", description: "Please fill out all personal details and select your services." });
            setIsLoading(false);
            return;
        }
        
        if (partnerType === 'garage' && (!firmName || !businessType || !location)) {
            toast({ variant: 'destructive', title: "Incomplete Form", description: "Please fill out all business details and set your location." });
            setIsLoading(false);
            return;
        }
        
        const q = query(collection(db, "mechanics"), where("phone", "==", phone), limit(1));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            toast({ variant: 'destructive', title: "Already Registered", description: "This phone number is already associated with a ResQ partner." });
            setIsLoading(false);
            return;
        }

        try {
            const finalFirmName = partnerType === 'garage' ? firmName : ownerName;
            const finalBusinessType = partnerType === 'garage' ? businessType : 'Individual';
            const partnerId = `CZR-${phone.slice(-4)}${(finalFirmName || '').slice(0, 2).toUpperCase()}`;

            await addDoc(collection(db, "mechanics"), {
                partnerId: partnerId,
                name: ownerName,
                firmName: finalFirmName,
                phone: phone,
                businessType: finalBusinessType,
                panCard: businessPan,
                gstNumber: gstNumber,
                services: selectedServices,
                location: partnerType === 'garage' ? new GeoPoint(location!.coords.lat, location!.coords.lon) : null,
                address: partnerType === 'garage' ? location!.address : null,
                type: 'mechanic',
                status: 'pending_verification',
                isAvailable: false,
                createdAt: serverTimestamp(),
                walletBalance: 0,
            });
            
            toast({
                title: "Application Submitted!",
                description: `Thank you, ${finalFirmName}. Your application as a ResQ partner is under review.`,
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
                    <Link href="/partner-hub">
                        <span><ArrowLeft className="mr-2 h-4 w-4" />Back to Partner Hub</span>
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    );

    const renderForm = () => {
        const servicesToShow = partnerType === 'garage' ? [...onSpotServices, ...garageServices] : onSpotServices;
        return (
            <Card className="w-full max-w-3xl">
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl mt-4">Become a ResQ Partner</CardTitle>
                    <CardDescription>You are registering as an <span className="font-bold text-primary capitalize">{partnerType}</span>.</CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-6">
                        {partnerType === 'garage' && (
                            <div className="border-b pb-6">
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
                            </div>
                        )}
                         <div className="border-b pb-6">
                           <h3 className="text-lg font-medium mb-4">{partnerType === 'garage' ? "Owner's" : "Personal"} Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="ownerName">{partnerType === 'garage' ? "Owner's Full Name" : 'Your Name'}</Label>
                                    <Input id="ownerName" name="ownerName" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Contact Phone Number</Label>
                                     <div className="flex items-center gap-0 rounded-md border border-input focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                                        <span className="pl-3 text-muted-foreground text-sm">+91</span>
                                        <Input id="phone" name="phone" type="tel" maxLength={10} placeholder="12345 67890" required className="border-0 h-9 focus-visible:ring-0 focus-visible:ring-offset-0 flex-1" />
                                    </div>
                                </div>
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

                        <div className="space-y-4 border-b pb-6">
                            <Label className="text-lg font-medium">Services Offered</Label>
                             <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3 p-4 border rounded-lg">
                                {servicesToShow.map(service => (
                                    <div key={service.id} className="flex items-center space-x-2">
                                        <Checkbox id={service.id} onCheckedChange={() => handleServiceChange(service.label)} />
                                        <Label htmlFor={service.id} className="text-sm font-normal cursor-pointer">{service.label}</Label>
                                    </div>
                                ))}
                            </div>
                        </div>

                         {partnerType === 'garage' && (
                            <div className="space-y-2">
                                <Label className="text-lg font-medium">Set Your Workshop Location</Label>
                                <CardDescription>Drag the map to pin your exact garage location. This is crucial for job allocation.</CardDescription>
                                <div className="h-64 w-full rounded-md overflow-hidden border">
                                    <LiveMap ref={mapRef} onLocationFound={(addr, coords) => setLocation({ address: addr, coords })} />
                                </div>
                                <Button type="button" variant="outline" className="w-full" onClick={handleLocationSelect}>Confirm My Location on Map</Button>
                                {location && <p className="text-sm text-green-600 font-medium text-center">Location Selected: {location.address}</p>}
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="flex-col gap-4">
                        <Button type="submit" className="w-full btn-glow bg-accent text-accent-foreground hover:bg-accent/90" disabled={isLoading}>
                            {isLoading ? 'Submitting...' : 'Submit Application'}
                        </Button>
                        <Button variant="link" className="text-muted-foreground" onClick={() => setPartnerType(null)}>
                           <ArrowLeft className="mr-2 h-4 w-4" /> Back to Partner Type
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        );
    }

    if (!isMounted) {
        return (
             <div className="flex min-h-screen items-center justify-center p-4 bg-muted/40">
                <Skeleton className="h-[600px] w-full max-w-3xl" />
            </div>
        )
    }

    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-muted/40">
           {!partnerType ? renderSelectionStep() : renderForm()}
        </div>
    )
}
