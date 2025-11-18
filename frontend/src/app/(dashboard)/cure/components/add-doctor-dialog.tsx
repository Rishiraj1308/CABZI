'use client'

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft, UserPlus, UploadCloud } from 'lucide-react';
import { useFirebase } from '@/lib/firebase';
import { toast } from 'sonner';
import { collection, doc, query, where, writeBatch, serverTimestamp, getDocs, collectionGroup, limit } from 'firebase/firestore';

const doctorSpecializations = [
  'General Physician', 'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'Oncology', 
  'Gastroenterology', 'Dermatology', 'ENT Specialist'
];

const initialDoctorState = {
    fullName: '', gender: '', dob: '', contactNumber: '', emailAddress: '',
    specialization: '', qualifications: '', experience: '', department: '',
    designation: '', medicalRegNo: '', regCouncil: '', regYear: '',
    consultationFee: '', agreedToTerms: false,
};

const initialAvailability = {
    Monday: { available: true, start: '09:00', end: '17:00' },
    Tuesday: { available: true, start: '09:00', end: '17:00' },
    Wednesday: { available: true, start: '09:00', end: '17:00' },
    Thursday: { available: true, start: '09:00', end: '17:00' },
    Friday: { available: true, start: '09:00', end: '17:00' },
    Saturday: { available: false, start: '10:00', end: '14:00' },
    Sunday: { available: false, start: '', end: '' },
};

export const AddDoctorDialog = ({ partnerData }: { partnerData: any }) => {
    const { db } = useFirebase();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [newDoctorData, setNewDoctorData] = useState(initialDoctorState);
    const [generatedCreds, setGeneratedCreds] = useState<{ id: string, pass: string, role: string } | null>(null);
    const [isCredsDialogOpen, setIsCredsDialogOpen] = useState(false);
    const [currentFormStep, setCurrentFormStep] = useState(1);
    const totalSteps = 6;
    const [availability, setAvailability] = useState(initialAvailability);

    const handleFormChange = (field: keyof typeof newDoctorData, value: any) => {
        setNewDoctorData(prev => ({ ...prev, [field]: value }));
    };

    const handleAvailabilityDayChange = (day: string, field: 'available' | 'start' | 'end', value: any) => {
        setAvailability(prev => ({
            ...prev,
            [day]: { ...prev[day], [field]: value }
        }));
    };

    const handleNextStep = () => {
        if (currentFormStep === 1) {
            if (!newDoctorData.fullName || !newDoctorData.specialization) {
                toast.error('Incomplete', { description: 'Please enter name and specialization.' });
                return;
            }
        }
        if (currentFormStep === 2) {
             if (!newDoctorData.contactNumber) {
                toast.error('Incomplete', { description: 'Please enter a contact number.' });
                return;
            }
        }
        setCurrentFormStep(p => p < totalSteps ? p + 1 : p);
    }
    
    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (currentFormStep < totalSteps) {
            handleNextStep();
            return;
        }

        if (!newDoctorData.agreedToTerms) {
            toast.error('Agreement Required', { description: 'Please agree to the terms.' });
            return;
        }

        if (!db || !partnerData) {
            toast.error('Error', { description: 'Database or facility information is missing.' });
            return;
        }
        
        setIsSubmitting(true);
        const { agreedToTerms, ...restOfData } = newDoctorData;
        const { fullName: name, contactNumber: phone, emailAddress: email } = restOfData;

        try {
            const q = query(collectionGroup(db, 'doctors'), where("phone", "==", phone), limit(1));
            const phoneCheckSnapshot = await getDocs(q);

            if (!phoneCheckSnapshot.empty) {
                throw new Error("A doctor with this phone number is already registered.");
            }

            const partnerId = `CZD-${phone.slice(-4)}${name.split(' ')[0].slice(0, 2).toUpperCase()}`;
            const password = `cAbZ@${Math.floor(1000 + Math.random() * 9000)}`;
            const batch = writeBatch(db);
            const newDoctorDocRefInHospital = doc(collection(db, `curePartners/${partnerData.id}/doctors`));
            
            const doctorData = { 
                id: newDoctorDocRefInHospital.id, name, phone, email, 
                ...restOfData, partnerId, createdAt: serverTimestamp(), 
                docStatus: 'Awaiting Final Approval', hospitalId: partnerData.id, hospitalName: partnerData.name, 
                isAvailable: false, weeklyAvailability: availability,
            };
            
            batch.set(newDoctorDocRefInHospital, doctorData);
            
            const newDoctorDocRefGlobal = doc(collection(db, 'doctors'), newDoctorDocRefInHospital.id);
            batch.set(newDoctorDocRefGlobal, {
                 id: newDoctorDocRefInHospital.id, name, phone, email, partnerId, password,
                 hospitalId: partnerData.id, hospitalName: partnerData.name, createdAt: serverTimestamp(),
                 status: 'pending_verification'
            });

            await batch.commit();

            setGeneratedCreds({ id: partnerId, pass: password, role: 'Doctor' });
            setIsOpen(false);
            setCurrentFormStep(1);
            setIsCredsDialogOpen(true);
            toast.success('Doctor Record Created!', { description: `Dr. ${name}'s record submitted for verification.` });
            setNewDoctorData(initialDoctorState);
      
        } catch (error: any) {
            toast.error('Error Adding Doctor', { description: error.message || 'An unexpected error occurred.' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
     const renderAddDoctorForm = () => {
        switch(currentFormStep) {
            case 1: // Basic Details
                return (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                            <div className="space-y-2"><Label>Full Name*</Label><Input name="fullName" required value={newDoctorData.fullName} onChange={e => handleFormChange('fullName', e.target.value)} /></div>
                            <div className="space-y-2"><Label>Specialization*</Label><Select name="specialization" required onValueChange={v => handleFormChange('specialization', v)} value={newDoctorData.specialization}><SelectTrigger><SelectValue placeholder="Select Specialization"/></SelectTrigger><SelectContent>{doctorSpecializations.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
                            <div className="space-y-2"><Label>Gender*</Label><RadioGroup name="gender" required className="flex gap-4 pt-2" value={newDoctorData.gender} onValueChange={v => handleFormChange('gender', v)}><div className="flex items-center space-x-2"><RadioGroupItem value="male" id="male" /><Label htmlFor="male">Male</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="female" id="female" /><Label htmlFor="female">Female</Label></div></RadioGroup></div>
                            <div className="space-y-2"><Label>Experience (years)</Label><Input name="experience" type="number" value={newDoctorData.experience} onChange={e => handleFormChange('experience', e.target.value)} /></div>
                            <div className="space-y-2"><Label>Consultation Fee (INR, optional)</Label><Input name="consultationFee" type="number" placeholder="e.g., 800" value={newDoctorData.consultationFee} onChange={e => handleFormChange('consultationFee', e.target.value)} /></div>
                        </div>
                    </div>
                );
            case 2: // Contact
                 return (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                             <div className="space-y-2"><Label>Email Address*</Label><Input name="emailAddress" type="email" required value={newDoctorData.emailAddress} onChange={e => handleFormChange('emailAddress', e.target.value)} /></div>
                             <div className="space-y-2"><Label>Contact Number*</Label><Input name="contactNumber" type="tel" maxLength={10} required value={newDoctorData.contactNumber} onChange={e => handleFormChange('contactNumber', e.target.value)} /></div>
                        </div>
                    </div>
                 );
            case 3: // Medical KYC
                return (
                    <div className="space-y-4">
                        <CardDescription>Upload clear photos of the documents.</CardDescription>
                        <div className="space-y-4 pt-2">
                             <div className="space-y-2"><Label htmlFor="doc-reg">Medical Registration Certificate* (e.g., from MCI)</Label><Input id="doc-reg" type="file" required /></div>
                             <div className="space-y-2"><Label htmlFor="doc-degree">Degree Certificate* (MBBS, BDS, etc.)</Label><Input id="doc-degree" type="file" required /></div>
                             <div className="space-y-2"><Label htmlFor="doc-photo">Doctor's Passport-size Photo*</Label><Input id="doc-photo" type="file" required /></div>
                        </div>
                    </div>
                );
            case 4: // Availability
                return (
                    <div className="space-y-4">
                        <CardDescription>Set the doctor's weekly recurring schedule. This can be changed later.</CardDescription>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                            {Object.entries(availability).map(([day, value]) => (
                                <div key={day} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                                    <Switch id={`avail-${day}`} checked={value.available} onCheckedChange={(c) => handleAvailabilityDayChange(day, 'available', c)} />
                                    <Label htmlFor={`avail-${day}`} className="font-medium w-24">{day}</Label>
                                    <Input type="time" value={value.start} onChange={e => handleAvailabilityDayChange(day, 'start', e.target.value)} disabled={!value.available} className="w-32"/>
                                    <span className="text-muted-foreground">-</span>
                                    <Input type="time" value={value.end} onChange={e => handleAvailabilityDayChange(day, 'end', e.target.value)} disabled={!value.available} className="w-32"/>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 5: // Legal
                return (
                    <div className="space-y-4">
                         <CardDescription>The doctor must agree to these terms to be listed on the Curocity platform.</CardDescription>
                         <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground mt-4">
                            <li>I take full responsibility for all diagnoses and prescriptions provided.</li>
                            <li>I acknowledge and accept full medical liability for my consultations.</li>
                            <li>I agree to Curocity's terms of service and partnership policies.</li>
                            <li>I consent to data privacy and compliance policies of the platform.</li>
                         </ul>
                         <div className="flex items-center space-x-2 pt-4">
                            <Checkbox id="terms" checked={newDoctorData.agreedToTerms} onCheckedChange={(checked) => handleFormChange('agreedToTerms', !!checked)} />
                            <Label htmlFor="terms" className="text-sm font-medium leading-none">The doctor has read and agreed to all terms.</Label>
                        </div>
                    </div>
                );
            case 6: // Review
                return (
                    <div className="space-y-4">
                        <CardDescription>Please review all the information before final submission.</CardDescription>
                        <div className="p-4 rounded-lg border bg-muted/50 space-y-3">
                            <div className="flex justify-between"><span className="text-muted-foreground">Name:</span> <span className="font-semibold">Dr. {newDoctorData.fullName}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Specialization:</span> <span className="font-semibold">{newDoctorData.specialization}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Contact:</span> <span className="font-semibold">{newDoctorData.contactNumber}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Fee:</span> <span className="font-semibold">₹{newDoctorData.consultationFee || 'N/A'}</span></div>
                        </div>
                    </div>
                );
            default: return null;
        }
    }

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => {
                setIsOpen(open);
                if (!open) {
                    setCurrentFormStep(1);
                    setNewDoctorData(initialDoctorState);
                }
            }}>
                <DialogTrigger asChild>
                    <Button><UserPlus className="mr-2 h-4 w-4"/> Add Doctor</Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Add New Doctor</DialogTitle>
                        <DialogDescription>Step {currentFormStep} of {totalSteps}: Enter doctor's details for verification.</DialogDescription>
                        <Progress value={(currentFormStep / totalSteps) * 100} className="w-full mt-2" />
                    </DialogHeader>
                    <form onSubmit={handleSubmit}>
                        <div className="py-4 max-h-[70vh] overflow-y-auto pr-6">
                            {renderAddDoctorForm()}
                        </div>
                        <DialogFooter className="pt-6">
                            {currentFormStep > 1 && <Button type="button" variant="outline" onClick={() => setCurrentFormStep(p => p - 1)}><ArrowLeft className="w-4 h-4 mr-2"/>Previous</Button>}
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? "Submitting..." : 
                                currentFormStep < totalSteps ? 'Next Step' : "Submit for Verification"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            <AlertDialog open={isCredsDialogOpen} onOpenChange={(open) => { if(!open) setGeneratedCreds(null); setIsCredsDialogOpen(open); }}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>{generatedCreds?.role || 'Staff'} Added!</AlertDialogTitle><AlertDialogDescription>Share these credentials with the new staff member.</AlertDialogDescription></AlertDialogHeader>
                    <div className="space-y-4 my-4">
                        <div className="space-y-1"><Label htmlFor="partnerId">Partner ID</Label><Input id="partnerId" value={generatedCreds?.id ?? ''} readOnly /></div>
                        <div className="space-y-1"><Label htmlFor="tempPass">Temporary Password</Label><Input id="tempPass" value={generatedCreds?.pass ?? ''} readOnly /></div>
                    </div>
                    <AlertDialogFooter><AlertDialogAction onClick={() => { setGeneratedCreds(null); setIsCredsDialogOpen(false); }}>Close</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};
