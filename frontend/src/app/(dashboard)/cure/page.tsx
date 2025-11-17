
'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Ambulance, Siren, UserPlus, Car, Map, BedDouble, AlertCircle, Clock, Check, HospitalIcon } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { useFirebase } from '@/lib/firebase/client-provider'
import type { ClientSession, AmbulanceCase } from '@/lib/types'
import { collection, doc, onSnapshot, query, updateDoc, where, serverTimestamp, GeoPoint, addDoc, setDoc, arrayUnion } from 'firebase/firestore'
import { Skeleton } from '@/components/ui/skeleton'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import { Alert } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

const LiveMap = dynamic(() => import('@/components/live-map'), {
    ssr: false,
    loading: () => <Skeleton className="w-full h-full bg-muted" />,
});

interface AmbulanceVehicle {
    id: string;
    name: string;
    status: 'Available' | 'On-Duty' | 'In-Maintenance';
    driverName?: string;
    currentLocation?: GeoPoint | null;
}

export default function CureMissionControlPage() {
    const { db, user } = useFirebase();
    const [session, setSession] = useState<ClientSession | null>(null);

    const [isOnline, setIsOnline] = useState(false);
    const [totalBeds, setTotalBeds] = useState(20);
    const [occupiedBeds, setOccupiedBeds] = useState(5);
    const [fleet, setFleet] = useState<AmbulanceVehicle[]>([]);
    const [emergencyCases, setEmergencyCases] = useState<AmbulanceCase[]>([]);
    
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const sessionData = localStorage.getItem('curocity-cure-session');
        if (sessionData) {
            setSession(JSON.parse(sessionData));
        } else {
            // Redirect or handle not logged in
        }
    }, []);

    // Fetch initial data and listen for real-time updates
    useEffect(() => {
        if (!db || !session?.partnerId) {
            if(session) setIsLoading(false);
            return;
        };
        
        setIsLoading(true);
        
        // Listener for hospital data (online status, beds)
        const hospitalUnsub = onSnapshot(doc(db, 'curePartners', session.partnerId), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setIsOnline(data.isOnline || false);
                setTotalBeds(data.totalBeds || false);
                setOccupiedBeds(data.bedsOccupied || 5);
            }
        });

        // Listener for fleet data
        const fleetUnsub = onSnapshot(collection(db, `curePartners/${session.partnerId}/ambulances`), (snapshot) => {
            setFleet(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AmbulanceVehicle)));
        });

        // Listener for emergency cases assigned to this hospital
        const casesQuery = query(
            collection(db, 'emergencyCases'),
            where('assignedPartner.id', '==', session.partnerId),
            where('status', 'in', ['pending', 'accepted', 'onTheWay'])
        );
        const casesUnsub = onSnapshot(casesQuery, (snapshot) => {
            const newCases = snapshot.docs.map(d => ({id: d.id, ...d.data()} as AmbulanceCase));
            
            // Check for new cases to show a toast
            if (emergencyCases.length > 0) {
                 const prevCaseIds = new Set(emergencyCases.map(c => c.id));
                 const newIncoming = newCases.filter(c => !prevCaseIds.has(c.id) && c.status === 'pending');
                 if (newIncoming.length > 0) {
                     toast.error("New Emergency Alert!", {
                         description: `Case #${newIncoming[0].caseId} has been assigned to you.`
                     });
                 }
            }
            setEmergencyCases(newCases);
        });

        setIsLoading(false);

        return () => {
            hospitalUnsub();
            fleetUnsub();
            casesUnsub();
        };

    }, [db, session, emergencyCases]);
    
    const handleStatusChange = async (checked: boolean) => {
        if (!db || !session?.partnerId) return;
        setIsOnline(checked);
        try {
            await updateDoc(doc(db, 'curePartners', session.partnerId), { isOnline: checked });
            toast.info(`You are now ${checked ? 'ONLINE' : 'OFFLINE'}`, { description: checked ? 'You will receive new emergency requests.' : 'You will not receive new requests.' });
        } catch (error) {
            toast.error('Status update failed.');
            setIsOnline(!checked); // Revert on error
        }
    }

    const handleBedUpdate = async (type: 'total' | 'occupied', value: number) => {
        if (!db || !session?.partnerId || value < 0) return;
        
        let fieldToUpdate = {};
        if (type === 'total') {
            setTotalBeds(value);
            fieldToUpdate = { totalBeds: value };
        } else {
             if (value > totalBeds) {
                toast.error('Invalid Input', { description: 'Occupied beds cannot exceed total beds.' });
                return;
            }
            setOccupiedBeds(value);
            fieldToUpdate = { bedsOccupied: value };
        }

        try {
            await updateDoc(doc(db, 'curePartners', session.partnerId), fieldToUpdate);
            toast.success('Bed availability updated.');
        } catch (error) {
            toast.error('Update failed.');
        }
    };
    
    const handleCaseAction = async (caseId: string, action: 'accept' | 'reject') => {
        if (!db || !session?.partnerId) return;
        
        const caseRef = doc(db, 'emergencyCases', caseId);

        try {
            if (action === 'accept') {
                // In a real app, you would show a dialog to select an ambulance.
                // For now, let's just accept.
                await updateDoc(caseRef, { status: 'accepted', 'assignedPartner.name': session.name });
                toast.success(`Case ${caseId} Accepted`, { description: 'Please dispatch an ambulance immediately.' });
            } else {
                await updateDoc(caseRef, {
                    status: 'pending', // Reset to pending for re-dispatch
                    rejectedBy: arrayUnion(session.partnerId),
                    assignedPartner: null
                });
                toast.error(`Case ${caseId} Rejected`, { description: 'The case will be re-assigned.' });
            }
        } catch (error) {
            toast.error(`Action failed for Case ${caseId}`);
        }
    }
    
    const availableBeds = totalBeds - occupiedBeds;
    const pendingCases = useMemo(() => emergencyCases.filter(c => c.status === 'pending'), [emergencyCases]);
    const activeCases = useMemo(() => emergencyCases.filter(c => c.status !== 'pending' && c.status !== 'completed' && c.status !== 'cancelled'), [emergencyCases]);

    return (
        <div className="space-y-6">
             <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">CURE Mission Control</h1>
                  <p className="text-muted-foreground">{session?.name || 'Hospital Dashboard'}</p>
                </div>
                <div className="flex items-center gap-4 p-3 rounded-lg bg-card border">
                     <div className="flex items-center space-x-2">
                        <Switch id="online-status" checked={isOnline} onCheckedChange={handleStatusChange} />
                        <Label htmlFor="online-status" className="font-semibold text-lg">{isOnline ? 'ONLINE' : 'OFFLINE'}</Label>
                    </div>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                    {/* Action Feed */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Siren className={cn("w-6 h-6", pendingCases.length > 0 && "text-destructive animate-pulse-intense")}/>
                                Action Feed
                            </CardTitle>
                            <CardDescription>Incoming emergency requests requiring immediate attention.</CardDescription>
                        </CardHeader>
                         <CardContent>
                            <AnimatePresence>
                               {pendingCases.length > 0 ? (
                                pendingCases.map((c, i) => (
                                    <motion.div
                                        key={c.id}
                                        initial={{ opacity: 0, y: -20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, x: -50 }}
                                        transition={{ delay: i * 0.1 }}
                                    >
                                        <Alert variant="destructive" className="mb-4">
                                            <Siren className="h-4 w-4" />
                                            <CardTitle className="flex justify-between items-center">
                                                <span>New Case: #{c.caseId}</span>
                                                <Badge className="capitalize">{c.severity}</Badge>
                                            </CardTitle>
                                            <CardDescription className="mt-1">
                                                From {c.riderName} ({c.phone}). Tap to view location on map.
                                            </CardDescription>
                                            <div className="mt-4 flex gap-2">
                                                <Button size="sm" className="flex-1" onClick={() => handleCaseAction(c.id, 'accept')}><Check className="w-4 h-4 mr-2"/> Accept</Button>
                                                <Button size="sm" variant="outline" className="flex-1" onClick={() => handleCaseAction(c.id, 'reject')}>Reject</Button>
                                            </div>
                                        </Alert>
                                    </motion.div>
                                ))
                               ) : (
                                   <div className="text-center py-10">
                                       <Check className="w-12 h-12 text-green-500 mx-auto mb-2"/>
                                       <p className="font-semibold">All Clear</p>
                                       <p className="text-sm text-muted-foreground">No pending emergency requests.</p>
                                   </div>
                               )}
                            </AnimatePresence>
                        </CardContent>
                    </Card>

                     {/* Live Map */}
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Map className="w-6 h-6 text-primary"/>
                                Live Fleet Map
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="h-[400px] w-full p-0">
                             <LiveMap 
                                 center={fleet[0]?.currentLocation ? [fleet[0].currentLocation.latitude, fleet[0].currentLocation.longitude] : undefined}
                                 activePartners={fleet.filter(v => v.currentLocation).map(v => ({
                                     id: v.id,
                                     name: v.name,
                                     type: 'ambulance',
                                     status: v.status,
                                     location: { lat: v.currentLocation!.latitude, lon: v.currentLocation!.longitude },
                                 }))} 
                            />
                        </CardContent>
                    </Card>

                </div>

                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BedDouble className="w-6 h-6"/>
                                Bed Availability
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-around items-center text-center p-4 bg-muted rounded-lg">
                                <div>
                                    <p className="text-3xl font-bold text-green-500">{availableBeds}</p>
                                    <p className="text-xs text-muted-foreground">Available</p>
                                </div>
                                <div className="h-12 border-l"></div>
                                <div>
                                    <p className="text-3xl font-bold">{totalBeds}</p>
                                    <p className="text-xs text-muted-foreground">Total Beds</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="occupied-beds">Update Occupied Beds</Label>
                                <div className="flex gap-2">
                                <Input id="occupied-beds" type="number" value={occupiedBeds} onChange={e => setOccupiedBeds(parseInt(e.target.value))} max={totalBeds} min={0} />
                                <Button onClick={() => handleBedUpdate('occupied', occupiedBeds)}>Update</Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Fleet & Staff</CardTitle>
                        </CardHeader>
                         <CardContent className="grid grid-cols-2 gap-4">
                            <AddStaffDialog type="driver" session={session} />
                            <AddStaffDialog type="doctor" session={session} />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Active Cases ({activeCases.length})</CardTitle></CardHeader>
                        <CardContent className="space-y-2 max-h-60 overflow-y-auto pr-2">
                            {activeCases.length > 0 ? activeCases.map(c => (
                                <div key={c.id} className="p-2 bg-muted rounded-lg text-sm">
                                    <p className="font-semibold">Case #{c.caseId} ({c.riderName})</p>
                                    <p className="text-xs text-muted-foreground capitalize">Status: {c.status}</p>
                                </div>
                            )) : <p className="text-sm text-center text-muted-foreground py-4">No active cases.</p>}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}


function AddStaffDialog({ type, session }: { type: 'driver' | 'doctor', session: ClientSession | null }) {
    const { db } = useFirebase();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [formData, setFormData] = useState<any>({});

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { id, value } = e.target;
        setFormData((prev: any) => ({ ...prev, [id]: value }));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!db || !session?.partnerId) return;
        
        setIsSubmitting(true);
        try {
            const isDoctor = type === 'doctor';
            const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
            const systematicId = isDoctor 
              ? `DOC-${session.partnerId.slice(-4)}-${randomSuffix}`
              : `CZA-${randomSuffix}`;

            const collectionPath = `curePartners/${session.partnerId}/${type}s`;
            const docRef = doc(db, collectionPath, systematicId);
            
            const dataToSave = { 
                ...formData,
                partnerId: systematicId,
                createdAt: serverTimestamp(),
                hospitalId: session.partnerId,
                hospitalName: session.name,
                docStatus: 'Awaiting Final Approval' // For doctors
            };
            
            await setDoc(docRef, dataToSave);
            
            // Also add to global doctors collection for easier lookup
            if (type === 'doctor') {
                 const globalDocRef = doc(db, 'doctors', systematicId);
                 await setDoc(globalDocRef, dataToSave);
            }
            
            toast.success(`New ${type} added successfully!`, { description: 'Their profile is now active.' });
            setIsOpen(false);
            setFormData({});
        } catch (error) {
            console.error(error);
            toast.error(`Failed to add ${type}`);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const isDoctor = type === 'doctor';
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="h-20 flex flex-col items-center justify-center gap-1">
                    {isDoctor ? <UserPlus className="w-6 h-6"/> : <Car className="w-6 h-6"/>}
                    <span className="text-xs">Add New {isDoctor ? 'Doctor' : 'Driver'}</span>
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New {isDoctor ? 'Doctor' : 'Ambulance Driver'}</DialogTitle>
                    <DialogDescription>Fill in the details below to register a new staff member.</DialogDescription>
                </DialogHeader>
                <form id={`add-${type}-form`} onSubmit={handleSubmit} className="py-4 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 col-span-2"><Label htmlFor="name">Full Name</Label><Input id="name" required onChange={handleInputChange}/></div>
                        <div className="space-y-2"><Label htmlFor="phone">Phone Number</Label><Input id="phone" type="tel" required onChange={handleInputChange}/></div>
                        <div className="space-y-2"><Label htmlFor="gender">Gender</Label><Select name="gender" required onValueChange={(v) => setFormData((p: any) => ({...p, gender:v}))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
                    </div>

                    {isDoctor ? (
                        <>
                            <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" onChange={handleInputChange}/></div>
                            <div className="space-y-2"><Label htmlFor="specialization">Specialization</Label><Input id="specialization" required onChange={handleInputChange}/></div>
                            <div className="space-y-2"><Label htmlFor="qualifications">Qualifications</Label><Input id="qualifications" required onChange={handleInputChange}/></div>
                            <div className="space-y-2"><Label htmlFor="experience">Experience (Years)</Label><Input id="experience" type="number" required onChange={handleInputChange}/></div>
                        </>
                    ) : (
                         <div className="space-y-2"><Label htmlFor="drivingLicence">Driving Licence No.</Label><Input id="drivingLicence" required onChange={handleInputChange}/></div>
                    )}
                </form>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button type="submit" form={`add-${type}-form`} disabled={isSubmitting}>
                        {isSubmitting ? 'Adding...' : 'Add Member'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

    