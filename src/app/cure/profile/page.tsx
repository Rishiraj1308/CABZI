'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle, BadgeCheck, Ambulance, KeyRound, IndianRupee, Save } from 'lucide-react'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

interface CurePartnerData {
    id: string;
    name: string;
    phone: string;
    contactPerson: string;
    registrationNumber: string;
    services?: string[];
    baseFare?: number;
    perKmRate?: number;
}

export default function CureProfilePage() {
    const [partnerData, setPartnerData] = useState<CurePartnerData | null>(null);
    const [partnerDocId, setPartnerDocId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    // Fare management state
    const [baseFare, setBaseFare] = useState<number | string>('');
    const [perKmRate, setPerKmRate] = useState<number | string>('');

    // PIN Management State
    const [isPinSet, setIsPinSet] = useState(false);
    const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
    const [pinStep, setPinStep] = useState(0); // 0: Enter old, 1: Enter new, 2: Confirm new
    const [oldPin, setOldPin] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');

    useEffect(() => {
        const fetchProfile = async () => {
            if (typeof window !== 'undefined' && db) {
                const session = localStorage.getItem('cabzi-cure-session');
                const storedPin = localStorage.getItem('cabzi-user-pin');
                if (storedPin) {
                    setIsPinSet(true);
                }
                if (session) {
                    const { phone } = JSON.parse(session);
                    const cureRef = collection(db, "ambulances");
                    const q = query(cureRef, where("phone", "==", phone));
                    
                    try {
                        const querySnapshot = await getDocs(q);
                        if (!querySnapshot.empty) {
                            const doc = querySnapshot.docs[0];
                            const data = doc.data() as CurePartnerData;
                            setPartnerData({ id: doc.id, ...data });
                            setPartnerDocId(doc.id);
                            setBaseFare(data.baseFare || '');
                            setPerKmRate(data.perKmRate || '');
                        }
                    } catch(error) {
                        console.error("Error fetching Cure partner data:", error);
                        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch your profile data.' });
                    } finally {
                        setIsLoading(false);
                    }
                } else {
                     setIsLoading(false);
                }
            }
        };
        fetchProfile();
    }, [toast]);
    
     const getInitials = (name: string) => {
        if (!name) return 'C';
        const names = name.split(' ');
        if (names.length > 1) {
          return names[0][0] + names[names.length - 1][0];
        }
        return name.substring(0, 2);
      }

    const resetPinDialog = () => {
        setPinStep(isPinSet ? 0 : 1);
        setOldPin('');
        setNewPin('');
        setConfirmPin('');
    }

    const handlePinDialogChange = (open: boolean) => {
        setIsPinDialogOpen(open);
        if (open) {
            resetPinDialog();
        }
    }

    const handlePinSubmit = () => {
        const storedPin = localStorage.getItem('cabzi-user-pin');
        
        if (pinStep === 0) {
            if (oldPin === storedPin) {
                setPinStep(1);
            } else {
                 toast({ variant: 'destructive', title: 'Incorrect PIN' });
            }
            return;
        }
        
        if (newPin.length !== 4) {
            toast({ variant: 'destructive', title: 'Invalid PIN' });
            return;
        }
        
        if (pinStep === 1) {
            setPinStep(2);
            return;
        }

        if (newPin !== confirmPin) {
            toast({ variant: 'destructive', title: 'PIN Mismatch' });
            return;
        }

        localStorage.setItem('cabzi-user-pin', newPin);
        toast({ title: 'PIN Set Successfully!', className: 'bg-green-600 text-white border-green-600' });
        setIsPinSet(true);
        setIsPinDialogOpen(false);
    }

    const handleForgotPin = () => {
        toast({
            title: "OTP Sent! (Prototype)",
            description: "A verification code has been sent to your registered mobile number."
        });
        setPinStep(1);
    }

    const handleSaveFares = async () => {
        if (!partnerDocId || !db) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not save settings. Partner not found.' });
            return;
        }
        const fareData = {
            baseFare: Number(baseFare),
            perKmRate: Number(perKmRate)
        };

        if (isNaN(fareData.baseFare) || isNaN(fareData.perKmRate)) {
             toast({ variant: 'destructive', title: 'Invalid Input', description: 'Please enter valid numbers for fares.' });
            return;
        }
        
        try {
            const partnerRef = doc(db, 'ambulances', partnerDocId);
            await updateDoc(partnerRef, fareData);
            toast({ title: 'Fare Settings Saved', description: 'Your ambulance fares have been updated.' });
        } catch (error) {
             toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not update your fare settings.' });
        }
    }

    if (isLoading) {
      return (
          <div className="space-y-6">
              <Skeleton className="h-10 w-48" />
              <Card><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
              <Card><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
          </div>
      )
    }

  return (
      <div className="grid gap-6">
          <h2 className="text-3xl font-bold tracking-tight">Cure Partner Profile</h2>
          <Card>
              <CardHeader>
                  <CardTitle>Business Information</CardTitle>
                  <CardDescription>Your details are verified and cannot be changed from the app.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                   <div className="flex items-center gap-4">
                      <Avatar className="w-16 h-16">
                        <AvatarImage src="https://placehold.co/100x100.png" alt={partnerData?.name} data-ai-hint="hospital building" />
                        <AvatarFallback>{getInitials(partnerData?.name || '').toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                          <Label>Hospital / Clinic Name</Label>
                          <Input value={partnerData?.name || '...'} disabled />
                      </div>
                  </div>
                   <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                          <Label>Contact Person</Label>
                          <Input value={partnerData?.contactPerson || '...'} disabled />
                      </div>
                      <div className="space-y-2">
                          <Label>Contact Phone Number</Label>
                          <Input value={partnerData?.phone || '...'} disabled />
                      </div>
                       <div className="space-y-2">
                          <Label>Govt. Registration No.</Label>
                          <Input value={partnerData?.registrationNumber || '...'} disabled />
                      </div>
                  </div>
              </CardContent>
          </Card>
          <Card>
              <CardHeader>
                   <CardTitle className="flex items-center gap-2"><IndianRupee className="w-5 h-5 text-primary"/> Ambulance Fare Settings</CardTitle>
                   <CardDescription>Set your own pricing for ambulance services. This will be used to calculate estimated fares for patients.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                   <div className="grid md:grid-cols-2 gap-4">
                       <div className="space-y-2">
                           <Label htmlFor="baseFare">Base Fare (INR)</Label>
                           <Input id="baseFare" type="number" placeholder="e.g., 500" value={baseFare} onChange={e => setBaseFare(e.target.value)} />
                       </div>
                       <div className="space-y-2">
                           <Label htmlFor="perKmRate">Per Kilometer Rate (INR)</Label>
                           <Input id="perKmRate" type="number" placeholder="e.g., 20" value={perKmRate} onChange={e => setPerKmRate(e.target.value)} />
                       </div>
                   </div>
              </CardContent>
              <CardFooter>
                   <Button onClick={handleSaveFares}><Save className="mr-2 h-4 w-4"/> Save Fare Settings</Button>
              </CardFooter>
          </Card>
          <Card>
              <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                      <KeyRound className="w-5 h-5 text-primary"/>
                      Security Settings
                  </CardTitle>
                  <CardDescription>Manage your account security, including your UPI PIN.</CardDescription>
              </CardHeader>
              <CardContent>
                  <Dialog open={isPinDialogOpen} onOpenChange={handlePinDialogChange}>
                      <DialogTrigger asChild>
                          <Button variant="outline" className="w-full">{isPinSet ? 'Change UPI PIN' : 'Set UPI PIN'}</Button>
                      </DialogTrigger>
                      <DialogContent>
                           <DialogHeader>
                              <DialogTitle>
                                  {pinStep === 0 && 'Verify Old PIN'}
                                  {pinStep === 1 && 'Create New UPI PIN'}
                                  {pinStep === 2 && 'Confirm Your New PIN'}
                              </DialogTitle>
                          </DialogHeader>
                          <div className="flex flex-col items-center justify-center gap-2 py-4">
                              {pinStep === 0 && (
                                   <Input id="old-pin" type="password" inputMode="numeric" maxLength={4} value={oldPin} onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ''))} className="text-center text-2xl font-bold tracking-[1em] w-40" placeholder="••••" autoFocus />
                              )}
                              {pinStep === 1 && (
                                   <Input id="new-pin" type="password" inputMode="numeric" maxLength={4} value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))} className="text-center text-2xl font-bold tracking-[1em] w-40" placeholder="••••" autoFocus />
                              )}
                              {pinStep === 2 && (
                                   <Input id="confirm-pin" type="password" inputMode="numeric" maxLength={4} value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))} className="text-center text-2xl font-bold tracking-[1em] w-40" placeholder="••••" autoFocus />
                              )}
                              {pinStep === 0 && (
                                  <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                          <Button variant="link" className="text-xs h-auto p-0 mt-2">Forgot PIN?</Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                          <AlertDialogHeader>
                                              <AlertDialogTitle>Forgot UPI PIN?</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                 An OTP will be sent to your registered mobile number for verification.
                                              </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                                              <AlertDialogAction onClick={handleForgotPin}>Send OTP</AlertDialogAction>
                                          </AlertDialogFooter>
                                      </AlertDialogContent>
                                  </AlertDialog>
                              )}
                          </div>
                          <DialogFooter>
                             {pinStep === 0 && <Button className="w-full" onClick={handlePinSubmit} disabled={oldPin.length !== 4}>Verify</Button>}
                             {pinStep === 1 && <Button className="w-full" onClick={handlePinSubmit} disabled={newPin.length !== 4}>Next</Button>}
                             {pinStep === 2 && (
                                 <div className="w-full grid grid-cols-2 gap-4">
                                      <Button variant="outline" onClick={() => setPinStep(1)}>Back</Button>
                                      <Button className="w-full" onClick={handlePinSubmit} disabled={confirmPin.length !== 4}>Confirm</Button>
                                  </div>
                             )}
                          </DialogFooter>
                      </DialogContent>
                  </Dialog>
              </CardContent>
          </Card>
          <Card>
             <CardHeader>
                 <div className="flex items-center gap-2">
                     <Ambulance className="w-5 h-5 text-primary"/>
                     <CardTitle>My Services</CardTitle>
                 </div>
                 <CardDescription>The list of ambulance services you offer.</CardDescription>
             </CardHeader>
             <CardContent>
                 <div className="flex flex-wrap gap-2">
                     {partnerData?.services && partnerData.services.length > 0 ? (
                         partnerData.services.map(service => (
                             <Badge key={service} variant="secondary" className="p-2 text-sm">
                                 <BadgeCheck className="w-4 h-4 mr-1.5 text-green-600"/>
                                 {service}
                             </Badge>
                         ))
                     ) : (
                         <p className="text-sm text-muted-foreground">No services have been configured for this facility yet.</p>
                     )}
                 </div>
                  <Button variant="outline" className="w-full mt-4">Edit My Services</Button>
             </CardContent>
         </Card>
      </div>
  );
}
