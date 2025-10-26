
'use client'

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Ambulance, HospitalIcon, ArrowLeft, Wrench } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase/client-provider';
import { addDoc, collection, serverTimestamp, GeoPoint, getDocs, query, where } from 'firebase/firestore';
import SearchingIndicator from './ui/searching-indicator';
import { Card } from './ui/card';
import type { AmbulanceCase, GarageRequest, ClientSession } from '@/lib/types';


interface EmergencyButtonsProps {
  serviceType: 'cure' | 'resq';
  liveMapRef: React.RefObject<any>;
  pickupCoords: { lat: number; lon: number } | null;
  setIsRequestingSos: (isRequesting: boolean) => void;
  setActiveAmbulanceCase: (caseData: AmbulanceCase) => void;
  setActiveGarageRequest: (requestData: any) => void;
  onBack: () => void;
  session: ClientSession | null;
}

interface HospitalInfo {
    id: string;
    name: string;
    address: string;
    distance: number;
    location: GeoPoint;
    businessType: string;
}

// Add a specific type for the data fetched from Firestore
interface AmbulancePartner {
    id: string;
    name: string;
    address: string;
    location: GeoPoint;
    businessType: string;
    // Add other potential fields if they exist
    [key: string]: any; 
}


const commonIssues = [
    { id: 'flat_tyre', label: 'Flat Tyre / Puncture' },
    { id: 'battery_jumpstart', label: 'Battery Jump-Start' },
    { id: 'engine_trouble', label: 'Minor Engine Trouble' },
    { id: 'towing_required', label: 'Towing Required' },
    { id: 'other', label: 'Other Issue' },
]


export default function EmergencyButtons({ serviceType, liveMapRef, pickupCoords, setIsRequestingSos, setActiveAmbulanceCase, setActiveGarageRequest, onBack, session }: EmergencyButtonsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState('');
  
  // State for multi-step SOS dialog
  const [sosStep, setSosStep] = useState<'triage' | 'hospitals'>('triage');
  const [severity, setSeverity] = useState<'Non-Critical' | 'Serious' | 'Critical' | ''>('');
  const [hospitalType, setHospitalType] = useState<'any' | 'Govt Hospital' | 'Private Hospital'>('any');
  const [nearbyHospitals, setNearbyHospitals] = useState<HospitalInfo[]>([]);
  const [isFindingHospitals, setIsFindingHospitals] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState<string | null>(null);

  const { db } = useFirebase();
  const { toast } = useToast();

    // Reset SOS dialog on close
  useEffect(() => {
    if (!isDialogOpen) {
        setTimeout(() => {
            setSosStep('triage');
            setSeverity('');
            setHospitalType('any');
            setNearbyHospitals([]);
            setSelectedHospital(null);
            setSelectedIssue('');
        }, 300);
    }
  }, [isDialogOpen]);


  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };

  const handleFindHospitals = async () => {
    if (!severity) {
        toast({ variant: 'destructive', title: 'Severity Required', description: 'Please select the severity of the emergency.' });
        return;
    }
    if (!db) {
        toast({ variant: 'destructive', title: 'Database Error' });
        return;
    }
    
    setIsFindingHospitals(true);
    let currentCoords = pickupCoords;
    if (!currentCoords && liveMapRef.current) {
        const locationResult = await liveMapRef.current.locate();
        if (locationResult) currentCoords = locationResult.coords;
    }

    if (!currentCoords) {
        toast({ variant: 'destructive', title: 'Location Error', description: 'Could not get your location.' });
        setIsFindingHospitals(false);
        return;
    }
    
    try {
        const q = query(collection(db, 'ambulances'), where('isOnline', '==', true));
        const snapshot = await getDocs(q);
        const hospitalsData = (snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AmbulancePartner[])
            .filter(h => h.location)
            .map(h => ({
                id: h.id,
                name: h.name,
                address: h.address,
                location: h.location,
                businessType: h.businessType,
                distance: getDistance(currentCoords!.lat, currentCoords!.lon, h.location.latitude, h.location.longitude)
            }))
            .filter(h => hospitalType === 'any' || h.businessType === hospitalType)
            .sort((a, b) => a.distance - b.distance);

        setNearbyHospitals(hospitalsData as HospitalInfo[]);
        setSosStep('hospitals');
    } catch (error) {
         toast({ variant: 'destructive', title: 'Search Failed', description: 'Could not find nearby hospitals.' });
    } finally {
        setIsFindingHospitals(false);
    }
  };
  
  const handleConfirmAmbulanceRequest = async () => {
    if (!selectedHospital || !db || !session || !severity) { // Added check for severity
        toast({ variant: 'destructive', title: 'Missing Information', description: 'Please select a hospital and ensure all details are filled.' });
        return;
    }
    
    let currentCoords = pickupCoords;
    if (!currentCoords && liveMapRef.current) {
        const locationResult = await liveMapRef.current.locate();
        if (locationResult) currentCoords = locationResult.coords;
    }
     if (!currentCoords) {
        toast({ variant: 'destructive', title: "Location Error" });
        return;
    }

    const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
    const caseId = `CASE-${Date.now()}`;
    const caseData = {
        caseId,
        riderId: session.userId,
        riderName: session.name,
        phone: session.phone,
        severity,
        location: new GeoPoint(currentCoords.lat, currentCoords.lon),
        status: 'pending' as const,
        otp: generatedOtp,
        createdAt: serverTimestamp(),
        rejectedBy: [],
        hospitalPreference: selectedHospital,
    };

    try {
        const docRef = await addDoc(collection(db, 'emergencyCases'), caseData);
        setIsDialogOpen(false);
        setIsRequestingSos(true);
        setActiveAmbulanceCase({ id: docRef.id, ...caseData } as AmbulanceCase);
        toast({ title: 'Ambulance Requested!', description: 'Dispatching the nearest Cure partner to your location.' });
    } catch (error) {
        console.error("Error creating emergency case:", error);
        toast({ variant: 'destructive', title: 'Request Failed' });
    }
  }

  const handleRequestMechanic = async () => {
    if (!db || !session || !pickupCoords || !selectedIssue) {
        toast({ variant: "destructive", title: "Error", description: "Could not get your location or user details." });
        return;
    }
    const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
    const requestData = {
        driverId: session.userId, // Use user's ID as the requester
        driverName: session.name,
        driverPhone: session.phone,
        issue: selectedIssue,
        location: new GeoPoint(pickupCoords.lat, pickupCoords.lon),
        status: 'pending' as const,
        otp: generatedOtp,
        createdAt: serverTimestamp(),
    };
    const requestDocRef = await addDoc(collection(db, 'garageRequests'), requestData);
    
    localStorage.setItem('activeGarageRequestId', requestDocRef.id);
    setActiveGarageRequest({ id: requestDocRef.id, ...requestData });
    toast({ title: "Request Sent!", description: "We are finding a nearby ResQ partner for you." });
    setIsDialogOpen(false);
  }

  const renderContent = () => {
    if (serviceType === 'cure') {
        return (
            <div className="py-4 space-y-6">
                {sosStep === 'triage' ? (
                    <>
                        <div className="space-y-3">
                            <Label className="font-semibold">1. Select Severity</Label>
                            <RadioGroup value={severity} onValueChange={(v) => setSeverity(v as any)}>
                                <div className="flex items-center space-x-2"><RadioGroupItem value="Non-Critical" id="s1" /><Label htmlFor="s1">Non-Critical</Label></div>
                                <div className="flex items-center space-x-2"><RadioGroupItem value="Serious" id="s2" /><Label htmlFor="s2">Serious</Label></div>
                                <div className="flex items-center space-x-2"><RadioGroupItem value="Critical" id="s3" /><Label htmlFor="s3">Critical</Label></div>
                            </RadioGroup>
                        </div>
                        <div className="space-y-3">
                            <Label className="font-semibold">2. Hospital Preference</Label>
                            <RadioGroup value={hospitalType} onValueChange={(v) => setHospitalType(v as any)}>
                                <div className="flex items-center space-x-2"><RadioGroupItem value="any" id="h1" /><Label htmlFor="h1">Any Nearby</Label></div>
                                <div className="flex items-center space-x-2"><RadioGroupItem value="Govt Hospital" id="h2" /><Label htmlFor="h2">Government</Label></div>
                                <div className="flex items-center space-x-2"><RadioGroupItem value="Private Hospital" id="h3" /><Label htmlFor="h3">Private</Label></div>
                            </RadioGroup>
                        </div>
                    </>
                ) : (
                    <div className="space-y-4">
                        <Label className="font-semibold">3. Select a Hospital</Label>
                        {isFindingHospitals ? (
                            <div className="text-center py-4">
                               <SearchingIndicator partnerType="cure" />
                               <p className="font-semibold mt-4 text-lg">Finding nearby hospitals...</p>
                           </div>
                        ) : (
                            <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                                {nearbyHospitals.map(h => (
                                    <Card key={h.id} className={`p-3 cursor-pointer ${selectedHospital === h.id ? 'ring-2 ring-primary' : ''}`} onClick={() => setSelectedHospital(h.id)}>
                                        <div className="flex items-center gap-3">
                                            <HospitalIcon className="w-5 h-5 text-primary"/>
                                            <div className="flex-1">
                                                <p className="font-bold text-sm">{h.name}</p>
                                                <p className="text-xs text-muted-foreground">{h.address}</p>
                                            </div>
                                            <p className="text-sm font-semibold">{h.distance.toFixed(1)} km</p>
                                        </div>
                                    </Card>
                                ))}
                                {nearbyHospitals.length === 0 && <p className="text-sm text-center text-muted-foreground py-8">No online hospitals found.</p>}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }
     if (serviceType === 'resq') {
        return (
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
        );
    }
  }

  return (
    <div className="p-4">
        <Button onClick={onBack} variant="ghost" size="icon" className="absolute top-2 left-2 h-8 w-8 bg-background/50 backdrop-blur-sm"><ArrowLeft className="w-5 h-5"/></Button>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" className={`w-full h-24 flex-col gap-1 text-lg font-bold ${serviceType === 'cure' ? 'text-red-600' : 'text-amber-600'}`}>
                    {serviceType === 'cure' ? <Ambulance className="h-8 w-8" /> : <Wrench className="h-8 w-8" />}
                    <span className="capitalize">{serviceType} SOS</span>
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Request {serviceType === 'cure' ? 'Emergency Ambulance' : 'Roadside Assistance'}</DialogTitle>
                    <DialogDescription>Please provide details to help us serve you better.</DialogDescription>
                </DialogHeader>
                {renderContent()}
                <DialogFooter>
                    {serviceType === 'cure' && sosStep === 'triage' && (
                        <Button className="w-full" onClick={handleFindHospitals} disabled={!severity || isFindingHospitals}>{isFindingHospitals ? 'Finding...' : 'Find Hospitals'}</Button>
                    )}
                    {serviceType === 'cure' && sosStep === 'hospitals' && (
                        <>
                            <Button variant="outline" onClick={() => setSosStep('triage')}>Back</Button>
                            <Button className="w-full" onClick={handleConfirmAmbulanceRequest} disabled={!selectedHospital}>Confirm & Dispatch</Button>
                        </>
                    )}
                    {serviceType === 'resq' && (
                        <Button className="w-full" onClick={handleRequestMechanic} disabled={!selectedIssue}>Find Help</Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}

