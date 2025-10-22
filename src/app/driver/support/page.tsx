
'use client'

import { useState, useEffect, useRef } from 'react'
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import SearchingIndicator from '@/components/ui/searching-indicator'


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

interface GarageRequest {
    id: string;
    status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled_by_mechanic' | 'cancelled_by_driver' | 'payment_requested' | 'bill_sent';
    mechanicId?: string;
    mechanicName?: string;
    mechanicLocation?: GeoPoint;
    mechanicPhone?: string;
    eta?: number;
}


export default function SupportPage() {
    const { toast } = useToast()
    const { t } = useLanguage();
    const [partnerData, setPartnerData] = useState<PartnerData | null>(null);
    const [activeGarageRequest, setActiveGarageRequest] = useState<GarageRequest | null>(null);
    const [isIssueDialogOpen, setIsIssueDialogOpen] = useState(false);
    const [selectedIssue, setSelectedIssue] = useState('');
    const [mechanicLiveLocation, setMechanicLiveLocation] = useState<{lat: number, lon: number} | null>(null);

    useEffect(() => {
        if (!db) return;
        const session = localStorage.getItem('cabzi-session');
        if (session) {
            const { partnerId } = JSON.parse(session);
            const unsubPartner = onSnapshot(doc(db, 'partners', partnerId), (doc) => {
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
            
            const q = query(collection(db, "garageRequests"), where("driverId", "==", partnerId));
            const unsubRequests = onSnapshot(q, (snapshot) => {
                const requests = snapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() } as GarageRequest))
                    .filter(req => req.status !== 'completed' && req.status !== 'cancelled_by_driver');
                
                if (requests.length > 0) {
                    const currentRequest = requests[0];
                    if (activeGarageRequest?.status !== 'accepted' && currentRequest.status === 'accepted') {
                        toast({ title: "ResQ Partner Assigned!", description: `${currentRequest.mechanicName} is on the way.` });
                    }
                    setActiveGarageRequest(currentRequest);
                } else {
                    setActiveGarageRequest(null);
                    setMechanicLiveLocation(null);
                }
            });

            return () => {
                unsubPartner();
                unsubRequests();
            };
        }
    }, [toast, activeGarageRequest?.status]);

    useEffect(() => {
        let unsubMechanic: (() => void) | undefined;
        if (activeGarageRequest?.mechanicId) {
            const mechanicRef = doc(db, 'mechanics', activeGarageRequest.mechanicId);
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
    }, [activeGarageRequest?.mechanicId]);

    const handleRequestMechanic = async () => {
        if (!db || !partnerData || !partnerData.currentLocation || !selectedIssue) {
            toast({ variant: "destructive", title: "Error", description: "Could not get your location or user details." });
            return;
        }
        const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
        const requestDocRef = await addDoc(collection(db, 'garageRequests'), {
            driverId: partnerData.id,
            driverName: partnerData.name,
            driverPhone: partnerData.phone,
            issue: selectedIssue,
            location: new GeoPoint(partnerData.currentLocation.lat, partnerData.currentLocation.lon),
            status: 'pending',
            otp: generatedOtp,
            createdAt: serverTimestamp(),
        });
    
        localStorage.setItem('activeGarageRequestId', requestDocRef.id);
        toast({ title: "Request Sent!", description: "We are finding a nearby ResQ partner for you." });
        setIsIssueDialogOpen(false);
    }
    
     const handleCancelServiceRequest = async () => {
        if (!db || !activeGarageRequest) return;
        const requestRef = doc(db, 'garageRequests', activeGarageRequest.id);
        try {
          await updateDoc(requestRef, { status: 'cancelled_by_driver' });
          toast({ variant: 'destructive', title: 'Service Request Cancelled' });
          setActiveGarageRequest(null);
          setMechanicLiveLocation(null);
          localStorage.removeItem('activeGarageRequestId');
        } catch (error) {
          toast({ variant: 'destructive', title: 'Error', description: 'Could not cancel the request.' });
        }
    };


    const renderGarageSupport = () => {
        if (activeGarageRequest) {
             return (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Siren className="w-6 h-6 text-primary animate-pulse"/> SOS Garage Request Active</CardTitle>
                        <CardDescription>Your request for assistance is in progress.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <div className="h-64 w-full rounded-md overflow-hidden border">
                           <LiveMap driverLocation={mechanicLiveLocation} riderLocation={partnerData?.currentLocation} />
                        </div>
                        {activeGarageRequest.status === 'pending' && (
                             <div className="text-center py-4">
                                <SearchingIndicator partnerType="resq" />
                                <p className="font-semibold mt-4 text-lg">Finding a ResQ partner near you...</p>
                            </div>
                        )}
                        {activeGarageRequest.status === 'accepted' && (
                             <div className="flex items-center gap-3 bg-muted p-3 rounded-lg">
                                <Avatar className="w-12 h-12 border-2 border-primary">
                                    <AvatarImage src={'https://placehold.co/100x100.png'} alt="Mechanic" data-ai-hint="mechanic portrait" />
                                    <AvatarFallback>{activeGarageRequest.mechanicName?.substring(0,2)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <p className="font-bold">{activeGarageRequest.mechanicName}</p>
                                    <p className="text-sm text-muted-foreground">Is on the way.</p>
                                </div>
                                <div className="text-right">
                                    {activeGarageRequest.eta && <p className="font-bold text-lg">{activeGarageRequest.eta} min</p>}
                                    <p className="text-xs text-muted-foreground">ETA</p>
                                </div>
                                 <Button asChild variant="outline" size="icon" className="h-10 w-10 shrink-0">
                                    <a href={`tel:${activeGarageRequest.mechanicPhone}`}><Phone className="w-4 h-4"/></a>
                                </Button>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter>
                         <Button variant="destructive" className="w-full" onClick={handleCancelServiceRequest}>Cancel Request</Button>
                    </CardFooter>
                </Card>
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
                              <DialogDescription>Tell us what's wrong, and we'll find a nearby mechanic for you. A fixed visit charge may apply.</DialogDescription>
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
        <div className="grid gap-6">
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
                        <p className="text-sm text-muted-foreground">Upgrade to the "Pro" plan to activate your free Accidental Insurance coverage.</p>
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
        </div>
    )
}
