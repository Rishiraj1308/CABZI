
'use client'

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Ambulance, Siren, Waves, Settings, BedDouble, BarChart, Minus, Users, UserCheck, Phone, Navigation } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import dynamic from 'next/dynamic'
import { useDb } from '@/firebase/client-provider'
import { collection, query, where, onSnapshot, doc, updateDoc, GeoPoint, serverTimestamp, arrayUnion, addDoc, getDocs, orderBy, Timestamp } from 'firebase/firestore'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import SearchingIndicator from '@/components/ui/searching-indicator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Avatar } from '@/components/ui/avatar'


const LiveMap = dynamic(() => import('@/components/live-map'), {
    ssr: false,
    loading: () => <div className="w-full h-full bg-muted flex items-center justify-center"><p>Loading Map...</p></div>
});

// Consolidated state interface
interface DashboardState {
    hospitalData: HospitalData | null;
    fleet: AmbulanceVehicle[];
    drivers: AmbulanceDriver[];
    doctors: Doctor[];
    appointments: Appointment[];
    incomingRequests: EmergencyRequest[];
    ongoingCase: OngoingCase | null;
    isLoading: boolean;
    isOnline: boolean;
}

// Type definitions
interface AmbulanceVehicle {
    id: string;
    name: string;
    type: 'BLS' | 'ALS' | 'Cardiac';
    status: 'Available' | 'On-Duty' | 'Maintenance';
    location: GeoPoint;
}

interface AmbulanceDriver { id: string; name: string; status: 'Active' | 'Inactive' | 'On-Duty'; }
interface Doctor { id: string; name: string; specialization: string; status: 'Available' | 'On-Leave'; }
interface Appointment { id: string; patientName: string; department: string; doctorName: string; isRecurring?: boolean; status: 'Pending' | 'Confirmed'; }

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
}

interface OngoingCase extends EmergencyRequest {
    status: 'accepted' | 'onTheWay' | 'arrived' | 'inTransit' | 'completed';
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

const mockAppointments: Appointment[] = [
    { id: 'APP001', patientName: 'Priya Singh', department: 'Cardiology', doctorName: 'Dr. Ramesh Sharma', status: 'Pending', isRecurring: true },
    { id: 'APP002', patientName: 'Rajesh Verma', department: 'Orthopedics', doctorName: 'Dr. Priya Gupta', status: 'Confirmed' },
    { id: 'APP003', patientName: 'Anita Desai', department: 'General Physician', doctorName: 'Dr. Alok Verma', status: 'Pending' },
];


export default function HospitalMissionControl() {
    const [state, setState] = useState<DashboardState>({
        hospitalData: null,
        fleet: [],
        drivers: [],
        doctors: [],
        appointments: mockAppointments,
        incomingRequests: [],
        ongoingCase: null,
        isLoading: true,
        isOnline: false,
    });
    
    // Bed Management State remains separate as it's UI control state
    const [totalBeds, setTotalBeds] = useState(0);
    const [bedsOccupied, setBedsOccupied] = useState(0);
    
    const { toast } = useToast();
    const db = useDb();
    const watchIdRef = useRef<number | null>(null);

    // Master useEffect for all data fetching and listeners
    useEffect(() => {
        const session = localStorage.getItem('cabzi-cure-session');
        if (!session || !db) {
            setState(s => ({ ...s, isLoading: false }));
            return;
        }

        const { partnerId } = JSON.parse(session);
        if (!partnerId) {
            toast({ variant: 'destructive', title: 'Session Error', description: 'Partner ID not found in session.' });
            setState(s => ({ ...s, isLoading: false }));
            return;
        }
        
        const unsubscribers: (() => void)[] = [];

        // Hospital Data
        const hospitalRef = doc(db, "ambulances", partnerId);
        unsubscribers.push(onSnapshot(hospitalRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setState(s => ({
                    ...s,
                    hospitalData: { id: doc.id, ...data } as HospitalData,
                    isOnline: data.isOnline || false,
                }));
                setTotalBeds(data.totalBeds || 0);
                setBedsOccupied(data.bedsOccupied || 0);
            }
             if (state.isLoading) setState(s => ({...s, isLoading: false}));
        }));

        // Fleet Data
        const fleetRef = collection(db, `ambulances/${partnerId}/fleet`);
        unsubscribers.push(onSnapshot(fleetRef, (snapshot) => {
            setState(s => ({ ...s, fleet: snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AmbulanceVehicle)) }));
        }));

        // Drivers and Doctors
        const driversRef = query(collection(db, `ambulances/${partnerId}/drivers`), orderBy('name', 'asc'));
        unsubscribers.push(onSnapshot(driversRef, (snapshot) => {
             setState(s => ({ ...s, drivers: snapshot.docs.map(d => ({id: d.id, ...d.data()} as AmbulanceDriver)) }));
        }));
        
        const doctorsRef = query(collection(db, `ambulances/${partnerId}/doctors`), orderBy('name', 'asc'));
        unsubscribers.push(onSnapshot(doctorsRef, (snapshot) => {
             setState(s => ({ ...s, doctors: snapshot.docs.map(d => ({id: d.id, ...d.data()} as Doctor)) }));
        }));

        // Ongoing/Active Case for this hospital
        const allCasesQuery = query(collection(db, "emergencyCases"), where("assignedPartner.id", "==", partnerId), orderBy("createdAt", "desc"));
        unsubscribers.push(onSnapshot(allCasesQuery, (snapshot) => {
            const activeCase = snapshot.docs
                .map(d => ({ id: d.id, ...d.data() } as OngoingCase))
                .find(c => c.status !== 'completed' && c.status !== 'cancelled_by_rider' && c.status !== 'cancelled_by_partner' && c.status !== 'cancelled_by_admin');
            setState(s => ({ ...s, ongoingCase: activeCase || null }));
        }));

        // All pending requests (for the feed)
        const requestsRef = query(collection(db, "emergencyCases"), where("status", "==", "pending"));
        unsubscribers.push(onSnapshot(requestsRef, (snapshot) => {
            const requestsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as EmergencyRequest))
                .filter(req => !req.rejectedBy?.includes(partnerId));
            setState(s => ({ ...s, incomingRequests: requestsData }));
        }));

        // Cleanup function to unsubscribe from all listeners
        return () => {
            unsubscribers.forEach(unsub => unsub());
            if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [db, toast]);


    // Effect for live location tracking of the assigned ambulance
    useEffect(() => {
        if (state.ongoingCase?.assignedAmbulanceId && state.hospitalData?.id && db) {
            const ambulanceRef = doc(db, `ambulances/${state.hospitalData.id}/fleet`, state.ongoingCase.assignedAmbulanceId);
            watchIdRef.current = navigator.geolocation.watchPosition(
                (pos) => {
                    const newGeoPoint = new GeoPoint(pos.coords.latitude, pos.coords.longitude);
                    updateDoc(ambulanceRef, { location: newGeoPoint });
                    updateDoc(doc(db, 'emergencyCases', state.ongoingCase!.id), { partnerLocation: newGeoPoint });
                },
                (err) => console.error("Could not get ambulance location:", err),
                { enableHighAccuracy: true }
            );
        } else {
            if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
        }
        return () => { if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current) };
    }, [state.ongoingCase, state.hospitalData?.id, db]);


    // All handler functions remain the same as they were before, just using the new `state` object.
    const simulateNewCase = async () => {
        if (!db || !state.hospitalData) {
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
            location: state.hospitalData.location ? new GeoPoint(state.hospitalData.location.latitude + 0.01, state.hospitalData.location.longitude + 0.01) : new GeoPoint(28.6139, 77.2090),
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

    const handleOnlineStatusChange = async (checked: boolean) => {
        if (!state.hospitalData?.id || !db) return;
        setState(s => ({ ...s, isOnline: checked }));
        const hospitalRef = doc(db, "ambulances", state.hospitalData.id);
        try {
            await updateDoc(hospitalRef, { isOnline: checked });
            toast({
                title: checked ? "You are now Online" : "You are now Offline",
                description: checked ? "Your facility is now accepting emergency requests." : "You will not receive new requests.",
            });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not update your status.' });
            setState(s => ({ ...s, isOnline: !checked }));
        }
    }

    const handleBedStatusUpdate = async () => {
        if (!state.hospitalData?.id || !db) return;
        const hospitalRef = doc(db, "ambulances", state.hospitalData.id);
        try {
            await updateDoc(hospitalRef, {
                totalBeds: Number(totalBeds),
                bedsOccupied: Number(bedsOccupied)
            });
            toast({ title: "Bed Availability Updated", description: "The live bed count has been updated successfully." });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not update bed status.' });
        }
    }
    
    const handleAcceptRequest = async (request: EmergencyRequest, ambulanceId: string) => {
        if (!state.hospitalData || !db) return;
        
        const requestRef = doc(db, "emergencyCases", request.id);
        const ambulanceRef = doc(db, `ambulances/${state.hospitalData.id}/fleet`, ambulanceId);
        
        try {
            const selectedAmbulance = state.fleet.find(a => a.id === ambulanceId);
            if(!selectedAmbulance) throw new Error("Selected ambulance not found");

            await updateDoc(requestRef, {
                status: 'accepted',
                acceptedAt: serverTimestamp(),
                assignedPartner: { id: state.hospitalData.id, name: state.hospitalData.name },
                assignedAmbulanceId: selectedAmbulance.id,
                assignedAmbulanceName: selectedAmbulance.name,
                partnerLocation: selectedAmbulance.location,
                hospitalLocation: state.hospitalData.location,
            });
            
            await updateDoc(ambulanceRef, { status: 'On-Duty' });

            toast({ title: "Case Accepted & Dispatched!", description: `Ambulance ${selectedAmbulance.name} has been dispatched.`, className: "bg-green-600 text-white border-green-600" });
        } catch (error) {
             console.error(error);
             toast({ variant: 'destructive', title: 'Dispatch Failed', description: 'Could not accept the case.' });
        }
    }
    
    const handleRejectRequest = async (requestId: string) => {
         if (!state.hospitalData || !db) return;
         const requestRef = doc(db, "emergencyCases", requestId);
         try {
            await updateDoc(requestRef, { rejectedBy: arrayUnion(state.hospitalData.id) });
            setState(s => ({...s, incomingRequests: s.incomingRequests.filter(req => req.id !== requestId) }));
            toast({ variant: 'destructive', title: "Request Rejected", description: "The request will be cascaded to the next available hospital." });
         } catch(error) {
             console.error("Error rejecting request:", error);
             toast({ variant: 'destructive', title: "Action Failed", description: "Could not reject the request."});
         }
    }
    
    const handleAppointmentConfirm = (id: string) => {
        setState(s => ({...s, appointments: s.appointments.map(a => a.id === id ? {...a, status: 'Confirmed'} : a)}));
        toast({ title: 'Appointment Confirmed!'});
    }

    const getSeverityBadge = (severity?: EmergencyRequest['severity']) => {
        switch (severity) {
            case 'Critical': return <Badge variant="destructive" className="text-base"><Siren className="w-4 h-4 mr-2 animate-pulse-intense"/>{severity}</Badge>;
            case 'Serious': return <Badge className="bg-orange-500 text-white text-base"><Siren className="w-4 h-4 mr-2"/>{severity}</Badge>;
            default: return <Badge variant="secondary" className="text-base">{severity || 'Non-Critical'}</Badge>;
        }
    }

    // Memoized values
    const { hospitalData, fleet, drivers, doctors, appointments, incomingRequests, ongoingCase, isLoading, isOnline } = state;
    const onlineDrivers = useMemo(() => drivers.filter(d => d.status === 'Active').length, [drivers]);
    const onDutyDrivers = useMemo(() => fleet.filter(f => f.status === 'On-Duty').length, [fleet]);
    const availableDoctors = useMemo(() => doctors.filter(d => d.status === 'Available').length, [doctors]);
    const availableBeds = (totalBeds || 0) - (bedsOccupied || 0);
    const patientLocation = useMemo(() => ongoingCase ? { lat: ongoingCase.location.latitude, lon: ongoingCase.location.longitude } : undefined, [ongoingCase]);
    const activeAmbulanceLocation = useMemo(() => ongoingCase?.partnerLocation ? { lat: ongoingCase.partnerLocation.latitude, lon: ongoingCase.partnerLocation.longitude } : undefined, [ongoingCase]);
    const mapFleet = useMemo(() => fleet.filter(a => a.location?.latitude && a.location?.longitude).map(a => ({ id: a.id, name: a.name, type: 'ambulance' as const, status: a.status, location: { lat: a.location.latitude, lon: a.location.longitude } })), [fleet]);
    
    if (isLoading) {
        return (
          <div className="grid lg:grid-cols-3 gap-6 h-full">
              <div className="lg:col-span-2 space-y-6">
                  <Skeleton className="h-[calc(100vh-10rem)] w-full"/>
              </div>
              <div className="space-y-6">
                  <Card><CardHeader><Skeleton className="h-8 w-full"/></CardHeader><CardContent><Skeleton className="h-24 w-full"/></CardContent></Card>
                  <Card><CardHeader><Skeleton className="h-8 w-full"/></CardHeader><CardContent><Skeleton className="h-96 w-full"/></CardContent></Card>
              </div>
          </div>
        )
    }

    return (
        <div className="grid lg:grid-cols-3 gap-6 items-start h-full">
            <div className="lg:col-span-2 space-y-6">
                 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard title={<><Users className="text-primary"/> Drivers</>} value={`${onlineDrivers} Online`} description={`${onDutyDrivers} On-Duty`} staffList={drivers} listTitle="Ambulance Driver Roster" listCols={['Name', 'Status']} />
                    <StatCard title={<><UserCheck className="text-primary"/> Doctors</>} value={`${availableDoctors} Available`} description={`Total: ${doctors.length}`} staffList={doctors} listTitle="Doctor Roster" listCols={['Name', 'Specialization', 'Status']} />
                 </div>
                 <div className="h-[calc(100vh-14rem)] rounded-lg overflow-hidden border">
                   <LiveMap activePartners={mapFleet} riderLocation={patientLocation} driverLocation={activeAmbulanceLocation} />
               </div>
            </div>
            
            <div className="lg:col-span-1 space-y-6">
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-lg"><Settings className="w-5 h-5 text-primary"/> Master Controls</CardTitle></CardHeader>
                    <CardContent className="flex items-center justify-between p-4">
                        <Label htmlFor="online-status" className="font-bold text-lg">{isOnline ? "Accepting Cases" : "Offline"}</Label>
                        <Switch id="online-status" checked={isOnline} onCheckedChange={handleOnlineStatusChange} className="data-[state=checked]:bg-green-500" />
                    </CardContent>
                 </Card>
                 <Card>
                    <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-lg"><BedDouble className="w-5 h-5 text-primary"/> Bed Availability</CardTitle></CardHeader>
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
                <Card className={cn("transition-all", ongoingCase && 'opacity-30')}>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2"><Waves className="w-5 h-5 text-primary" />Action Feed</CardTitle>
                        <Button onClick={simulateNewCase} size="sm" variant="outline">Test Alert</Button>
                    </CardHeader>
                    <CardContent className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
                        <Tabs defaultValue="emergencies">
                            <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="emergencies">Emergency</TabsTrigger><TabsTrigger value="appointments">Appointments</TabsTrigger></TabsList>
                            <TabsContent value="emergencies" className="mt-4">
                                {ongoingCase ? ( <div className="text-center text-muted-foreground py-10"><p className="font-bold">A case is already in progress.</p><p className="text-sm">Please resolve it before accepting new requests.</p></div>
                                ) : incomingRequests.length > 0 ? (
                                    incomingRequests.map(req => (
                                        <Card key={req.id} className="bg-destructive/10 border-destructive shadow-lg animate-pulse-intense">
                                            <CardHeader className="p-4"><CardTitle>{getSeverityBadge(req.severity)}</CardTitle><CardDescription className="pt-2">New {req.severity || 'Non-Critical'} case from {req.riderName}.</CardDescription></CardHeader>
                                            <CardFooter className="p-4 pt-0 grid grid-cols-2 gap-2">
                                                <Button variant="destructive" className="w-full" onClick={() => handleRejectRequest(req.id)}>Reject</Button>
                                                <Dialog><DialogTrigger asChild><Button className="w-full">Accept</Button></DialogTrigger>
                                                    <DialogContent><DialogHeader><DialogTitle>Dispatch Ambulance</DialogTitle><DialogDescription>Select an available ambulance for this case.</DialogDescription></DialogHeader>
                                                        <div className="py-4 space-y-2 max-h-60 overflow-y-auto">
                                                            {fleet.filter(a => a.status === 'Available').map(a => (<Button key={a.id} variant="outline" className="w-full justify-start h-12" onClick={() => handleAcceptRequest(req, a.id)}><Ambulance className="mr-4"/><div><p className="font-semibold">{a.name}</p><p className="text-xs text-muted-foreground">{a.type}</p></div></Button>))}
                                                            {fleet.filter(a => a.status === 'Available').length === 0 && (<p className="text-center text-muted-foreground py-4">No ambulances are currently available.</p>)}
                                                        </div>
                                                    </DialogContent>
                                                </Dialog>
                                            </CardFooter>
                                        </Card>
                                    ))
                                ) : ( <div className="text-center text-muted-foreground h-48 flex items-center justify-center flex-col"><SearchingIndicator partnerType="cure" /><p className="mt-4 font-semibold">Listening for emergency requests...</p></div>
                                )}
                            </TabsContent>
                             <TabsContent value="appointments" className="mt-4">
                                {appointments.length > 0 ? (
                                    appointments.map(appt => (
                                        <Card key={appt.id} className="mb-2">
                                            <CardContent className="p-3 flex items-center gap-3">
                                                <div className="flex-1"><p className="font-semibold">{appt.patientName} <span className="font-normal text-muted-foreground text-xs">for {appt.doctorName}</span></p><p className="text-xs text-muted-foreground">{appt.department}</p></div>
                                                {appt.status === 'Pending' ? ( <Button size="sm" variant="outline" onClick={() => handleAppointmentConfirm(appt.id)}>Confirm</Button>
                                                ) : ( <Badge className="bg-green-100 text-green-800">{appt.status}</Badge> )}
                                            </CardContent>
                                        </Card>
                                    ))
                                ) : ( <div className="text-center text-muted-foreground h-48 flex items-center justify-center flex-col"><p>No new appointment requests.</p></div> )}
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}


const StatCard = ({ title, value, description, staffList, listTitle, listCols }: any) => (
  <Dialog>
    <DialogTrigger asChild>
      <Card className="cursor-pointer hover:bg-muted">
        <CardHeader className="p-4 pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2">{title}</CardTitle></CardHeader>
        <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </DialogTrigger>
    <DialogContent>
        <DialogHeader><DialogTitle>{listTitle}</DialogTitle></DialogHeader>
        <Table>
            <TableHeader><TableRow>{listCols.map((col: any) => <TableHead key={col}>{col}</TableHead>)}</TableRow></TableHeader>
            <TableBody>
                {staffList.map((item: any) => (
                    <TableRow key={item.id}>
                        <TableCell>{item.name}</TableCell>
                        {item.specialization && <TableCell>{item.specialization}</TableCell>}
                        <TableCell><Badge variant={item.status === 'Active' || item.status === 'Available' ? 'default' : 'secondary'} className={item.status === 'Active' || item.status === 'Available' ? 'bg-green-100 text-green-800' : ''}>{item.status}</Badge></TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    </DialogContent>
  </Dialog>
);
