
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LifeBuoy, Phone, Shield, Wrench, Siren } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import dynamic from 'next/dynamic'
import { db } from '@/lib/firebase'
import { collection, query, where, onSnapshot, doc, GeoPoint, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useLanguage } from '@/hooks/use-language'
import { useFirebase } from '@/firebase/client-provider'
import type { ClientSession, GarageRequest } from '@/lib/types'
import RideStatus from '@/components/ride-status'


const LiveMap = dynamic(() => import('@/components/live-map'), { 
    ssr: false,
    loading: () => <div className="w-full h-full bg-muted flex items-center justify-center"><p>Loading Map...</p></div>
});

const commonIssues = [
    { id: 'flat_tyre', label: 'Flat Tyre / Puncture' },
    { id: 'battery_jumpstart', label: 'Battery Jump-Start' },
    { id: 'engine_trouble', label: 'Minor Engine Trouble' },
    { id: 'towing_required', label: 'Towing Required' },
    { id: 'other', label: 'Other Issue' },
]

interface PartnerData {
    id: string;
    name: string;
    phone: string;
    currentLocation?: { lat: number, lon: number };
}


export default function SupportPage() {
    const { toast } = useToast()
    const { t } = useLanguage();
    const { user, db: firebaseDb } = useFirebase();
    const [partnerData, setPartnerData] = useState<PartnerData | null>(null);
    const [activeGarageRequest, setActiveGarageRequest] = useState<GarageRequest | null>(null);
    const [isIssueDialogOpen, setIsIssueDialogOpen] = useState(false);
    const [selectedIssue, setSelectedIssue] = useState('');
    const [mechanicLiveLocation, setMechanicLiveLocation] = useState<{lat: number, lon: number} | null>(null);

    useEffect(() => {
        if (!firebaseDb || !user) return;
        
        // Fetch driver's data
        const partnerRef = doc(firebaseDb, 'partners', user.uid);
        const unsubPartner = onSnapshot(partnerRef, (doc) => {
            const data = doc.data();
            if(data) {
                const loc = data.currentLocation;
                setPartnerData({ 
                    id: doc.id,
                    name: data.name,
                    phone: data.phone,
                    currentLocation: loc ? { lat: loc.latitude, lon: loc.longitude } : undefined,
                 });
            }
        });

        // Listen for active garage requests for this driver
        const q = query(collection(firebaseDb, "garageRequests"), where("driverId", "==", user.uid), where("status", "not-in", ["completed", "cancelled_by_driver", "cancelled_by_mechanic"]));
        const unsubRequests = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const requestDoc = snapshot.docs[0];
                const requestData = { id: requestDoc.id, ...requestDoc.data() } as GarageRequest;

                if (activeGarageRequest?.status !== 'accepted' && requestData.status === 'accepted') {
                    toast({ title: "ResQ Partner Assigned!", description: `${requestData.mechanicName} is on the way.` });
                }
                setActiveGarageRequest(requestData);
                localStorage.setItem('activeGarageRequestId', requestDoc.id);

            } else {
                setActiveGarageRequest(null);
                setMechanicLiveLocation(null);
                localStorage.removeItem('activeGarageRequestId');
            }
        });

        return () => {
            unsubPartner();
            unsubRequests();
        };
    }, [firebaseDb, user, toast, activeGarageRequest?.status]);


    useEffect(() => {
        let unsubMechanic: (() => void) | undefined;
        if (activeGarageRequest?.mechanicId && firebaseDb) {
            const mechanicRef = doc(firebaseDb, 'mechanics', activeGarageRequest.mechanicId);
            unsubMechanic = onSnapshot(mechanicRef, (doc) => {
                if (doc.exists()) {
                    const data = doc.data();
                    if (data.currentLocation) {
                        setMechanicLiveLocation({
                            lat: data.currentLocation.latitude,
                            lon: data.currentLocation.longitude,
                        });
                    }
                }
            });
        }
        return () => {
            if (unsubMechanic) {
                unsubMechanic();
            }
        };
    }, [activeGarageRequest?.mechanicId, firebaseDb]);

    const handleRequestMechanic = async () => {
        if (!firebaseDb || !partnerData || !partnerData.currentLocation || !selectedIssue) {
            toast({ variant: "destructive", title: "Error", description: "Could not get your location or user details." });
            return;
        }
        const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
        const requestData = {
            driverId: partnerData.id,
            driverName: partnerData.name,
            driverPhone: partnerData.phone,
            issue: selectedIssue,
            location: new GeoPoint(partnerData.currentLocation.lat, partnerData.currentLocation.lon),
            status: 'pending' as const,
            otp: generatedOtp,
            createdAt: serverTimestamp(),
        };
        await addDoc(collection(firebaseDb, 'garageRequests'), requestData);
        
        toast({ title: "Request Sent!", description: "We are finding a nearby ResQ partner for you." });
        setIsIssueDialogOpen(false);
    }
    
    const handleCancelServiceRequest = async () => {
        if (!firebaseDb || !activeGarageRequest) return;
        const requestRef = doc(firebaseDb, 'garageRequests', activeGarageRequest.id);
        try {
          await updateDoc(requestRef, { status: 'cancelled_by_driver' });
          toast({ variant: 'destructive', title: 'Service Request Cancelled' });
        } catch (error) {
          toast({ variant: 'destructive', title: 'Error', description: 'Could not cancel the request.' });
        }
    };


    const renderGarageSupport = () => {
        if (activeGarageRequest) {
             return (
                <div className="flex justify-center items-center h-full">
                    <RideStatus 
                        ride={activeGarageRequest as any}
                        isGarageRequest 
                        onCancel={handleCancelServiceRequest}
                    />
                </div>
            )
        }
        
        return (
            <Card>
                <CardHeader>
                    <div className='flex items-center gap-2'>
                        <Wrench className='w-6 h-6 text-primary'/>
                        <CardTitle>SOS Garage</CardTitle>
                    </div>
                    <CardDescription>Vehicle trouble? Request immediate on-spot assistance from a verified ResQ partner near you.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="h-64 w-full rounded-md overflow-hidden border">
                       <LiveMap driverLocation={partnerData?.currentLocation} />
                    </div>
                     <Dialog open={isIssueDialogOpen} onOpenChange={setIsIssueDialogOpen}>
                      <DialogTrigger asChild>
                         <Button size="lg" className="w-full">
                            <Wrench className="mr-2 h-5 w-5" /> Request On-Spot Mechanic
                         </Button>
                      </DialogTrigger>
                      <DialogContent>
                          <DialogHeader>
                              <DialogTitle>Request Roadside Assistance</DialogTitle>
                              <DialogDescription>Tell us what&apos;s wrong, and we&apos;ll find a nearby mechanic for you. A fixed visit charge may apply.</DialogDescription>
                          </DialogHeader>
                          <div className="py-4">
                            <RadioGroup onValueChange={setSelectedIssue} value={selectedIssue}>
                              <div className="space-y-2">
                                {commonIssues.map(issue => (
                                  <div key={issue.id} className="flex items-center space-x-2">
                                    <RadioGroupItem value={issue.label} id={issue.id} />
                                    <Label htmlFor={issue.id} className="font-normal">{issue.label}</Label>
                                  </div>
                                ))}
                              </div>
                            </RadioGroup>
                          </div>
                          <DialogFooter>
                            <Button 
                              onClick={handleRequestMechanic} 
                              className="w-full" 
                              disabled={!selectedIssue}
                            >
                              Confirm & Find Help
                            </Button>
                          </DialogFooter>
                      </DialogContent>
                    </Dialog>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="grid gap-6 h-full">
            
            {activeGarageRequest ? renderGarageSupport() : (
                <>
                    <h2 className="text-3xl font-bold tracking-tight">Help &amp; Support</h2>
                    {renderGarageSupport()}
                     <Card>
                        <CardHeader>
                            <div className='flex items-center gap-2'>
                                <Shield className='w-6 h-6 text-primary'/>
                                <CardTitle>Insurance Details</CardTitle>
                            </div>
                            <CardDescription>Your insurance status and support, based on your active subscription plan.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="p-4 bg-muted rounded-lg text-center">
                                <p className="font-semibold">Insurance Not Active</p>
                                <p className="text-sm text-muted-foreground">Upgrade to the &quot;Pro&quot; plan to activate your free Accidental Insurance coverage.</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Contact Support</CardTitle>
                            <CardDescription>Need help with anything else? Our partner support team is here for you.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Button size="lg" variant="outline" onClick={() => toast({ title: t('toast_coming_soon') })}><LifeBuoy className="mr-2 h-5 w-5" /> Open Support Ticket</Button>
                            <Button size="lg" asChild><a href="tel:1800-XXX-XXXX"><Phone className="mr-2 h-5 w-5" /> Call Helpline</a></Button>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    )
}

    