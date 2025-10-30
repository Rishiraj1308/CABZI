

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
import { useDb } from '@/firebase/client-provider'
import { collection, addDoc, serverTimestamp, GeoPoint, query, where, getDocs, writeBatch, doc } from "firebase/firestore";
import { Checkbox } from '@/components/ui/checkbox'
import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'


const LiveMap = dynamic(() => import('@/components/live-map'), { 
    ssr: false,
    loading: () => <Skeleton className="w-full h-full bg-muted" />
});

const garageServices = [
    { id: 'full_servicing', label: 'Full Servicing / AMC' },
    { id: 'brake_clutch', label: 'Brake / Clutch Work' },
    { id: 'suspension_repair', label: 'Suspension / Shocker Repair' },
    { id: 'engine_overhaul', 'label': 'Engine Tuning / Overhaul' },
    { id: 'ac_repair', label: 'AC Repair & Gas Filling' },
    { id: 'denting_painting', label: 'Body Denting & Painting' },
    { id: 'tyre_balancing', label: 'Tyre Change & Wheel Balancing' },
    { id: 'electrical_repair', label: 'Major Electrical Repair' },
    { id: 'accessories_fitment', label: 'Sound System / Camera Fitment' },
    { id: 'glass_work', label: 'Windshield & Glass Work' },
    { id: 'pick_drop', label: 'Garage Pick & Drop Service' },
    { id: 'on_spot_assistance', label: 'On-Spot Emergency Assistance' },
]


export default function GarageOnboardingPage() {
    const { toast } = useToast()
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [isMounted, setIsMounted] = useState(false)
    const [selectedServices, setSelectedServices] = useState<string[]>([]);
    const [location, setLocation] = useState<{ address: string, coords: { lat: number, lon: number } } | null>(null);
    const mapRef = useRef<any>(null);
    const db = useDb();

    useEffect(() => {
        setIsMounted(true)
    }, [])

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

        if (!ownerName || !phone || !businessPan || !firmName || !businessType || selectedServices.length === 0 || !location) {
            toast({ variant: 'destructive', title: "Incomplete Form", description: "Please fill out all business details, select services and set your location." });
            setIsLoading(false);
            return;
        }
        
        // This is a simplified check. A real app might check multiple collections.
        const q = query(collection(db, "vendors"), where("phone", "==", phone));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            toast({ variant: 'destructive', title: "Already Registered", description: "This phone number is already associated with a vendor account." });
            setIsLoading(false);
            return;
        }

        try {
            const batch = writeBatch(db);

            // Create garage document (could be in a 'garages' collection later)
            // For now, let's add it to 'vendors' with more details.
            const vendorRef = doc(collection(db, 'vendors'));
            batch.set(vendorRef, {
                name: firmName,
                ownerName: ownerName,
                service: "Garage & Workshop Services",
                commissionModel: "15% on Service Fee",
                totalPayouts: 0,
                dueAmount: 0,
                status: 'Pending',
                phone: phone,
                businessType: businessType,
                businessPan: businessPan,
                gstNumber: gstNumber,
                location: new GeoPoint(location.coords.lat, location.coords.lon),
                address: location.address,
                services: selectedServices,
                createdAt: serverTimestamp(),
            });
            
            toast({
                title: "Garage Onboarding Submitted!",
                description: `Thank you, ${firmName}. Your application is under review.`,
            });
            
            await batch.commit();

            setTimeout(() => {
                router.push(`/login?role=driver&phone=${encodeURIComponent(phone)}`);
            }, 1500);

        } catch (error) {
            console.error("Error during garage onboarding: ", error);
            toast({ variant: 'destructive', title: "Submission Failed", description: "Something went wrong. Please try again." });
            setIsLoading(false);
        }
    }

    if (!isMounted) {
        return (
             <div className="flex min-h-screen items-center justify-center p-4 bg-muted/40">
                <Card className="w-full max-w-2xl">
                    <CardHeader className="text-center">
                        <div className="mx-auto"> <BrandLogo iconClassName="w-12 h-12" /></div>
                        <CardTitle className="text-3xl mt-4">Onboard Your Garage</CardTitle>
                        <CardDescription>
                            Join our network to get more customers and grow your business.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-96 w-full" />
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-muted/40">
            <Card className="w-full max-w-2xl">
                <CardHeader className="text-center">
                    <div className="mx-auto"><BrandLogo iconClassName="w-12 h-12" /></div>
                    <CardTitle className="text-3xl mt-4">Onboard Your Garage</CardTitle>
                    <CardDescription>
                        Fill in your business details to join the Cabzi ResQ network.
                        <br/>
                        Already a partner? <Link href="/login?role=driver" className="text-primary underline">Log in</Link>
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-6">
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
                                <div className="space-y-2">
                                    <Label htmlFor="businessPan">Business PAN</Label>
                                    <Input id="businessPan" name="businessPan" required className="uppercase" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="gstNumber">GST Number (Optional)</Label>
                                    <Input id="gstNumber" name="gstNumber" className="uppercase" />
                                </div>
                            </div>
                        </div>

                         <div className="border-b pb-6">
                           <h3 className="text-lg font-medium mb-4">Owner&apos;s Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="ownerName">Owner&apos;s Full Name</Label>
                                    <Input id="ownerName" name="ownerName" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Contact Phone Number</Label>
                                    <Input id="phone" name="phone" type="tel" required />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Label className="text-lg font-medium">Services Offered</Label>
                             <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3 p-4 border rounded-lg">
                                {garageServices.map(service => (
                                    <div key={service.id} className="flex items-center space-x-2">
                                        <Checkbox 
                                            id={service.id} 
                                            onCheckedChange={() => handleServiceChange(service.id)}
                                        />
                                        <Label htmlFor={service.id} className="text-sm font-normal cursor-pointer">{service.label}</Label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-lg font-medium">Set Your Workshop Location</Label>
                            <CardDescription>Drag the map to pin your exact garage location. This is crucial for job allocation.</CardDescription>
                             <div className="h-64 w-full rounded-md overflow-hidden border">
                                <LiveMap ref={mapRef} onLocationFound={(addr, coords) => setLocation({ address: addr, coords })} />
                            </div>
                            <Button type="button" variant="outline" className="w-full" onClick={handleLocationSelect}>Confirm My Location on Map</Button>
                            {location && <p className="text-sm text-green-600 font-medium text-center">Location Selected: {location.address}</p>}
                        </div>

                    </CardContent>
                    <CardFooter>
                        <Button type="submit" className="w-full btn-glow bg-accent text-accent-foreground hover:bg-accent/90" disabled={isLoading}>
                            {isLoading ? 'Submitting...' : 'Finish Garage Onboarding'}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
