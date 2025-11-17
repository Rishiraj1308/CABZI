
'use client'

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Ambulance, Hospital, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { useFirebase } from '@/features/auth/firebase/client-provider';
import { addDoc, collection, serverTimestamp, GeoPoint, getDocs, query, where } from 'firebase/firestore';
import SearchingIndicator from '@/components/ui/searching-indicator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AmbulanceCase, GarageRequest, ClientSession } from '@/lib/types';
import { cn } from '@/lib/utils';


interface EmergencyButtonsProps {
  serviceType: 'cure' | 'resq';
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

interface AmbulancePartner {
    id: string;
    name: string;
    address: string;
    location: GeoPoint;
    businessType: string;
    [key: string]: any; 
}


const commonIssues = [
    { id: 'flat_tyre', label: 'Flat Tyre / Puncture' },
    { id: 'battery_jumpstart', label: 'Battery Jump-Start' },
    { id: 'engine_trouble', label: 'Minor Engine Trouble' },
    { id: 'towing_required', label: 'Towing Required' },
    { id: 'other', label: 'Other Issue' },
]


export default function EmergencyButtons({ serviceType, pickupCoords, setIsRequestingSos, setActiveAmbulanceCase, setActiveGarageRequest, onBack, session }: EmergencyButtonsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState('');
  
  const [sosStep, setSosStep] = useState<'triage' | 'hospitals'>('triage');
  const [severity, setSeverity] = useState<'Non-Critical' | 'Serious' | 'Critical' | ''>('');
  const [hospitalType, setHospitalType] = useState<'any' | 'Govt Hospital' | 'Private Hospital'>('any');
  const [nearbyHospitals, setNearbyHospitals] = useState<HospitalInfo[]>([]);
  const [isFindingHospitals, setIsFindingHospitals] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState<string | null>(null);

  const { db } = useFirebase();

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
    if (!severity) { toast.error('Severity Required', { description: 'Please select the severity of the emergency.' }); return; }
    if (!db || !pickupCoords) { toast.error('Error', { description: 'Could not get your location.' }); return; }
    
    setIsFindingHospitals(true);
    
    try {
        const q = query(collection(db, 'curePartners'), where('isOnline', '==', true));
        const snapshot = await getDocs(q);
        const hospitalsData = (snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AmbulancePartner[])
            .filter(h => h.location)
            .map(h => ({
                id: h.id,
                name: h.name,
                address: h.address,
                location: h.location,
                businessType: h.businessType,
                distance: getDistance(pickupCoords!.lat, pickupCoords!.lon, h.location.latitude, h.location.longitude)
            }))
            .filter(h => hospitalType === 'any' || h.businessType === hospitalType)
            .sort((a, b) => a.distance - b.distance);

        setNearbyHospitals(hospitalsData as HospitalInfo[]);
        setSosStep('hospitals');
    } catch (error) {
         toast.error('Search Failed', { description: 'Could not find nearby hospitals.' });
    } finally {
        setIsFindingHospitals(false);
    }
  };
  
  const handleConfirmAmbulanceRequest = async () => {
    if (!selectedHospital || !db || !session || !severity || !pickupCoords) { toast.error('Missing Information'); return; }
    
    const caseId = `CASE-${Date.now()}`;
    const caseData = {
        caseId,
        riderId: session.userId,
        riderName: session.name,
        phone: session.phone,
        severity,
        location: new GeoPoint(pickupCoords.lat, pickupCoords.lon),
        status: 'pending' as const,
        otp: Math.floor(1000 + Math.random() * 9000).toString(),
        createdAt: serverTimestamp(),
        rejectedBy: [],
        hospitalPreference: selectedHospital,
    };

    try {
        const docRef = await addDoc(collection(db, 'emergencyCases'), caseData);
        setIsDialogOpen(false);
        setIsRequestingSos(true);
        setActiveAmbulanceCase({ id: docRef.id, ...caseData } as AmbulanceCase);
        toast.success('Ambulance Requested!', { description: 'Dispatching the nearest Cure partner to your location.' });
    } catch (error) {
        console.error("Error creating emergency case:", error);
        toast.error('Request Failed');
    }
  }

  const handleRequestMechanic = async () => {
    if (!db || !session || !pickupCoords || !selectedIssue) {
        toast.error("Error", { description: "Could not get your location or user details." });
        return;
    }
    const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
    const requestData = {
        userId: session.userId,
        userName: session.name,
        userPhone: session.phone,
        issue: selectedIssue,
        location: new GeoPoint(pickupCoords.lat, pickupCoords.lon),
        status: 'pending' as const,
        otp: generatedOtp,
        createdAt: serverTimestamp(),
    };
    const requestDocRef = await addDoc(collection(db, 'garageRequests'), requestData);
    
    localStorage.setItem('activeGarageRequestId', requestDocRef.id);
    setActiveGarageRequest({ id: requestDocRef.id, ...requestData });
    toast.success("Request Sent!", { description: "We are finding a nearby ResQ partner for you." });
    setIsDialogOpen(false);
  }
  
  const TriageSelectionCard = ({ id, value, label, checked, onSelect }: { id: string, value: string, label: string, checked: boolean, onSelect: (value: string) => void }) => (
    <div onClick={() => onSelect(value)} className={cn("rounded-lg border bg-background p-3 flex items-center justify-between cursor-pointer transition-all", checked && "ring-2 ring-primary border-primary")}>
        <Label htmlFor={id} className="font-semibold cursor-pointer">{label}</Label>
        <RadioGroupItem value={value} id={id} />
    </div>
  );

  const renderContent = () => {
    if (serviceType === 'cure') {
        return (
            <div className="py-4 space-y-6">
                {sosStep === 'triage' ? (
                    <>
                         <Card>
                            <CardHeader className="pb-4">
                                <CardTitle className="text-base">1. Select Severity</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <RadioGroup value={severity} onValueChange={(v) => setSeverity(v as any)} className="space-y-2">
                                    <TriageSelectionCard id="s1" value="Non-Critical" label="Non-Critical" checked={severity === 'Non-Critical'} onSelect={setSeverity} />
                                    <TriageSelectionCard id="s2" value="Serious" label="Serious" checked={severity === 'Serious'} onSelect={setSeverity} />
                                    <TriageSelectionCard id="s3" value="Critical" label="Critical" checked={severity === 'Critical'} onSelect={setSeverity} />
                                </RadioGroup>
                            </CardContent>
                         </Card>
                         <Card>
                            <CardHeader className="pb-4">
                                <CardTitle className="text-base">2. Hospital Preference</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <RadioGroup value={hospitalType} onValueChange={(v) => setHospitalType(v as any)} className="space-y-2">
                                    <TriageSelectionCard id="h1" value="any" label="Any Nearby" checked={hospitalType === 'any'} onSelect={setHospitalType} />
                                    <TriageSelectionCard id="h2" value="Govt Hospital" label="Government" checked={hospitalType === 'Govt Hospital'} onSelect={setHospitalType} />
                                    <TriageSelectionCard id="h3" value="Private Hospital" label="Private" checked={hospitalType === 'Private Hospital'} onSelect={setHospitalType} />
                                </RadioGroup>
                            </CardContent>
                        </Card>
                    </>
                ) : (
                    <div className="space-y-4">
                        <Label className="font-semibold text-base">3. Select a Hospital</Label>
                        {isFindingHospitals ? (
                            <div className="text-center py-4">
                               <SearchingIndicator partnerType="cure" />
                               <p className="font-semibold mt-4 text-lg">Finding nearby hospitals...</p>
                           </div>
                        ) : (
                            <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                                {nearbyHospitals.map(h => (
                                    <Card key={h.id} className={cn("p-3 cursor-pointer", selectedHospital === h.id && "ring-2 ring-primary")} onClick={() => setSelectedHospital(h.id)}>
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-md bg-muted"><Hospital className="w-5 h-5 text-primary"/></div>
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
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
            <Button variant="destructive" size="lg" className="w-full h-14 text-lg">
                {serviceType === 'cure' ? <Ambulance className="mr-2 h-6 w-6"/> : <Wrench className="mr-2 h-6 w-6"/>}
                Request {serviceType === 'cure' ? 'Ambulance' : 'Mechanic'}
            </Button>
        </DialogTrigger>
        <DialogContent>
            <DialogHeader>
                <DialogTitle className="text-center pt-8 flex items-center justify-center gap-2">
                    {serviceType === 'cure' ? <Ambulance className="w-6 h-6 text-destructive"/> : <Wrench className="w-6 h-6 text-amber-600"/>}
                    Request {serviceType === 'cure' ? 'Emergency Ambulance' : 'Roadside Assistance'}
                </DialogTitle>
                <DialogDescription className="text-center">Please provide details to help us serve you better.</DialogDescription>
            </DialogHeader>
            {renderContent()}
            <DialogFooter>
                {sosStep === 'triage' && serviceType === 'cure' && (
                    <Button className="w-full" onClick={handleFindHospitals} disabled={!severity || isFindingHospitals}>{isFindingHospitals ? 'Finding...' : 'Find Hospitals'}</Button>
                )}
                {sosStep === 'hospitals' && serviceType === 'cure' && (
                    <>
                        <Button variant="outline" onClick={() => setSosStep('triage')}>Back</Button>
                        <Button className="w-full" onClick={handleConfirmAmbulanceRequest} disabled={!selectedHospital}>Confirm & Dispatch</Button>
                    </>
                )}
                {serviceType === 'resq' && (
                     <Button 
                        onClick={handleRequestMechanic} 
                        className="w-full" 
                        disabled={!selectedIssue}
                    >
                        Confirm & Find Help
                    </Button>
                )}
            </DialogFooter>
        </DialogContent>
    </Dialog>
  );
}
