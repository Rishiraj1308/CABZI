
'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Ambulance, Siren, UserPlus, Car, Map, BedDouble, Check, XCircle, PlusCircle, Minus, FileText, MoreHorizontal, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { useFirebase } from '@/lib/firebase/client-provider'
import type { ClientSession, AmbulanceCase } from '@/lib/types'
import { collection, doc, onSnapshot, query, updateDoc, where, serverTimestamp, GeoPoint, addDoc, arrayUnion, writeBatch, deleteDoc, orderBy } from 'firebase/firestore'
import { Skeleton } from '@/components/ui/skeleton'
import { motion, AnimatePresence } from 'framer-motion'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import dynamic from 'next/dynamic'
import { AddDriverDialog } from './components/add-driver-dialog'

const LiveMap = dynamic(() => import('@/components/live-map'), {
    ssr: false,
    loading: () => <div className="w-full h-full bg-muted flex items-center justify-center"><p>Loading Map...</p></div>,
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
    status: 'Active' | 'Inactive';
    assignedAmbulanceName?: string;
}

export default function HospitalMissionControl({ 
    partnerData, 
    isLoading: isPartnerLoading, 
}: { 
    partnerData: any, 
    isLoading: boolean,
}) {
    const { db } = useFirebase();
    const [session, setSession] = useState<ClientSession | null>(null);

    const [isOnline, setIsOnline] = useState(false);
    const [totalBeds, setTotalBeds] = useState(0);
    const [bedsOccupied, setBedsOccupied] = useState(0);
    
    const [fleet, setFleet] = useState<AmbulanceVehicle[]>([]);
    const [drivers, setDrivers] = useState<AmbulanceDriver[]>([]);
    const [incomingRequests, setIncomingRequests] = useState<AmbulanceCase[]>([]);
    const [isDataLoading, setIsDataLoading] = useState(true);

    const [isAddAmbulanceOpen, setIsAddAmbulanceOpen] = useState(false);
    const [newAmbulanceName, setNewAmbulanceName] = useState('');
    const [newAmbulanceType, setNewAmbulanceType] = useState<'BLS' | 'ALS' | 'Cardiac' | ''>('');
    const [newAmbulanceDriverId, setNewAmbulanceDriverId] = useState('');
    const [newRcNumber, setNewRcNumber] = useState('');

     useEffect(() => {
        const sessionData = localStorage.getItem('curocity-cure-session');
        if (sessionData) {
            setSession(JSON.parse(sessionData));
        }
    }, []);

    useEffect(() => {
        if (!isPartnerLoading && partnerData) {
            setTotalBeds(partnerData.totalBeds || 0);
            setBedsOccupied(partnerData.bedsOccupied || 0);
            setIsOnline(partnerData.isOnline || false);
        }
    }, [isPartnerLoading, partnerData]);
    
    useEffect(() => {
        if (isPartnerLoading || !partnerData?.id || !db) {
            setIsDataLoading(isPartnerLoading);
            return;
        }
        
        let isSubscribed = true;

        const unsubFleet = onSnapshot(collection(db, `curePartners/${partnerData.id}/ambulances`), (snapshot) => {
             if (isSubscribed) setFleet(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AmbulanceVehicle)));
        });
        
        const unsubDrivers = onSnapshot(query(collection(db, `curePartners/${partnerData.id}/doctors`), orderBy('createdAt', 'desc')), (snapshot) => {
            if (isSubscribed) setDrivers(snapshot.docs.map(d => ({id: d.id, ...d.data()} as AmbulanceDriver)));
        });

        const unsubRequests = onSnapshot(query(collection(db, "emergencyCases"), where("status", "==", "pending")), (snapshot) => {
            if (isSubscribed) {
                const requestsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AmbulanceCase))
                    .filter(req => !req.rejectedBy?.includes(partnerData.id!));
                setIncomingRequests(requestsData);
            }
        });
        
        if(isSubscribed) setIsDataLoading(false);

        return () => {
            isSubscribed = false;
            unsubFleet();
            unsubDrivers();
            unsubRequests();
        };
    }, [partnerData, db, isPartnerLoading]);


    const handleOnlineStatusChange = async (checked: boolean) => {
        if (!partnerData?.id || !db) return;
        setIsOnline(checked);
        try {
            await updateDoc(doc(db, "curePartners", partnerData.id), { isOnline: checked });
            toast.info(`You are now ${checked ? 'ONLINE' : 'OFFLINE'}`);
        } catch (error) {
            toast.error('Status update failed.');
            setIsOnline(!checked);
        }
    }

    const handleBedUpdate = async () => {
        if (!partnerData?.id || !db) return;
        try {
            await updateDoc(doc(db, "curePartners", partnerData.id), {
                totalBeds: Number(totalBeds),
                bedsOccupied: Number(bedsOccupied)
            });
            toast.success('Bed availability updated.');
        } catch (error) {
            toast.error('Bed status update failed.');
        }
    }
    
    const handleAddAmbulance = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!partnerData || !newAmbulanceName || !newAmbulanceType || !newAmbulanceDriverId || !newRcNumber || !db) {
            toast.error('Please provide all ambulance details.');
            return;
        }
        
        const selectedDriver = drivers.find(d => d.id === newAmbulanceDriverId);
        if (!selectedDriver) {
             toast.error('Selected driver not found.');
             return;
        }

        const fleetRef = collection(db, `curePartners/${partnerData.id}/ambulances`);
        try {
            const newAmbulanceDoc = await addDoc(fleetRef, {
                name: newAmbulanceName,
                type: newAmbulanceType,
                driverId: selectedDriver.id,
                driverName: selectedDriver.name,
                driverPhone: selectedDriver.phone,
                rcNumber: newRcNumber,
                status: 'Available',
                location: partnerData.location || new GeoPoint(28.6139, 77.2090)
            });
            
            const driverRef = doc(db, `curePartners/${partnerData.id}/doctors`, selectedDriver.id);
            await updateDoc(driverRef, {
                assignedAmbulanceId: newAmbulanceDoc.id,
                assignedAmbulanceName: newAmbulanceName,
            });

            toast.success('Ambulance Added', { description: `${newAmbulanceName} has been added to your fleet.`});
            setIsAddAmbulanceOpen(false);
            setNewAmbulanceName(''); setNewAmbulanceType(''); setNewAmbulanceDriverId(''); setNewRcNumber('');
        } catch (error) {
            console.error(error);
            toast.error('Could not add ambulance to fleet.');
        }
    }

    const handleCaseAction = async (caseId: string, action: 'accept' | 'reject') => {
        if (!partnerData || !db) return;
        const requestRef = doc(db, "emergencyCases", caseId);
         try {
            if(action === 'accept') {
                 // In a real app, a dialog would open to select an ambulance. For now, we auto-assign.
                 const availableAmbulance = fleet.find(a => a.status === 'Available');
                 if(!availableAmbulance) {
                     toast.error('No Available Ambulances', {description: "Cannot accept case."});
                     return;
                 }
                
                await updateDoc(requestRef, { 
                    status: 'accepted',
                    'assignedPartner.id': partnerData.id,
                    'assignedPartner.name': partnerData.name,
                    'assignedAmbulanceId': availableAmbulance.id,
                    'assignedAmbulanceName': availableAmbulance.name,
                 });
                 await updateDoc(doc(db, `curePartners/${partnerData.id}/ambulances`, availableAmbulance.id), { status: 'On-Duty' });
                 toast.success("Case Accepted & Dispatched!");
            } else {
                 await updateDoc(requestRef, { rejectedBy: arrayUnion(partnerData.id) });
                 toast.info("Request Rejected");
            }
        } catch(error) {
             toast.error("Action Failed");
        }
    }
    
    if (isPartnerLoading || isDataLoading) {
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

    return (
        <div className="grid lg:grid-cols-3 gap-6 items-start h-full">
            <div className="lg:col-span-2 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Siren className={cn("w-6 h-6", incomingRequests.length > 0 && "text-destructive animate-pulse-intense")}/>
                            Action Feed
                        </CardTitle>
                        <CardDescription>Incoming emergency requests requiring immediate attention.</CardDescription>
                    </CardHeader>
                     <CardContent>
                        <AnimatePresence>
                           {incomingRequests.length > 0 ? (
                            incomingRequests.map((c, i) => (
                                <motion.div key={c.id} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -50 }} transition={{ delay: i * 0.1 }}>
                                    <Alert variant="destructive" className="mb-4">
                                        <Siren className="h-4 w-4" />
                                        <AlertTitle className="flex justify-between items-center"><span>New Case: #{c.caseId.slice(-6)}</span><Badge className="capitalize">{c.severity}</Badge></AlertTitle>
                                        <AlertDescription className="mt-1">From {c.riderName} ({c.phone}). Tap to view location on map.</AlertDescription>
                                        <div className="mt-4 flex gap-2"><Button size="sm" className="flex-1" onClick={() => handleCaseAction(c.id, 'accept')}><Check className="w-4 h-4 mr-2"/> Accept</Button><Button size="sm" variant="outline" className="flex-1" onClick={() => handleCaseAction(c.id, 'reject')}><XCircle className="w-4 h-4 mr-2"/> Reject</Button></div>
                                    </Alert>
                                </motion.div>
                            ))
                           ) : (
                               <div className="text-center py-10"><Check className="w-12 h-12 text-green-500 mx-auto mb-2"/><p className="font-semibold">All Clear</p><p className="text-sm text-muted-foreground">No pending emergency requests.</p></div>
                           )}
                        </AnimatePresence>
                    </CardContent>
                </Card>

                 <div className="h-96 rounded-lg overflow-hidden border">
                    <LiveMap activePartners={[]} />
                </div>
            </div>
            
            <div className="lg:col-span-1 space-y-6">
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-lg"><Settings className="w-5 h-5 text-primary"/> Master Controls</CardTitle></CardHeader>
                    <CardContent className="flex items-center justify-between p-4"><Label htmlFor="online-status" className="font-bold text-lg">{isOnline ? "Accepting Cases" : "Offline"}</Label><Switch id="online-status" checked={isOnline} onCheckedChange={handleOnlineStatusChange} className="data-[state=checked]:bg-green-500" /></CardContent>
                 </Card>
                 <Card>
                    <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-lg"><BedDouble className="w-5 h-5 text-primary"/> Bed Availability</CardTitle></CardHeader>
                    <CardContent className="flex items-center justify-between p-4">
                        <div className="text-center"><Label className="text-xs">Total</Label><Input type="number" value={totalBeds || 0} onChange={(e) => setTotalBeds(Number(e.target.value))} className="w-20 h-9 text-center font-bold"/></div>
                         <Minus className="text-muted-foreground"/>
                         <div className="text-center"><Label className="text-xs">Occupied</Label><Input type="number" value={bedsOccupied || 0} onChange={(e) => setBedsOccupied(Number(e.target.value))} className="w-20 h-9 text-center font-bold"/></div>
                        <div className="text-center p-2 rounded-md bg-green-100 dark:bg-green-900/30"><Label className="text-xs text-green-700 dark:text-green-300">Available</Label><p className="text-xl font-bold text-green-600 dark:text-green-200">{(totalBeds-bedsOccupied) < 0 ? 0 : (totalBeds-bedsOccupied)}</p></div>
                        <Button size="sm" onClick={handleBedUpdate}>Update</Button>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Fleet & Staff Management</CardTitle></CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                            <Dialog open={isAddAmbulanceOpen} onOpenChange={setIsAddAmbulanceOpen}>
                                <DialogTrigger asChild><Button variant="outline" className="h-20 flex-col gap-1"><Ambulance className="w-6 h-6"/><span className="text-xs">Add Ambulance</span></Button></DialogTrigger>
                                <DialogContent>
                                    <DialogHeader><DialogTitle>Add Ambulance</DialogTitle></DialogHeader>
                                    <form onSubmit={handleAddAmbulance} className="space-y-4 pt-4">
                                        <div className="space-y-2"><Label htmlFor="ambulanceName">Vehicle Name / Number</Label><Input id="ambulanceName" value={newAmbulanceName} onChange={(e) => setNewAmbulanceName(e.target.value)} required/></div>
                                        <div className="space-y-2"><Label htmlFor="rcNumber">Vehicle RC Number</Label><Input id="rcNumber" value={newRcNumber} onChange={(e) => setNewRcNumber(e.target.value)} required/></div>
                                        <div className="space-y-2"><Label htmlFor="driver">Assign Driver</Label><Select onValueChange={(v) => setNewAmbulanceDriverId(v)} required value={newAmbulanceDriverId}><SelectTrigger id="driver"><SelectValue placeholder="Select a Driver"/></SelectTrigger><SelectContent>{drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.name} ({d.phone})</SelectItem>)}</SelectContent></Select></div>
                                        <div className="space-y-2"><Label htmlFor="type">Ambulance Type</Label><Select onValueChange={(v) => setNewAmbulanceType(v as any)} required value={newAmbulanceType}><SelectTrigger id="type"><SelectValue placeholder="Select Type"/></SelectTrigger><SelectContent><SelectItem value="BLS">BLS</SelectItem><SelectItem value="ALS">ALS</SelectItem><SelectItem value="Cardiac">Cardiac</SelectItem></SelectContent></Select></div>
                                        <DialogFooter><Button type="submit">Add to Fleet</Button></DialogFooter>
                                    </form>
                                </DialogContent>
                            </Dialog>
                            <AddDriverDialog partnerData={partnerData} />
                        </div>
                        <div className="mt-4">
                             <Table>
                                <TableHeader><TableRow><TableHead>Vehicle</TableHead><TableHead>Driver</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {fleet.map(a => (<TableRow key={a.id}><TableCell className="font-semibold">{a.name}</TableCell><TableCell>{a.driverName}</TableCell><TableCell><Badge className={cn(a.status === 'Available' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800')}>{a.status}</Badge></TableCell></TableRow>))}
                                    {fleet.length === 0 && <TableRow><TableCell colSpan={3} className="text-center h-24">No vehicles in fleet.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
```
