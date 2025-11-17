
'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useFirebase } from '@/lib/firebase/client-provider'
import { getDoc, doc, onSnapshot, query, collection, where, updateDoc, GeoPoint, serverTimestamp, addDoc, getDocs } from 'firebase/firestore'
import type { AmbulanceCase, ClientSession } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Ambulance, Hospital, MapPin, AlertTriangle, RefreshCw, Radio, Check, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import SearchingIndicator from '@/components/ui/searching-indicator'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

interface HospitalInfo {
    id: string;
    name: string;
    address: string;
    distance: number;
    eta: number;
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

const TriageSelectionCard = ({ id, value, label, checked, onSelect }: { id: string, value: string, label: string, checked: boolean, onSelect: (value: string) => void }) => (
    <div onClick={() => onSelect(value)} className={cn("rounded-lg border bg-background p-4 flex items-center justify-between cursor-pointer transition-all", checked && "ring-2 ring-primary border-primary")}>
        <Label htmlFor={id} className="font-semibold cursor-pointer text-base">{label}</Label>
        <RadioGroupItem value={value} id={id} />
    </div>
);

export default function CureBookingPage() {
  const [session, setSession] = useState<ClientSession | null>(null);
  const [currentUserLocation, setCurrentUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locationAddress, setLocationAddress] = useState('Locating...');
  const [locationError, setLocationError] = useState(false);
  
  const [step, setStep] = useState<'triage' | 'hospitals' | 'searching'>('triage');
  const [severity, setSeverity] = useState<'Non-Critical' | 'Serious' | 'Critical' | ''>('');
  const [hospitalType, setHospitalType] = useState<'any' | 'Govt Hospital' | 'Private Hospital'>('any');
  const [nearbyHospitals, setNearbyHospitals] = useState<HospitalInfo[]>([]);
  const [isFindingHospitals, setIsFindingHospitals] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState<string | null>(null);

  const { user, db } = useFirebase();
  const router = useRouter();

  const getAddressFromCoords = useCallback(async (lat: number, lon: number) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
      const data = await response.json();
      return data.display_name || 'Unknown Location';
    } catch (error) {
      console.error("Error fetching address:", error);
      return 'Could not fetch address';
    }
  }, []);
  
  const fetchLocation = useCallback(() => {
     setLocationError(false);
     setLocationAddress('Locating...');
     if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                setCurrentUserLocation({ lat: latitude, lon: longitude });
                const address = await getAddressFromCoords(latitude, longitude);
                setLocationAddress(address);
            },
            () => {
                setLocationAddress('Location access denied. Please enable it in your browser settings.');
                setLocationError(true);
                toast.error('Location Access Denied');
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    } else {
        setLocationAddress('Geolocation is not supported by this browser.');
        setLocationError(true);
    }
  }, [getAddressFromCoords]);


  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);


  useEffect(() => {
    if (user && db) {
      const sessionData = localStorage.getItem('curocity-session');
      if (sessionData) {
        setSession(JSON.parse(sessionData));
      }
    }
  }, [user, db]);

    const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371; // km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c; 
    };

    const handleFindHospitals = async () => {
        if (!severity) { toast.error('Severity Required', { description: 'Please select the severity of the emergency.' }); return; }
        if (!db || !currentUserLocation) { toast.error('Error', { description: 'Could not get your location.' }); return; }
        
        setIsFindingHospitals(true);
        setStep('hospitals');
        
        try {
            const q = query(collection(db, 'curePartners'), where('isOnline', '==', true));
            const snapshot = await getDocs(q);
            const hospitalsData = (snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AmbulancePartner[])
                .filter(h => h.location)
                .map(h => {
                    const distance = getDistance(currentUserLocation.lat, currentUserLocation.lon, h.location.latitude, h.location.longitude);
                    const eta = Math.round(distance * 3); // 3 mins per km for ambulance
                    return {
                        id: h.id, name: h.name, address: h.address, location: h.location, businessType: h.businessType,
                        distance,
                        eta
                    }
                })
                .filter(h => hospitalType === 'any' || h.businessType === hospitalType)
                .sort((a, b) => a.distance - b.distance);

            setNearbyHospitals(hospitalsData as HospitalInfo[]);
        } catch (error) {
             toast.error('Search Failed', { description: 'Could not find nearby hospitals.' });
             setStep('triage');
        } finally {
            setIsFindingHospitals(false);
        }
    };
  
    const handleConfirmAmbulanceRequest = async () => {
        if (!selectedHospital || !db || !session || !severity || !currentUserLocation) { toast.error('Missing Information'); return; }
        
        setStep('searching');
        
        const caseId = `CASE-${Date.now()}`;
        const caseData = {
            caseId, riderId: session.userId, riderName: session.name, phone: session.phone, severity,
            location: new GeoPoint(currentUserLocation.lat, currentUserLocation.lon),
            status: 'pending' as const, createdAt: serverTimestamp(), rejectedBy: [],
            assignedPartner: { id: selectedHospital, name: nearbyHospitals.find(h => h.id === selectedHospital)?.name || '' }
        };

        try {
            await addDoc(collection(db, 'emergencyCases'), caseData);
            toast.success('Ambulance Requested!', { description: 'Dispatching the nearest Cure partner to your location.' });
        } catch (error) {
            console.error("Error creating emergency case:", error);
            toast.error('Request Failed');
            setStep('hospitals');
        }
    }


  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } };

  return (
    <motion.div className="p-4 md:p-6" initial="hidden" animate="visible" variants={containerVariants}>
      <Card className="bg-card/70 backdrop-blur-sm border-destructive/20 max-w-2xl mx-auto">
        <CardHeader className="text-center">
            <div className="mx-auto bg-destructive/10 p-4 rounded-full w-fit border border-destructive/20">
              <Ambulance className="w-10 h-10 text-destructive"/>
            </div>
            <CardTitle className="text-3xl font-bold pt-2">Emergency SOS</CardTitle>
            <CardDescription>This will dispatch the nearest available ambulance. No upfront payment is needed; the bill will be settled with the hospital later.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="p-3 flex items-center gap-3 bg-muted rounded-lg">
                <MapPin className={cn("w-5 h-5 flex-shrink-0", locationError ? "text-destructive" : "text-primary")} />
                <p className="font-semibold text-base text-muted-foreground truncate">{locationAddress}</p>
                {locationError && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fetchLocation}><RefreshCw className="w-4 h-4" /></Button>}
            </div>
            
            <AnimatePresence mode="wait">
                {step === 'triage' && (
                    <motion.div key="triage" initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} className="space-y-3">
                        <h3 className="font-bold text-lg">1. What is the severity?</h3>
                        <RadioGroup value={severity} onValueChange={(v) => setSeverity(v as any)} className="space-y-2">
                            <TriageSelectionCard id="s1" value="Non-Critical" label="Non-Critical" checked={severity === 'Non-Critical'} onSelect={() => setSeverity('Non-Critical')} />
                            <TriageSelectionCard id="s2" value="Serious" label="Serious" checked={severity === 'Serious'} onSelect={() => setSeverity('Serious')} />
                            <TriageSelectionCard id="s3" value="Critical" label="Critical" checked={severity === 'Critical'} onSelect={() => setSeverity('Critical')} />
                        </RadioGroup>
                    </motion.div>
                )}
                 {step === 'hospitals' && (
                    <motion.div key="hospitals" initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} className="space-y-4">
                        <h3 className="font-bold text-lg">2. Select a Nearby Hospital</h3>
                        {isFindingHospitals ? (
                            Array.from({length: 3}).map((_,i) => <Skeleton key={i} className="h-20 w-full"/>)
                        ) : nearbyHospitals.length > 0 ? (
                            <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
                                {nearbyHospitals.map(h => (
                                    <Card key={h.id} className={cn("p-3 cursor-pointer", selectedHospital === h.id && "ring-2 ring-primary")} onClick={() => setSelectedHospital(h.id)}>
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-md bg-muted"><Hospital className="w-5 h-5 text-primary"/></div>
                                            <div className="flex-1">
                                                <p className="font-bold text-sm flex items-center">{h.name} {selectedHospital === h.id && <Check className="w-4 h-4 text-primary ml-2"/>}</p>
                                                <p className="text-xs text-muted-foreground truncate">{h.address}</p>
                                            </div>
                                            <p className="text-sm font-semibold">{h.distance.toFixed(1)} km</p>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-center text-muted-foreground py-8">No online hospitals found matching your criteria. Try changing your preference or try again.</p>
                        )}
                    </motion.div>
                )}
                 {step === 'searching' && (
                     <motion.div key="searching" initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} className="py-8">
                         <SearchingIndicator partnerType="cure" />
                         <p className="text-center font-semibold mt-4">Dispatching nearest partner...</p>
                     </motion.div>
                 )}
            </AnimatePresence>

        </CardContent>
         <CardFooter className="p-4 border-t">
            {step === 'triage' && (
                <Button size="lg" disabled={!severity || !currentUserLocation} onClick={handleFindHospitals} className="w-full font-semibold h-12 text-lg">Find Hospitals</Button>
            )}
            {step === 'hospitals' && (
                <div className="w-full grid grid-cols-2 gap-2">
                    <Button size="lg" variant="outline" onClick={() => setStep('triage')}>Back</Button>
                    <Button size="lg" disabled={!selectedHospital} onClick={handleConfirmAmbulanceRequest} className="w-full font-semibold h-12">Confirm & Dispatch</Button>
                </div>
            )}
         </CardFooter>
      </Card>
    </motion.div>
  );
}

