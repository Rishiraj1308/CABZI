
'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Stethoscope, UserPlus, MoreHorizontal, Trash2, BadgeCheck, Clock, Briefcase } from 'lucide-react'
import { useDb } from '@/firebase/client-provider'
import { collection, query, onSnapshot, addDoc, doc, deleteDoc, serverTimestamp, Timestamp, orderBy, writeBatch, getDocs, where } from 'firebase/firestore'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  qualifications?: string;
  experience?: string;
  phone: string;
  createdAt: Timestamp;
  photoUrl?: string; // To store uploaded photo URL
  degreeUrl?: string; // To store uploaded degree URL
  docStatus?: 'Verified' | 'Pending';
  partnerId?: string; // For Doctor's own login
  password?: string; // For Doctor's own login
}

const doctorSpecializations = [
  'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'Oncology', 
  'Gastroenterology', 'General Physician', 'Dermatology', 'ENT Specialist'
];

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [generatedCreds, setGeneratedCreds] = useState<{ id: string; pass: string; role: string } | null>(null);
  const [isCredsDialogOpen, setIsCredsDialogOpen] = useState(false);
  const { toast } = useToast();
  const db = useDb();
  const [hospitalId, setHospitalId] = useState<string | null>(null);

  useEffect(() => {
    if (db) {
      const session = localStorage.getItem('cabzi-cure-session');
      if (session) {
        const { partnerId } = JSON.parse(session);
        setHospitalId(partnerId);
        const doctorsRef = query(collection(db, `ambulances/${partnerId}/doctors`), orderBy('name', 'asc'));
        const unsubscribe = onSnapshot(doctorsRef, (snapshot) => {
          setDoctors(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Doctor)));
          setIsLoading(false);
        }, (error) => {
          console.error("Error fetching doctors:", error);
          toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch doctor list.' });
          setIsLoading(false);
        });
        return () => unsubscribe();
      } else {
        setIsLoading(false);
      }
    }
  }, [db, toast]);

  const handleAddDoctor = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!db || !hospitalId) return;

    const formData = new FormData(event.currentTarget);
    const name = formData.get('doctorName') as string;
    const phone = formData.get('doctorPhone') as string;
    const specialization = formData.get('specialization') as string;
    const qualifications = formData.get('qualifications') as string;
    const experience = formData.get('experience') as string;

    if (!name || !phone || !specialization || !qualifications || !experience) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please provide all doctor details.' });
      return;
    }
    
    const partnerId = `CZD-${phone.slice(-4)}${name.split(' ')[0].slice(0, 2).toUpperCase()}`;
    const password = `cAbZ@${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      await addDoc(collection(db, `ambulances/${hospitalId}/doctors`), {
        name, phone, specialization, qualifications, experience,
        photoUrl: 'pending_upload', degreeUrl: 'pending_upload', docStatus: 'Pending',
        partnerId, password, // Save credentials
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Doctor Added', description: `Dr. ${name} has been added. Their credentials are now available.` });
      setIsDialogOpen(false);
      setGeneratedCreds({ id: partnerId, pass: password, role: 'Doctor' });
      setIsCredsDialogOpen(true);
    } catch (error) {
      console.error('Error adding doctor:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not add doctor.' });
    }
  };

  const handleDeleteDoctor = async (doctorId: string, doctorName: string) => {
    if (!db || !hospitalId) return;
    const doctorRef = doc(db, `ambulances/${hospitalId}/doctors`, doctorId);
    try {
      await deleteDoc(doctorRef);
      toast({ variant: 'destructive', title: 'Doctor Removed', description: `Dr. ${doctorName} has been removed from the roster.` });
    } catch (error) {
       toast({ variant: 'destructive', title: 'Error', description: 'Could not remove the doctor.' });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Stethoscope className="w-6 h-6 text-primary"/> Doctor Management</CardTitle>
            <CardDescription>Add, view, and manage the doctors and specialists at your facility.</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button><UserPlus className="mr-2 h-4 w-4" /> Add Doctor</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>Add New Doctor</DialogTitle>
                <DialogDescription>Enter the details for the new doctor to add them to your hospital's roster.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddDoctor}>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="doctorName">Doctor's Full Name</Label>
                    <Input id="doctorName" name="doctorName" required />
                  </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                          <Label htmlFor="specialization">Specialization</Label>
                          <Select name="specialization" required>
                              <SelectTrigger><SelectValue placeholder="Select a specialization" /></SelectTrigger>
                              <SelectContent>
                              {doctorSpecializations.map(spec => (
                                  <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                              ))}
                              </SelectContent>
                          </Select>
                      </div>
                       <div className="space-y-2">
                          <Label htmlFor="doctorPhone">Contact Phone</Label>
                          <Input id="doctorPhone" name="doctorPhone" type="tel" required />
                      </div>
                  </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="qualifications">Qualifications</Label>
                        <Input id="qualifications" name="qualifications" placeholder="e.g., MBBS, MD (Cardiology)" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="experience">Experience (in years)</Label>
                        <Input id="experience" name="experience" type="number" placeholder="e.g., 10" required />
                      </div>
                  </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                          <Label htmlFor="doctorPhoto">Passport-size Photo</Label>
                          <Input id="doctorPhoto" name="doctorPhoto" type="file" required className="cursor-pointer"/>
                      </div>
                       <div className="space-y-2">
                          <Label htmlFor="degreeCert">Qualification Degree</Label>
                          <Input id="degreeCert" name="degreeCert" type="file" required className="cursor-pointer"/>
                      </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Add Doctor to Roster</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Doctor Name</TableHead>
                <TableHead>Specialization</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Documents</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                     <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : doctors.length > 0 ? (
                doctors.map((doctor) => (
                  <TableRow key={doctor.id}>
                    <TableCell>
                        <div className="font-medium">Dr. {doctor.name}</div>
                        <div className="text-xs text-muted-foreground">{doctor.qualifications || 'N/A'}</div>
                        {doctor.experience && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1">
                            <Briefcase className="w-3 h-3" /> {doctor.experience} years exp.
                          </div>
                        )}
                    </TableCell>
                    <TableCell><Badge variant="secondary">{doctor.specialization}</Badge></TableCell>
                    <TableCell>{doctor.phone}</TableCell>
                    <TableCell>
                       {doctor.docStatus === 'Verified' ? (
                          <Badge className="bg-green-100 text-green-800"><BadgeCheck className="w-3 h-3 mr-1"/>Verified</Badge>
                       ) : (
                          <Badge variant="destructive" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1"/>Pending</Badge>
                       )}
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4"/></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                             <DropdownMenuLabel>Actions</DropdownMenuLabel>
                             <AlertDialogTrigger asChild>
                                <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={(e) => e.preventDefault()}><Trash2 className="mr-2 h-4 w-4"/>Remove</DropdownMenuItem>
                             </AlertDialogTrigger>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>This will permanently remove Dr. {doctor.name} from your roster.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteDoctor(doctor.id, doctor.name)} className="bg-destructive hover:bg-destructive/90">Yes, remove</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">No doctors have been added yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
       <AlertDialog open={isCredsDialogOpen} onOpenChange={(isOpen) => {
          if(!isOpen) setGeneratedCreds(null);
          setIsCredsDialogOpen(isOpen);
      }}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>{generatedCreds?.role || 'Staff'} Added!</AlertDialogTitle>
                  <AlertDialogDescription>Share these credentials with the new staff member. They will be prompted to change their password on first login.</AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-4 my-4">
                  <div className="space-y-1"><Label htmlFor="partnerId">Partner ID</Label><Input id="partnerId" value={generatedCreds?.id ?? ''} readOnly /></div>
                  <div className="space-y-1"><Label htmlFor="tempPass">Temporary Password</Label><Input id="tempPass" value={generatedCreds?.pass ?? ''} readOnly /></div>
              </div>
              <AlertDialogFooter>
                  <Button variant="outline" onClick={() => {
                      navigator.clipboard.writeText(`ID: ${generatedCreds?.id}\nPass: ${generatedCreds?.pass}`);
                      toast({ title: 'Copied!' });
                  }}>Copy</Button>
                  <AlertDialogAction onClick={() => { setGeneratedCreds(null); setIsCredsDialogOpen(false); }}>Close</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
