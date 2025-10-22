
'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Ambulance, PlusCircle, UserPlus, MoreHorizontal, Trash2, PersonStanding } from 'lucide-react'
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogCancel, AlertDialogAction, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { useDb } from '@/firebase/client-provider'
import { collection, query, where, onSnapshot, doc, updateDoc, GeoPoint, serverTimestamp, addDoc, getDocs, orderBy, Timestamp, writeBatch, deleteDoc } from 'firebase/firestore'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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

interface HospitalData {
    id: string;
    name: string;
    location?: GeoPoint;
}


export default function FleetPage() {
    const [hospitalData, setHospitalData] = useState<HospitalData | null>(null);
    const [fleet, setFleet] = useState<AmbulanceVehicle[]>([]);
    const [drivers, setDrivers] = useState<AmbulanceDriver[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    const [selectedDriver, setSelectedDriver] = useState<AmbulanceDriver | null>(null);
    const [isDriverDetailsOpen, setIsDriverDetailsOpen] = useState(false);
    const db = useDb();

    // Add Ambulance/Driver Form State
    const [isAddAmbulanceOpen, setIsAddAmbulanceOpen] = useState(false);
    const [newAmbulanceName, setNewAmbulanceName] = useState('');
    const [newAmbulanceType, setNewAmbulanceType] = useState<'BLS' | 'ALS' | 'Cardiac' | ''>('');
    const [newAmbulanceDriverId, setNewAmbulanceDriverId] = useState('');
    const [newRcNumber, setNewRcNumber] = useState('');
    
    const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);
    
    const [generatedDriverCreds, setGeneratedDriverCreds] = useState<{ id: string, pass: string } | null>(null);
    const [isCredsDialogOpen, setIsCredsDialogOpen] = useState(false);
    
    
    useEffect(() => {
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
                setHospitalData({ id: doc.id, name: data.name, location: data.location });
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

        setIsLoading(false);

        return () => {
            unsubHospital();
            unsubFleet();
            unsubDrivers();
        };
    }, [toast, db]);
    
    
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
            
            const driverRef = doc(db, `ambulances/${hospitalData.id}/drivers`, selectedDriver.id);
            await updateDoc(driverRef, {
                assignedAmbulanceId: newAmbulanceDoc.id,
                assignedAmbulanceName: newAmbulanceName,
            });

            toast({ title: 'Ambulance Added', description: `${newAmbulanceName} has been added to your fleet.`});
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

            toast({ title: 'Driver Added', description: `${name} has been added to your team.` });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not add driver.' });
        }
    }


    const handleDeleteDriver = async (driver: AmbulanceDriver) => {
        if (!db || !hospitalData) return;

        const batch = writeBatch(db);

        const hospitalDriverRef = doc(db, `ambulances/${hospitalData.id}/drivers`, driver.id);
        batch.delete(hospitalDriverRef);
        
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
          <div className="grid gap-6 h-full">
              <Skeleton className="h-24 w-full"/>
              <Skeleton className="h-[calc(100vh-20rem)] w-full"/>
          </div>
      )
    }

    return (
        <div className="space-y-6">
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

    