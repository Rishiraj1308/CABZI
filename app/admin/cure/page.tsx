
'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Ambulance, Check, X, PlusCircle, Car, User, Siren, Map, Waves, Settings, ServerCrash, BedDouble, BarChart, Clock, Users, KeyRound, Navigation, UserPlus, Phone, Share2, MoreHorizontal, Trash2, ListChecks, FileText, Minus, Plus, Hospital, Calendar, PersonStanding } from 'lucide-react'
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogCancel, AlertDialogAction, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import dynamic from 'next/dynamic'
import { useDb } from '@/firebase/client-provider'
import { collection, query, where, onSnapshot, doc, updateDoc, GeoPoint, serverTimestamp, arrayUnion, addDoc, getDocs, getDoc, orderBy, Timestamp, writeBatch, deleteDoc } from 'firebase/firestore'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import SearchingIndicator from '@/components/ui/searching-indicator'


const LiveMap = dynamic(() => import('@/components/live-map'), {
    ssr: false,
    loading: () => <div className="w-full h-full bg-muted flex items-center justify-center"><p>Loading Map...</p></div>
});

interface AmbulanceVehicle {
    id: string;
    name: string;
    type: 'BLS' | 'ALS' | 'Cardiac';
    status: 'Available' | 'On-Duty' | 'Maintenance';
    location: GeoPoint;
    driverName: string;
    driverPhone: string;
    rcNumber: string;
}

interface AmbulanceDriver {
    id: string;
    name: string;
    phone: string;
    age: number;
    gender: 'male' | 'female' | 'other';
    drivingLicence: string;
    status: 'Active' | 'Inactive';
    partnerId?: string;
    password?: string;
    createdAt: Timestamp;
    assignedAmbulanceId?: string;
    assignedAmbulanceName?: string;
}

interface ChecklistItem {
    id: string;
    text: string;
    createdAt: Timestamp;
}

interface EmergencyRequest {
    id: string;
    caseId: string;
    riderName: string;
    phone: string;
    severity?: 'Non-Critical' | 'Serious' | 'Critical';
    location: GeoPoint;
    rejectedBy?: string[];
    createdAt: any;
    otp?: string;
    status: 'pending' | 'accepted' | 'onTheWay' | 'arrived' | 'inTransit' | 'completed' | 'cancelled_by_rider' | 'cancelled_by_partner' | 'cancelled_by_admin';
}

interface OngoingCase extends EmergencyRequest {
    assignedAmbulanceId?: string;
    assignedAmbulanceName?: string;
    partnerLocation?: GeoPoint;
    hospitalLocation?: GeoPoint;
}

interface HospitalData {
    id: string;
    name: string;
    phone: string;
    isErFull: boolean;
    totalBeds?: number;
    bedsOccupied?: number;
    location?: GeoPoint;
}

export default function HospitalMissionControl() {
    const [isMounted, setIsMounted] = useState(false);
    const [hospitalData, setHospitalData] = useState<HospitalData | null>(null);
    const [fleet, setFleet] = useState<AmbulanceVehicle[]>([]);
    const [drivers, setDrivers] = useState<AmbulanceDriver[]>([]);
    const [incomingRequests, setIncomingRequests] = useState<EmergencyRequest[]>([]);
    const [ongoingCase, setOngoingCase] = useState<OngoingCase | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isOnline, setIsOnline] = useState(false);
    const { toast } = useToast();
    const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
    const [newChecklistItem, setNewChecklistItem] = useState('');
    const [selectedDriver, setSelectedDriver] = useState<AmbulanceDriver | null>(null);
    const [isDriverDetailsOpen, setIsDriverDetailsOpen] = useState(false);
    const db = useDb();

    // Bed Management State
    const [totalBeds, setTotalBeds] = useState(0);
    const [bedsOccupied, setBedsOccupied] = useState(0);

    // Add Ambulance/Driver Form State
    const [isAddAmbulanceOpen, setIsAddAmbulanceOpen] = useState(false);
    const [newAmbulanceName, setNewAmbulanceName] = useState('');
    const [newAmbulanceType, setNewAmbulanceType] = useState<'BLS' | 'ALS' | 'Cardiac' | ''>('');
    const [newAmbulanceDriverId, setNewAmbulanceDriverId] = useState('');
    const [newRcNumber, setNewRcNumber] = useState('');
    
    const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);
    
    const [generatedDriverCreds, setGeneratedDriverCreds] = useState<{ id: string, pass: string } | null>(null);
    const [isCredsDialogOpen, setIsCredsDialogOpen] = useState(false);
    
    // Analytics State
    const [analytics, setAnalytics] = useState({
        totalCases: 0,
        avgResponseTime: 0,
        fleetUtilization: 0
    });
    
    const watchIdRef = useRef<number | null>(null);

    // Function to simulate receiving a push notification for a new case
    const simulateNewCase = async () => {
        if (!db || !hospitalData) {
             toast({ variant: 'destructive', title: 'Error', description: 'Cannot create test alert. Hospital data not loaded.' });
             return;
        }

        const caseId = `CASE-TEST-${Date.now()}`;
        const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();

        const testCaseData = {
            caseId: caseId,
            riderId: 'TEST_USER',
            riderName: "Test Patient",
            phone: "+919999988888",
            severity: 'Critical',
            location: hospitalData.location ? new GeoPoint(hospitalData.location.latitude + 0.01, hospitalData.location.longitude + 0.01) : new GeoPoint(28.6139, 77.2090),
            status: 'pending',
            otp: generatedOtp,
            createdAt: serverTimestamp(),
            rejectedBy: [],
        };

        try {
            await addDoc(collection(db, 'emergencyCases'), testCaseData);
            toast({ title: 'New Test Emergency!', description: 'A real test case has been added to the database and your feed.' });
        } catch (error) {
            console.error('Error creating test case:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not create the test case in the database.' });
        }
    };
    
    useEffect(() => {
        setIsMounted(true);
        const session = localStorage.getItem('cabzi-cure-session');
        if (!session || !db) {
            setIsLoading(false);
            return;
        }

        const { partnerId } = JSON.parse(session);
        if (!partnerId) {
             toast({ variant: 'destructive', title: 'Session Error', description: 'Partner ID not found in session.' });
             setIsLoading(false);
             return;
        }

        const hospitalRef = doc(db, "ambulances", partnerId);
        const unsubHospital = onSnapshot(hospitalRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setHospitalData({ 
                    id: doc.id, 
                    name: data.name, 
                    phone: data.phone, 
                    isErFull: data.isErFull || false,
                    totalBeds: data.totalBeds || 0,
                    bedsOccupied: data.bedsOccupied || 0,
                    location: data.location,
                });
                setTotalBeds(data.totalBeds || 0);
                setBedsOccupied(data.bedsOccupied || 0);
                setIsOnline(data.isOnline || false);
            }
        });

        const fleetRef = collection(db, `ambulances/${partnerId}/fleet`);
        const unsubFleet = onSnapshot(fleetRef, (snapshot) => {
            const fleetData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AmbulanceVehicle));
            setFleet(fleetData);
        });
        
        const driversRef = query(collection(db, `ambulances/${partnerId}/drivers`), orderBy('createdAt', 'desc'));
        const unsubDrivers = onSnapshot(driversRef, (snapshot) => {
            const driversData = snapshot.docs.map(d => ({id: d.id, ...d.data()} as AmbulanceDriver));
            setDrivers(driversData);
        });

        const checklistRef = collection(db, `ambulances/${partnerId}/checklistTemplate`);
        const qChecklist = query(checklistRef, orderBy('createdAt', 'asc'));
        const unsubChecklist = onSnapshot(qChecklist, (snapshot) => {
            setChecklistItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ChecklistItem)));
        });

        const allCasesQuery = query(collection(db, "emergencyCases"), where("assignedPartner.id", "==", partnerId), orderBy("createdAt", "desc"));
        const unsubAllCases = onSnapshot(allCasesQuery, (snapshot) => {
            const activeCase = snapshot.docs
                .map(d => ({ id: d.id, ...d.data() } as OngoingCase))
                .find(c => c.status !== 'completed' && c.status !== 'cancelled_by_rider' && c.status !== 'cancelled_by_partner' && c.status !== 'cancelled_by_admin');
            setOngoingCase(activeCase || null);
        });

        const requestsRef = query(collection(db, "emergencyCases"), where("status", "==", "pending"));
        const unsubRequests = onSnapshot(requestsRef, (snapshot) => {
            let requestsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as EmergencyRequest))
                .filter(req => !req.rejectedBy?.includes(partnerId));
            
            setIncomingRequests(requestsData);
        });
        
        const fetchAnalytics = async () => {
            const casesQuery = query(collection(db, 'emergencyCases'), where('assignedPartner.id', '==', partnerId), where('status', '==', 'completed'));
            const snapshot = await getDocs(casesQuery);
            const cases = snapshot.docs.map(d => d.data());
            
            const totalCases = cases.length;
            const totalResponseTime = cases.reduce((acc, c) => {
                const acceptedTime = (c.acceptedAt || c.createdAt)?.toDate();
                const createdTime = c.createdAt.toDate();
                if (acceptedTime && createdTime) {
                    return acc + (acceptedTime.getTime() - createdTime.getTime());
                }
                return acc;
            }, 0);

            const avgResponseTime = totalCases > 0 ? (totalResponseTime / totalCases) / 1000 / 60 : 0;
            
            const fleetSnapshot = await getDocs(collection(db, `ambulances/${partnerId}/fleet`));
            const totalAmbulances = fleetSnapshot.size;
            const onDutyAmbulances = fleetSnapshot.docs.filter(d => d.data().status === 'On-Duty').length;
            const fleetUtilization = totalAmbulances > 0 ? (onDutyAmbulances / totalAmbulances) * 100 : 0;

            setAnalytics({ totalCases, avgResponseTime, fleetUtilization });
        };

        fetchAnalytics();
        setIsLoading(false);

        return () => {
            unsubHospital();
            unsubFleet();
            unsubAllCases();
            unsubDrivers();
            unsubChecklist();
            unsubRequests();
            if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
        };
    }, [toast, db]);
    
     useEffect(() => {
        if (ongoingCase?.assignedAmbulanceId && hospitalData?.id && db) {
            const ambulanceRef = doc(db, `ambulances/${hospitalData.id}/fleet`, ongoingCase.assignedAmbulanceId);
            watchIdRef.current = navigator.geolocation.watchPosition(
                (pos) => {
                    const newGeoPoint = new GeoPoint(pos.coords.latitude, pos.coords.longitude);
                    updateDoc(ambulanceRef, { location: newGeoPoint });
                    // Also update the main case document for rider to track
                    updateDoc(doc(db, 'emergencyCases', ongoingCase.id), { partnerLocation: newGeoPoint });
                },
                (err) => console.error("Could not get ambulance location:", err),
                { enableHighAccuracy: true }
            );
        } else {
            if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
        }
        return () => { if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current) };
    }, [ongoingCase, hospitalData?.id, db]);

    const handleOnlineStatusChange = async (checked: boolean) => {
        if (!hospitalData?.id || !db) return;
        setIsOnline(checked);
        const hospitalRef = doc(db, "ambulances", hospitalData.id);
        try {
            await updateDoc(hospitalRef, { isOnline: checked });
            toast({
                title: checked ? "You are now Online" : "You are now Offline",
                description: checked ? "Your facility is now accepting emergency requests." : "You will not receive new requests.",
            });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not update your status.' });
            setIsOnline(!checked);
        }
    }

    const handleBedStatusUpdate = async () => {
        if (!hospitalData?.id || !db) return;
        const hospitalRef = doc(db, "ambulances", hospitalData.id);
        try {
            await updateDoc(hospitalRef, {
                totalBeds: Number(totalBeds),
                bedsOccupied: Number(bedsOccupied)
            });
            toast({
                title: "Bed Availability Updated",
                description: "The live bed count has been updated successfully.",
            });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not update bed status.' });
        }
    }
    
    const handleAddAmbulance = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!hospitalData || !newAmbulanceName || !newAmbulanceType || !newAmbulanceDriverId || !newRcNumber || !db) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please provide all ambulance details.'});
            return;
        }
        
        const selectedDriver = drivers.find(d => d.id === newAmbulanceDriverId);
        if (!selectedDriver) {
             toast({ variant: 'destructive', title: 'Error', description: 'Selected driver not found.'});
             return;
        }

        const fleetRef = collection(db, `ambulances/${hospitalData.id}/fleet`);
        try {
            const newAmbulanceDoc = await addDoc(fleetRef, {
                name: newAmbulanceName,
                type: newAmbulanceType,
                driverId: selectedDriver.id,
                driverName: selectedDriver.name,
                driverPhone: selectedDriver.phone,
                rcNumber: newRcNumber,
                status: 'Available',
                location: hospitalData.location || new GeoPoint(28.6139, 77.2090)
            });
            
            // Link ambulance to the driver
            const driverRef = doc(db, `ambulances/${hospitalData.id}/drivers`, selectedDriver.id);
            await updateDoc(driverRef, {
                assignedAmbulanceId: newAmbulanceDoc.id,
                assignedAmbulanceName: newAmbulanceName,
            });

            toast({ title: 'Ambulance Added', description: `${newAmbulanceName} has been added to your fleet.`});
            // Reset form and close dialog
            setIsAddAmbulanceOpen(false);
            setNewAmbulanceName('');
            setNewAmbulanceType('');
            setNewAmbulanceDriverId('');
            setNewRcNumber('');
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not add ambulance to fleet.'});
        }
    }
    
    const handleAddDriver = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!hospitalData || !db) return;

        const formData = new FormData(e.currentTarget);
        const name = formData.get('driverName') as string;
        const phone = formData.get('driverPhone') as string;
        const age = formData.get('driverAge') as string;
        const gender = formData.get('gender') as 'male' | 'female' | 'other';
        const drivingLicence = formData.get('drivingLicence') as string;

        if (!name || !phone || !age || !gender || !drivingLicence) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please provide all driver details.' });
            return;
        }

        const driversRef = collection(db, `ambulances/${hospitalData.id}/drivers`);
        const ambulanceDriversRef = collection(db, 'ambulanceDrivers');

        try {
            const q = query(ambulanceDriversRef, where("phone", "==", phone));
            const phoneCheck = await getDocs(q);
            if (!phoneCheck.empty) {
                toast({ variant: 'destructive', title: 'Driver Exists', description: 'A driver with this phone number is already registered.' });
                return;
            }

            const partnerId = `CZA-${phone.slice(-4)}${Math.floor(10 + Math.random() * 90)}`;
            const password = `cAbZ@${Math.floor(1000 + Math.random() * 9000)}`;

            const batch = writeBatch(db);

            const hospitalDriverDocRef = doc(driversRef);
            batch.set(hospitalDriverDocRef, {
                name, phone, drivingLicence, age: Number(age), gender,
                status: 'Active', partnerId, createdAt: serverTimestamp(),
            });

            const globalDriverDocRef = doc(ambulanceDriversRef);
            batch.set(globalDriverDocRef, {
                id: globalDriverDocRef.id, name, phone, partnerId, password, drivingLicence,
                status: 'Active', hospitalId: hospitalData.id, hospitalName: hospitalData.name,
                driverIdInHospital: hospitalDriverDocRef.id, createdAt: serverTimestamp(),
            });

            await batch.commit();

            setGeneratedDriverCreds({ id: partnerId, pass: password });
            setIsAddDriverOpen(false);
            setIsCredsDialogOpen(true);
            (e.target as HTMLFormElement).reset();

            toast({ title: 'Driver Added', description: `${name} has been added to your team. Their credentials are now available.` });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not add driver.' });
        }
    }

    const handleAcceptRequest = async (request: EmergencyRequest, ambulanceId: string) => {
        if (!hospitalData || !db) return;
        
        const requestRef = doc(db, "emergencyCases", request.id);
        const ambulanceRef = doc(db, `ambulances/${hospitalData.id}/fleet`, ambulanceId);
        
        try {
            const selectedAmbulance = fleet.find(a => a.id === ambulanceId);
            if(!selectedAmbulance) throw new Error("Selected ambulance not found");

            await updateDoc(requestRef, {
                status: 'accepted',
                acceptedAt: serverTimestamp(),
                assignedPartner: {
                    id: hospitalData.id,
                    name: hospitalData.name,
                },
                assignedAmbulanceId: selectedAmbulance.id,
                assignedAmbulanceName: selectedAmbulance.name,
                partnerLocation: selectedAmbulance.location,
                hospitalLocation: hospitalData.location,
            });
            
            await updateDoc(ambulanceRef, { status: 'On-Duty' });

            toast({ title: "Case Accepted & Dispatched!", description: `Ambulance ${selectedAmbulance.name} has been dispatched.`, className: "bg-green-600 text-white border-green-600" });
        } catch (error) {
             console.error(error);
             toast({ variant: 'destructive', title: 'Dispatch Failed', description: 'Could not accept the case.' });
        }
    }
    
    const handleRejectRequest = async (requestId: string) => {
         if (!hospitalData || !db) return;
         const requestRef = doc(db, "emergencyCases", requestId);
         try {
            await updateDoc(requestRef, { rejectedBy: arrayUnion(hospitalData.id) });
            setIncomingRequests(prev => prev.filter(req => req.id !== requestId));
            toast({ variant: 'destructive', title: "Request Rejected", description: "The request will be cascaded to the next available hospital." });
         } catch(error) {
             console.error("Error rejecting request:", error);
             toast({ variant: 'destructive', title: "Action Failed", description: "Could not reject the request."});
         }
    }

    const handleDeleteDriver = async (driver: AmbulanceDriver) => {
        if (!db || !hospitalData) return;

        const batch = writeBatch(db);

        // 1. Delete the driver from the hospital's private subcollection
        const hospitalDriverRef = doc(db, `ambulances/${hospitalData.id}/drivers`, driver.id);
        batch.delete(hospitalDriverRef);
        
        // 2. Find and delete the driver from the global collection to revoke login
        const globalDriverQuery = query(collection(db, 'ambulanceDrivers'), where('phone', '==', driver.phone));
        const globalDriverSnap = await getDocs(globalDriverQuery);

        if (!globalDriverSnap.empty) {
            const globalDriverDoc = globalDriverSnap.docs[0];
            batch.delete(globalDriverDoc.ref);
        }

        try {
            await batch.commit();
            toast({
                variant: 'destructive',
                title: 'Driver Removed',
                description: `${driver.name} has been removed from your roster and their access has been revoked.`
            });
            setIsDriverDetailsOpen(false);
            setSelectedDriver(null);
        } catch (error) {
            console.error('Error removing driver:', error);
            toast({
                variant: 'destructive',
                title: 'Deletion Failed',
                description: 'Could not remove the driver from the system.'
            });
        }
    };
    
    const handleDeleteAmbulance = async (ambulance: AmbulanceVehicle) => {
        if (!db || !hospitalData) return;

        if (ambulance.status === 'On-Duty') {
            toast({
                variant: 'destructive',
                title: 'Action Denied',
                description: 'Cannot delete an ambulance that is on-duty for an active case.',
            });
            return;
        }

        const ambulanceRef = doc(db, `ambulances/${hospitalData.id}/fleet`, ambulance.id);
        try {
            await deleteDoc(ambulanceRef);
            toast({
                variant: 'destructive',
                title: 'Ambulance Removed',
                description: `${ambulance.name} has been removed from your fleet.`
            });
        } catch (error) {
            console.error('Error removing ambulance:', error);
            toast({
                variant: 'destructive',
                title: 'Deletion Failed',
                description: 'Could not remove the ambulance from your fleet.'
            });
        }
    }
    
    const handleAddChecklistItem = async () => {
        if (!newChecklistItem.trim() || !hospitalData?.id || !db) return;
        const checklistRef = collection(db, `ambulances/${hospitalData.id}/checklistTemplate`);
        try {
            await addDoc(checklistRef, {
                text: newChecklistItem,
                createdAt: serverTimestamp(),
            });
            toast({ title: 'Checklist Item Added' });
            setNewChecklistItem('');
        } catch (error) {
             toast({ variant: 'destructive', title: 'Error', description: 'Could not add item.' });
        }
    };

    const handleDeleteChecklistItem = async (itemId: string) => {
        if (!hospitalData?.id || !db) return;
        const itemRef = doc(db, `ambulances/${hospitalData.id}/checklistTemplate`, itemId);
        try {
            await deleteDoc(itemRef);
            toast({ variant: 'destructive', title: 'Item Deleted' });
        } catch (error) {
             toast({ variant: 'destructive', title: 'Error', description: 'Could not delete item.' });
        }
    };


    const getSeverityBadge = (severity?: EmergencyRequest['severity']) => {
        switch (severity) {
            case 'Critical': return <Badge variant="destructive" className="text-base"><Siren className="w-4 h-4 mr-2 animate-pulse-intense"/>{severity}</Badge>;
            case 'Serious': return <Badge className="bg-orange-500 text-white text-base"><Siren className="w-4 h-4 mr-2"/>{severity}</Badge>;
            default: return <Badge variant="secondary" className="text-base">{severity || 'Non-Critical'}</Badge>;
        }
    }
    
    const patientLocation = useMemo(() => {
        if (ongoingCase) return { lat: ongoingCase.location.latitude, lon: ongoingCase.location.longitude };
        return undefined;
    }, [ongoingCase]);

    const activeAmbulanceLocation = useMemo(() => {
        if (ongoingCase && ongoingCase.assignedAmbulanceId && ongoingCase.partnerLocation) {
            return { lat: ongoingCase.partnerLocation.latitude, lon: ongoingCase.partnerLocation.longitude };
        }
        return undefined;
    }, [ongoingCase]);

    const mapFleet = useMemo(() => {
        return fleet
            .filter(a => a.location && typeof a.location.latitude === 'number' && typeof a.location.longitude === 'number')
            .map(a => ({
                id: a.id,
                name: a.name,
                type: 'ambulance' as const,
                status: a.status as 'Available' | 'On-Duty' | 'Maintenance',
                location: { lat: a.location.latitude, lon: a.location.longitude }
            }));
    }, [fleet]);

    const getInitials = (name: string) => {
        if (!name) return 'D';
        const names = name.split(' ');
        if (names.length > 1) {
          return names[0][0] + names[names.length - 1][0];
        }
        return name.substring(0, 2);
    }

    if (isLoading) {
      return (
          <div className="grid lg:grid-cols-3 gap-6 h-full">
              <div className="lg:col-span-2 space-y-6">
                  <Skeleton className="h-24 w-full"/>
                  <Skeleton className="h-[calc(100vh-20rem)] w-full"/>
              </div>
              <div className="space-y-6">
                  <Card><CardHeader><Skeleton className="h-8 w-full"/></CardHeader><CardContent><Skeleton className="h-96 w-full"/></CardContent></Card>
              </div>
          </div>
      )
    }

    const availableBeds = (totalBeds || 0) - (bedsOccupied || 0);

    return (
        <div className="grid lg:grid-cols-3 gap-6 items-start h-full">
            {/* Left Column */}
            <div className="lg:col-span-1 space-y-6">
                 <Card className={cn("transition-all", ongoingCase && 'opacity-30')}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Waves className="w-5 h-5 text-primary" /> Action Feed</CardTitle>
                        <CardDescription>Live incoming requests will appear here.</CardDescription>
                         <div className="pt-2 flex gap-2">
                            <Button onClick={simulateNewCase} size="sm" variant="outline">Create Test Alert</Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4 max-h-96 overflow-y-auto pr-2">
                         {ongoingCase ? (
                             <div className="text-center text-muted-foreground py-10">
                                <p className="font-bold">A case is already in progress.</p>
                                <p className="text-sm">Please resolve the ongoing case before accepting new requests.</p>
                            </div>
                         ) : incomingRequests.length > 0 ? (
                            incomingRequests.map(req => (
                                <Card key={req.id} className="bg-destructive/10 border-destructive shadow-lg animate-pulse-intense">
                                    <CardHeader className="p-4">
                                        {getSeverityBadge(req.severity)}
                                        <CardDescription className="pt-2">New {req.severity || 'Non-Critical'} case from patient {req.riderName}.</CardDescription>
                                    </CardHeader>
                                    <CardFooter className="p-4 pt-0 grid grid-cols-3 gap-2">
                                         <Button variant="outline" asChild><a href={`tel:${req.phone}`}><Phone className="w-4 h-4"/> Call Patient</a></Button>
                                        <Dialog>
                                            <DialogTrigger asChild><Button className="w-full col-span-1">Accept</Button></DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader><DialogTitle>Dispatch Ambulance</DialogTitle><DialogDescription>Select an available ambulance for this case.</DialogDescription></DialogHeader>
                                                <div className="py-4 space-y-2 max-h-60 overflow-y-auto">
                                                    {fleet.filter(a => a.status === 'Available').map(a => (<Button key={a.id} variant="outline" className="w-full justify-start h-12" onClick={() => handleAcceptRequest(req, a.id)}><Ambulance className="mr-4"/><div><p className="font-semibold">{a.name}</p><p className="text-xs text-muted-foreground">{a.type}</p></div></Button>))}
                                                    {fleet.filter(a => a.status === 'Available').length === 0 && (<p className="text-center text-muted-foreground py-4">No ambulances are currently available.</p>)}
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                        <Button variant="destructive" className="w-full col-span-1" onClick={() => handleRejectRequest(req.id)}>Reject</Button>
                                    </CardFooter>
                                </Card>
                            ))
                         ) : (
                            <div className="text-center text-muted-foreground h-48 flex items-center justify-center flex-col">
                                <SearchingIndicator partnerType="cure" />
                                <p className="mt-4 font-semibold">Listening for emergency requests...</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
                {ongoingCase && (
                    <Card className="bg-primary/5 border-primary animate-fade-in">
                        <CardHeader><CardTitle className="flex items-center gap-2"><Siren className="w-6 h-6 text-primary animate-pulse"/> Ongoing Case</CardTitle><CardDescription>Patient: {ongoingCase.riderName}</CardDescription></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-4 p-4 rounded-lg bg-background">
                                <Avatar className="w-16 h-16"><AvatarImage src={'https://placehold.co/100x100.png'} alt="Patient" data-ai-hint="patient portrait" /><AvatarFallback>P</AvatarFallback></Avatar>
                                <div className="space-y-1"><h3 className="font-bold">{ongoingCase.riderName}</h3><p className="text-sm text-muted-foreground flex items-center gap-2"><Phone className="w-3 h-3"/> {ongoingCase.phone}</p><p className="text-sm font-semibold text-primary flex items-center gap-2"><Ambulance className="w-3 h-3"/> {ongoingCase.assignedAmbulanceName}</p></div>
                            </div>
                            <Button className="w-full bg-blue-600 hover:bg-blue-700" size="lg" onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${ongoingCase.location.latitude},${ongoingCase.location.longitude}`, '_blank')}><Navigation className="mr-2 h-5 w-5"/> Navigate</Button>
                        </CardContent>
                    </Card>
                )}
            </div>
            
            {/* Middle Column */}
            <div className="lg:col-span-1 space-y-6">
                 <div className="h-64 rounded-lg overflow-hidden border">
                    <LiveMap 
                        activePartners={mapFleet} 
                        riderLocation={patientLocation}
                        driverLocation={activeAmbulanceLocation}
                    />
                </div>
                 <Tabs defaultValue="fleet" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="fleet">Fleet & Drivers</TabsTrigger>
                        <TabsTrigger value="checklist">Pre-Duty Checklist</TabsTrigger>
                    </TabsList>
                    <TabsContent value="fleet" className="mt-4">
                         <Card>
                            <CardHeader className="flex flex-row items-center justify-between p-4">
                                <CardTitle className="text-lg">Manage Fleet</CardTitle>
                                 <Dialog open={isAddAmbulanceOpen} onOpenChange={setIsAddAmbulanceOpen}>
                                    <DialogTrigger asChild><Button size="sm"><PlusCircle className="mr-2 h-4 w-4"/> Add Ambulance</Button></DialogTrigger>
                                     <DialogContent>
                                        <DialogHeader><DialogTitle>Add Ambulance</DialogTitle></DialogHeader>
                                        <form onSubmit={handleAddAmbulance} className="space-y-4 pt-4">
                                            <div className="space-y-2"><Label htmlFor="ambulanceName">Vehicle Name / Number</Label><Input id="ambulanceName" value={newAmbulanceName} onChange={(e) => setNewAmbulanceName(e.target.value)} placeholder="e.g., ICU Ambulance 01" required/></div>
                                            <div className="space-y-2"><Label htmlFor="rcNumber">Vehicle RC Number</Label><Input id="rcNumber" value={newRcNumber} onChange={(e) => setNewRcNumber(e.target.value)} placeholder="e.g., DL1A C1234" required/></div>
                                            <div className="space-y-2"><Label htmlFor="driver">Assign Driver</Label><Select onValueChange={(v) => setNewAmbulanceDriverId(v)} required value={newAmbulanceDriverId}><SelectTrigger id="driver"><SelectValue placeholder="Select a Driver"/></SelectTrigger><SelectContent>{drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.name} ({d.phone})</SelectItem>)}</SelectContent></Select></div>
                                            <div className="space-y-2"><Label htmlFor="type">Ambulance Type</Label><Select onValueChange={(v) => setNewAmbulanceType(v as any)} required value={newAmbulanceType}><SelectTrigger id="type"><SelectValue placeholder="Select Ambulance Type"/></SelectTrigger><SelectContent><SelectItem value="BLS">BLS (Basic Life Support)</SelectItem><SelectItem value="ALS">ALS (Advanced Life Support)</SelectItem><SelectItem value="Cardiac">Cardiac / ICU</SelectItem></SelectContent></Select></div>
                                            <DialogFooter><Button type="submit">Add to Fleet</Button></DialogFooter>
                                        </form>
                                    </DialogContent>
                                </Dialog>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                               <Table>
                                    <TableHeader><TableRow><TableHead>Ambulance</TableHead><TableHead>Driver</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {fleet.map(a => (
                                            <TableRow key={a.id}>
                                                <TableCell className="font-semibold">{a.name} <span className="text-xs text-muted-foreground font-normal">({a.type})</span></TableCell>
                                                <TableCell>{a.driverName}</TableCell>
                                                <TableCell><Badge className={cn(a.status === 'Available' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800')}>{a.status}</Badge></TableCell>
                                                <TableCell className="text-right">
                                                    <AlertDialog>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Open menu</span><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                                <AlertDialogTrigger asChild><DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={(e) => e.preventDefault()}><Trash2 className="mr-2 h-4 w-4"/> Delete Ambulance</DropdownMenuItem></AlertDialogTrigger>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription>This will permanently remove <span className="font-bold">{a.name}</span> from your fleet. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteAmbulance(a)} className="bg-destructive hover:bg-destructive/90">Yes, delete ambulance</AlertDialogAction></AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {fleet.length === 0 && <TableRow><TableCell colSpan={4} className="text-center h-24">No ambulances added.</TableCell></TableRow>}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                         <Card className="mt-4">
                            <CardHeader className="flex flex-row items-center justify-between p-4">
                                <CardTitle className="text-lg">Manage Drivers</CardTitle>
                                <Dialog open={isAddDriverOpen} onOpenChange={setIsAddDriverOpen}>
                                    <DialogTrigger asChild><Button size="sm"><UserPlus className="mr-2 h-4 w-4"/> Add Driver</Button></DialogTrigger>
                                    <DialogContent>
                                         <DialogHeader><DialogTitle>Add New Driver</DialogTitle></DialogHeader>
                                        <form onSubmit={handleAddDriver} className="space-y-4 pt-4">
                                            <div className="space-y-2"><Label htmlFor="driverName">Full Name</Label><Input id="driverName" name="driverName" required /></div>
                                            <div className="space-y-2">
                                                <Label htmlFor="driverPhone">Phone Number</Label>
                                                <div className="flex items-center gap-0 rounded-md border border-input focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                                                  <span className="pl-3 text-muted-foreground text-sm">+91</span>
                                                  <Input id="driverPhone" name="driverPhone" type="tel" maxLength={10} placeholder="12345 67890" required className="border-0 h-9 focus-visible:ring-0 focus-visible:ring-offset-0 flex-1" />
                                                </div>
                                            </div>
                                            <div className="space-y-2"><Label htmlFor="driverAge">Age</Label><Input id="driverAge" name="driverAge" type="number" required /></div>
                                            <div className="space-y-2"><Label>Gender</Label><RadioGroup name="gender" className="flex gap-4"><div className="flex items-center space-x-2"><RadioGroupItem value="male" id="male" /><Label htmlFor="male">Male</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="female" id="female" /><Label htmlFor="female">Female</Label></div></RadioGroup></div>
                                            <div className="space-y-2"><Label htmlFor="drivingLicence">Driving Licence No.</Label><Input id="drivingLicence" name="drivingLicence" required /></div>
                                            <DialogFooter><Button type="submit">Add Driver & Generate Credentials</Button></DialogFooter>
                                        </form>
                                    </DialogContent>
                                </Dialog>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                <Dialog open={isDriverDetailsOpen} onOpenChange={setIsDriverDetailsOpen}>
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Driver</TableHead><TableHead>Phone</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {drivers.map(d => (<TableRow key={d.id}><TableCell className="font-semibold">{d.name}</TableCell><TableCell>{d.phone}</TableCell><TableCell><Badge className="bg-green-100 text-green-800">{d.status}</Badge></TableCell><TableCell className="text-right"><DialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {setSelectedDriver(d); setIsDriverDetailsOpen(true);}}><MoreHorizontal className="h-4 w-4" /></Button></DialogTrigger></TableCell></TableRow>))}
                                            {drivers.length === 0 && <TableRow><TableCell colSpan={4} className="text-center h-24">No drivers added.</TableCell></TableRow>}
                                        </TableBody>
                                    </Table>
                                    <DialogContent className="sm:max-w-md">
                                        <DialogHeader><DialogTitle>Driver ID Card</DialogTitle></DialogHeader>
                                        {selectedDriver && (<div className="space-y-4 py-4">
                                            <Card className="bg-gradient-to-br from-primary/90 to-primary text-primary-foreground p-4 rounded-lg shadow-lg">
                                                <div className="flex items-start gap-4">
                                                    <Avatar className="w-20 h-20 border-2 border-white"><AvatarImage src={'https://placehold.co/100x100.png'} alt={selectedDriver.name} data-ai-hint="driver portrait"/><AvatarFallback>{getInitials(selectedDriver.name)}</AvatarFallback></Avatar>
                                                    <div className="flex-1">
                                                        <h3 className="text-xl font-bold">{selectedDriver.name}</h3>
                                                        <p className="text-sm opacity-80 font-mono">{selectedDriver.partnerId}</p>
                                                         <div className="flex items-center gap-4 text-xs mt-2">
                                                            <span className="flex items-center gap-1"><PersonStanding className="w-3 h-3"/> {selectedDriver.gender}, {selectedDriver.age} yrs</span>
                                                         </div>
                                                    </div>
                                                </div>
                                                <div className="mt-4 pt-4 border-t border-primary-foreground/30 space-y-2 text-sm">
                                                    <div className="flex justify-between"><span>Hospital:</span><span className="font-semibold">{hospitalData?.name}</span></div>
                                                    <div className="flex justify-between"><span>Assigned Vehicle:</span><span className="font-semibold">{selectedDriver.assignedAmbulanceName || "Not Assigned"}</span></div>
                                                    <div className="flex justify-between"><span>Date Joined:</span><span className="font-semibold">{selectedDriver.createdAt.toDate().toLocaleDateString()}</span></div>
                                                </div>
                                            </Card>
                                            <DialogFooter className="mt-4">
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild><Button variant="destructive">Delete Driver</Button></AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently remove <span className="font-bold">{selectedDriver.name}</span> and revoke their login access.</AlertDialogDescription></AlertDialogHeader>
                                                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteDriver(selectedDriver)} className="bg-destructive hover:bg-destructive/90">Yes, delete</AlertDialogAction></AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </DialogFooter>
                                        </div>)}
                                    </DialogContent>
                                </Dialog>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="checklist" className="mt-4">
                         <Card>
                            <CardHeader className="p-4"><CardTitle className="flex items-center gap-2 text-lg"><ListChecks /> Pre-Duty Checklist</CardTitle></CardHeader>
                            <CardContent className="p-4 pt-0 space-y-4">
                                <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                    {checklistItems.map(item => (<div key={item.id} className="flex items-center gap-2 p-2 bg-muted rounded-md"><span className="flex-1 text-sm">{item.text}</span><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteChecklistItem(item.id)}><Trash2 className="w-4 h-4 text-destructive"/></Button></div>))}
                                    {checklistItems.length === 0 && <p className="text-sm text-center text-muted-foreground py-4">No checklist items defined yet.</p>}
                                </div>
                                <div className="flex gap-2">
                                    <Input value={newChecklistItem} onChange={e => setNewChecklistItem(e.target.value)} placeholder="e.g., Oxygen Cylinder Full?" />
                                    <Button onClick={handleAddChecklistItem} disabled={!newChecklistItem.trim()}><PlusCircle className="w-4 h-4 mr-2" /> Add</Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
            
            {/* Right Column */}
            <div className="lg:col-span-1 space-y-6">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-lg"><Settings className="w-5 h-5 text-primary"/> Master Controls</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between p-4">
                        <Label htmlFor="online-status" className="font-bold text-lg">{isOnline ? "Accepting Cases" : "Offline"}</Label>
                        <Switch id="online-status" checked={isOnline} onCheckedChange={handleOnlineStatusChange} className="data-[state=checked]:bg-green-500" />
                    </CardContent>
                 </Card>
                 <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-lg"><BedDouble className="w-5 h-5 text-primary"/> Bed Availability</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between p-4">
                        <div className="text-center"><Label className="text-xs">Total</Label><Input type="number" value={totalBeds || 0} onChange={(e) => setTotalBeds(Number(e.target.value))} className="w-20 h-9 text-center font-bold"/></div>
                         <Minus className="text-muted-foreground"/>
                         <div className="text-center"><Label className="text-xs">Occupied</Label><Input type="number" value={bedsOccupied || 0} onChange={(e) => setBedsOccupied(Number(e.target.value))} className="w-20 h-9 text-center font-bold"/></div>
                        <div className="text-center p-2 rounded-md bg-green-100 dark:bg-green-900/30">
                            <Label className="text-xs text-green-700 dark:text-green-300">Available</Label>
                            <p className="text-xl font-bold text-green-600 dark:text-green-200">{availableBeds < 0 ? 0 : availableBeds}</p>
                        </div>
                        <Button size="sm" onClick={handleBedStatusUpdate}>Update</Button>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-lg"><BarChart className="w-5 h-5 text-primary"/> Analytics Snapshot</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 p-4">
                        <div className="p-3 rounded-lg bg-muted flex justify-between items-center"><p className="font-medium">Total Cases Handled</p><p className="font-bold text-lg">{analytics.totalCases}</p></div>
                        <div className="p-3 rounded-lg bg-muted flex justify-between items-center"><p className="font-medium">Avg. Response Time</p><p className="font-bold text-lg">{analytics.avgResponseTime.toFixed(1)} min</p></div>
                        <div className="p-3 rounded-lg bg-muted flex justify-between items-center"><p className="font-medium">Fleet Utilization</p><p className="font-bold text-lg">{analytics.fleetUtilization.toFixed(0)}%</p></div>
                    </CardContent>
                </Card>
            </div>
            
            {/* Dialogs for Add/Edit */}
            <AlertDialog open={isCredsDialogOpen} onOpenChange={(isOpen) => {
                if(!isOpen) setGeneratedDriverCreds(null);
                setIsCredsDialogOpen(isOpen);
            }}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Driver Added!</AlertDialogTitle><AlertDialogDescription>Share these credentials with the new driver.</AlertDialogDescription></AlertDialogHeader>
                    <div className="space-y-4 my-4">
                        <div className="space-y-1"><Label htmlFor="partnerId">Partner ID</Label><Input id="partnerId" value={generatedDriverCreds?.id ?? ''} readOnly /></div>
                        <div className="space-y-1"><Label htmlFor="tempPass">Temporary Password</Label><Input id="tempPass" value={generatedDriverCreds?.pass ?? ''} readOnly /></div>
                    </div>
                    <AlertDialogFooter><AlertDialogAction onClick={() => { setGeneratedDriverCreds(null); setIsCredsDialogOpen(false); }}>Close</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

    