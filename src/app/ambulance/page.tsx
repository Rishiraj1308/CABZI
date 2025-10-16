
'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { KeyRound, Navigation, Phone, Siren, User, MapPin, Activity, CheckCircle, ListChecks, CheckSquare } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import dynamic from 'next/dynamic'
import { db } from '@/lib/firebase'
import { collection, query, where, onSnapshot, doc, updateDoc, GeoPoint } from 'firebase/firestore'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'

const LiveMap = dynamic(() => import('@/components/live-map'), {
    ssr: false,
    loading: () => <div className="w-full h-full bg-muted flex items-center justify-center"><p>Loading Map...</p></div>
});

interface OngoingCase {
    id: string;
    caseId: string;
    riderName: string;
    phone: string;
    location: GeoPoint;
    hospitalLocation: GeoPoint;
    status: 'onTheWay' | 'arrived' | 'inTransit';
    otp: string;
}

interface ChecklistItem {
    id: string;
    text: string;
}

export default function AmbulanceDriverDashboard() {
    const [assignedCase, setAssignedCase] = useState<OngoingCase | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [enteredOtp, setEnteredOtp] = useState('');
    const { toast } = useToast();
    const watchIdRef = useRef<number | null>(null);
    const [isOnDuty, setIsOnDuty] = useState(false);
    const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
    const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

    useEffect(() => {
        const session = localStorage.getItem('cabzi-ambulance-session');
        if (!session || !db) {
            setIsLoading(false);
            return;
        }

        const { partnerId, hospitalId } = JSON.parse(session);
        if (!partnerId) {
            toast({ variant: 'destructive', title: 'Session Error', description: 'Driver ID not found.' });
            setIsLoading(false);
            return;
        }

        const q = query(
            collection(db, 'emergencyCases'),
            where('assignedAmbulanceId', '==', partnerId), // This should query the ambulance vehicle ID
            where('status', 'in', ['onTheWay', 'arrived', 'inTransit', 'accepted'])
        );
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const caseDoc = snapshot.docs[0];
                const caseData = { id: caseDoc.id, ...caseDoc.data() } as OngoingCase;

                // The driver's app should not show 'accepted'. It should immediately be 'onTheWay' from their perspective.
                if(caseData.status === 'accepted'){
                    caseData.status = 'onTheWay';
                }
                setAssignedCase(caseData);
                setIsOnDuty(true); // If there's a case, they are on duty

            } else {
                setAssignedCase(null);
            }
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching assigned case for ambulance:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch assigned case.' });
            setIsLoading(false);
        });

        // Fetch checklist
        const checklistRef = collection(db, `ambulances/${hospitalId}/checklistTemplate`);
        const unsubChecklist = onSnapshot(checklistRef, (snapshot) => {
            setChecklist(snapshot.docs.map(d => ({id: d.id, ...d.data()} as ChecklistItem)));
        });

        return () => {
            unsubscribe();
            unsubChecklist();
        };
    }, [toast]);
    
    // Live location tracking
    useEffect(() => {
        if (assignedCase?.id && db) {
            const caseRef = doc(db, 'emergencyCases', assignedCase.id);
            watchIdRef.current = navigator.geolocation.watchPosition(
                (pos) => {
                    const newGeoPoint = new GeoPoint(pos.coords.latitude, pos.coords.longitude);
                    updateDoc(caseRef, { partnerLocation: newGeoPoint });
                },
                (err) => console.error("Could not get driver location:", err),
                { enableHighAccuracy: true }
            );
        }

        return () => {
            if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
        };
    }, [assignedCase?.id, db]);

    const handleUpdateStatus = async (status: 'arrived' | 'inTransit' | 'completed') => {
        if (!assignedCase || !db) return;
        const caseRef = doc(db, 'emergencyCases', assignedCase.id);
        try {
            await updateDoc(caseRef, { status });
            toast({ title: "Status Updated", description: `Case status is now: ${status}` });
        } catch (error) {
            toast({ variant: 'destructive', title: "Update Failed", description: "Could not update case status." });
        }
    };

    const handleVerifyOtp = async () => {
        if (enteredOtp === assignedCase?.otp) {
            await handleUpdateStatus('inTransit');
            setEnteredOtp('');
            toast({ title: "OTP Verified!", description: "Patient transit to hospital has started.", className: "bg-green-600 text-white border-green-600" });
        } else {
            toast({ variant: 'destructive', title: "Invalid OTP", description: "Please ask the patient's escort for the correct OTP." });
        }
    };
    
    const handleChecklistItem = (id: string, checked: boolean) => {
        setCheckedItems(prev => ({...prev, [id]: checked}));
    };

    const handleGoOnDuty = () => {
        // In a real app, you'd save this checklist history to Firestore
        setIsOnDuty(true);
        toast({ title: "You are now On-Duty", description: "Waiting for Mission Control to assign a case." });
    };

    const patientLocation = assignedCase ? { lat: assignedCase.location.latitude, lon: assignedCase.location.longitude } : undefined;
    const destinationLocation = assignedCase?.status === 'inTransit' ? { lat: assignedCase.hospitalLocation.latitude, lon: assignedCase.hospitalLocation.longitude } : patientLocation;
    const navigateUrl = destinationLocation ? `https://www.google.com/maps/dir/?api=1&destination=${destinationLocation.lat},${destinationLocation.lon}` : '#';
    
    const allItemsChecked = checklist.length > 0 && checklist.every(item => checkedItems[item.id]);

    if (isLoading) {
        return <div className="flex items-center justify-center h-full"><Skeleton className="h-96 w-full max-w-2xl" /></div>;
    }
    
     if (!isOnDuty) {
        return (
            <div className="flex justify-center items-center h-full">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><ListChecks className="w-6 h-6 text-primary"/> Pre-Duty Checklist</CardTitle>
                        <CardDescription>Complete this checklist to go on-duty. This ensures your vehicle is ready for any emergency.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 max-h-[50vh] overflow-y-auto pr-4">
                        {checklist.map(item => (
                            <div key={item.id} className="flex items-center space-x-3 p-3 bg-muted rounded-md">
                                <Checkbox 
                                    id={item.id} 
                                    checked={checkedItems[item.id] || false}
                                    onCheckedChange={(checked) => handleChecklistItem(item.id, !!checked)}
                                />
                                <Label htmlFor={item.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    {item.text}
                                </Label>
                            </div>
                        ))}
                         {checklist.length === 0 && <p className="text-center text-muted-foreground py-4">No checklist items defined by hospital admin yet.</p>}
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleGoOnDuty} disabled={!allItemsChecked} className="w-full">
                            <CheckSquare className="mr-2 h-4 w-4"/>
                            Complete Checklist & Go On-Duty
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    if (!assignedCase) {
        return (
            <div className="flex flex-col items-center justify-center text-center h-full">
                <div className="p-6 bg-green-100 dark:bg-green-900/30 rounded-full mb-4 animate-pulse">
                    <Activity className="w-12 h-12 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold">You are on standby.</h2>
                <p className="text-muted-foreground">Waiting for Mission Control to assign a new case.</p>
            </div>
        );
    }

    return (
        <div className="grid lg:grid-cols-2 gap-6 items-start h-full">
            <div className="lg:col-span-1 h-full rounded-lg overflow-hidden border">
                <LiveMap riderLocation={destinationLocation} />
            </div>
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Siren className="w-6 h-6 text-destructive animate-pulse" /> Assigned Case</CardTitle>
                        <CardDescription>ID: {assignedCase.caseId}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <div className="flex items-center gap-3 bg-muted p-3 rounded-lg">
                            <Avatar className="w-12 h-12 border-2 border-primary">
                                <AvatarImage src="https://placehold.co/100x100.png" alt="Patient" data-ai-hint="patient portrait" />
                                <AvatarFallback><User/></AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <p className="font-bold">{assignedCase.riderName}</p>
                                <p className="text-sm text-muted-foreground flex items-center gap-2">
                                    <Phone className="w-3 h-3"/> {assignedCase.phone}
                                </p>
                            </div>
                        </div>
                         <div className="flex items-center gap-3 bg-muted p-3 rounded-lg">
                            <MapPin className="w-5 h-5 text-primary"/>
                             <div className="flex-1">
                                <p className="font-bold">{assignedCase.status === 'inTransit' ? 'Drop-off Location' : 'Pickup Location'}</p>
                                <p className="text-sm text-muted-foreground">{destinationLocation ? `Lat: ${destinationLocation.lat.toFixed(4)}, Lon: ${destinationLocation.lon.toFixed(4)}` : '...'}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Actions &amp; OTP</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {assignedCase.status === 'arrived' && (
                            <div className="space-y-2 animate-fade-in">
                                <Label htmlFor="otp">Enter Patient OTP to Start Transit</Label>
                                <div className="flex gap-2">
                                    <Input id="otp" value={enteredOtp} onChange={(e) => setEnteredOtp(e.target.value)} placeholder="4-Digit OTP" className="text-center text-lg tracking-[0.5em]" maxLength={4}/>
                                    <Button onClick={handleVerifyOtp}><CheckCircle className="w-4 h-4 mr-2"/>Verify</Button>
                                </div>
                            </div>
                        )}
                        <Button asChild size="lg" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                            <a href={navigateUrl} target="_blank" rel="noopener noreferrer">
                                <Navigation className="mr-2 h-5 w-5"/>
                                Navigate
                            </a>
                        </Button>
                        {assignedCase.status === 'onTheWay' && <Button size="lg" className="w-full" onClick={() => handleUpdateStatus('arrived')}>I Have Arrived at Patient</Button>}
                        {assignedCase.status === 'inTransit' && <Button size="lg" className="w-full bg-green-600 hover:bg-green-700" onClick={() => handleUpdateStatus('completed')}>Case Completed (Arrived at Hospital)</Button>}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
