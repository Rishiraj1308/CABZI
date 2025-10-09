
'use client'

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Ambulance, Building, HospitalIcon, LocateFixed, Wrench } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp, GeoPoint, getDocs, query, where } from 'firebase/firestore';
import { useRider } from '@/app/rider/layout'; 
import Lottie from 'lottie-react';
import lottieFindingDriver from '@/components/ui/lottie-finding-driver.json';
import { Skeleton } from './ui/skeleton';
import { Card } from './ui/card';
import SearchingIndicator from './ui/searching-indicator';

interface EmergencyButtonsProps {
  liveMapRef: React.RefObject<any>;
  pickupCoords: { lat: number, lon: number } | null;
  setIsRequestingSos: (isRequesting: boolean) => void;
  setActiveAmbulanceCase: (caseData: any) => void;
}

interface HospitalInfo {
    id: string;
    name: string;
    address: string;
    distance: number;
    location: GeoPoint;
    businessType: string;
}

export default function EmergencyButtons({ liveMapRef, pickupCoords, setIsRequestingSos, setActiveAmbulanceCase }: EmergencyButtonsProps) {
  const [isSosDialogOpen, setIsSosDialogOpen] = useState(false);
  
  // New state for multi-step SOS dialog
  const [sosStep, setSosStep] = useState<'triage' | 'hospitals'>('triage');
  const [severity, setSeverity] = useState<'Non-Critical' | 'Serious' | 'Critical' | ''>('');
  const [hospitalType, setHospitalType] = useState<'any' | 'Govt Hospital' | 'Private Hospital'>('any');
  const [nearbyHospitals, setNearbyHospitals] = useState<HospitalInfo[]>([]);
  const [isFindingHospitals, setIsFindingHospitals] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState<string | null>(null);

  const { session } = useRider(); 
  const { toast } = useToast();

    // Reset SOS dialog on close
  useEffect(() => {
    if (!isSosDialogOpen) {
        setTimeout(() => {
            setSosStep('triage');
            setSeverity('');
            setHospitalType('any');
            setNearbyHospitals([]);
            setSelectedHospital(null);
        }, 300);
    }
  }, [isSosDialogOpen]);


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
        const hospitalsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
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
    if (!selectedHospital || !db || !session) return;
    
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
        riderId: session.phone,
        riderName: session.name,
        phone: session.phone,
        severity,
        location: new GeoPoint(currentCoords.lat, currentCoords.lon),
        status: 'pending',
        otp: generatedOtp,
        createdAt: serverTimestamp(),
        rejectedBy: [],
        hospitalPreference: selectedHospital,
    };

    try {
        const docRef = await addDoc(collection(db, 'emergencyCases'), caseData);
        setIsSosDialogOpen(false);
        setIsRequestingSos(true);
        setActiveAmbulanceCase({ id: docRef.id, ...caseData });
        toast({ title: 'Ambulance Requested!', description: 'Dispatching the nearest Cure partner to your location.' });
    } catch (error) {
        console.error("Error creating emergency case:", error);
        toast({ variant: 'destructive', title: 'Request Failed' });
    }
  }


  return (
    <div className="flex gap-2">
      <Dialog open={isSosDialogOpen} onOpenChange={setIsSosDialogOpen}>
        <DialogTrigger asChild>
            <Button variant="outline" size="icon" className="rounded-full shadow-2xl bg-red-100 dark:bg-red-900/50 border-red-500/50 hover:bg-red-200">
                <Ambulance className="h-5 w-5 text-red-600" />
            </Button>
        </DialogTrigger>
        <DialogContent>
             <DialogHeader>
                <DialogTitle>Request Emergency Ambulance</DialogTitle>
                <DialogDescription>Please provide details about the emergency to help us serve you better.</DialogDescription>
            </DialogHeader>
            {sosStep === 'triage' ? (
                <div className="py-4 space-y-6">
                    <div className="space-y-3">
                        <Label className="font-semibold">1. Select Severity</Label>
                        <RadioGroup value={severity} onValueChange={(v) => setSeverity(v as any)}>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="Non-Critical" id="s1" /><Label htmlFor="s1">Non-Critical (e.g., minor injury, illness)</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="Serious" id="s2" /><Label htmlFor="s2">Serious (e.g., requires urgent medical attention)</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="Critical" id="s3" /><Label htmlFor="s3">Critical (e.g., life-threatening situation)</Label></div>
                        </RadioGroup>
                    </div>
                     <div className="space-y-3">
                        <Label className="font-semibold">2. Hospital Preference</Label>
                         <RadioGroup value={hospitalType} onValueChange={(v) => setHospitalType(v as any)}>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="any" id="h1" /><Label htmlFor="h1">Any Nearby Hospital</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="Govt Hospital" id="h2" /><Label htmlFor="h2">Government Hospital</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="Private Hospital" id="h3" /><Label htmlFor="h3">Private Hospital</Label></div>
                        </RadioGroup>
                    </div>
                </div>
            ) : (
                 <div className="py-4 space-y-4">
                     <Label className="font-semibold">3. Select a Hospital</Label>
                     {isFindingHospitals ? (
                        <div className="text-center py-4">
                           <SearchingIndicator partnerType="cure" />
                           <p className="font-semibold mt-4 text-lg">Finding nearby hospitals...</p>
                       </div>
                     ) : (
                        <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                            {nearbyHospitals.map(h => (
                                <Card key={h.id} className={`p-3 cursor-pointer ${selectedHospital === h.id ? 'border-primary' : ''}`} onClick={() => setSelectedHospital(h.id)}>
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
                            {nearbyHospitals.length === 0 && <p className="text-sm text-center text-muted-foreground py-8">No online hospitals found matching your criteria.</p>}
                        </div>
                     )}
                 </div>
            )}
            <DialogFooter>
                {sosStep === 'triage' ? (
                     <Button className="w-full" onClick={handleFindHospitals} disabled={!severity || isFindingHospitals}>
                        {isFindingHospitals ? 'Finding Hospitals...' : 'Find Nearest Hospitals'}
                    </Button>
                ) : (
                    <>
                    <Button variant="outline" onClick={() => setSosStep('triage')}>Back</Button>
                    <Button className="w-full" onClick={handleConfirmAmbulanceRequest} disabled={!selectedHospital}>Confirm & Dispatch Ambulance</Button>
                    </>
                )}
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

