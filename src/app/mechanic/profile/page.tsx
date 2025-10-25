
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle, BadgeCheck, Wrench, KeyRound } from 'lucide-react'
import { useDb, useFirebase } from '@/firebase/client-provider'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, AlertDialogFooter } from "@/components/ui/alert-dialog"
import { signInWithPhoneNumber, RecaptchaVerifier, type ConfirmationResult } from 'firebase/auth'

interface ResQPartnerData {
    name: string;
    phone: string;
    garageName: string;
    services: string[];
    vehicleNumber: string;
}

export default function ResQProfilePage() {
    const [partnerData, setPartnerData] = useState<ResQPartnerData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    const db = useDb();
    const { auth } = useFirebase();

    // PIN Management State
    const [isPinSet, setIsPinSet] = useState(false);
    const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
    const [pinStep, setPinStep] = useState(0); // 0: Enter old, 1: Enter new, 2: Confirm new
    const [oldPin, setOldPin] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [otp, setOtp] = useState('');
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            if (typeof window !== 'undefined' && db) {
                const session = localStorage.getItem('curocity-resq-session');
                const storedPin = localStorage.getItem('curocity-user-pin');
                if (storedPin) {
                    setIsPinSet(true);
                }
                if (session) {
                    const { phone } = JSON.parse(session);
                    const mechanicsRef = collection(db, "mechanics");
                    const q = query(mechanicsRef, where("phone", "==", phone));
                    
                    try {
                        const querySnapshot = await getDocs(q);
                        if (!querySnapshot.empty) {
                            const doc = querySnapshot.docs[0];
                            setPartnerData(doc.data() as ResQPartnerData);
                        }
                    } catch(error) {
                        console.error("Error fetching ResQ partner data:", error);
                        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch your profile data.' });
                    } finally {
                        setIsLoading(false);
                    }
                } else {
                     setIsLoading(false);
                }
            } else {
                setIsLoading(false);
            }
        };
        fetchProfile();
    }, [toast, db]);
    
     const getInitials = (name: string) => {
        if (!name) return 'R';
        const names = name.split(' ');
        return names.length > 1 ? names[0][0] + names[1][0] : name.substring(0, 2);
      }

    const resetPinDialog = () => {
        setPinStep(isPinSet ? 0 : 1);
        setOldPin('');
        setNewPin('');
        setConfirmPin('');
        setOtp('');
    }

    const handlePinDialogChange = (open: boolean) => {
        setIsPinDialogOpen(open);
        if (open) {
            resetPinDialog();
        }
    }

    const handlePinSubmit = async () => {
        const storedPin = localStorage.getItem('curocity-user-pin');
        
        if (pinStep === 0) {
            if (oldPin === storedPin) {
                setPinStep(1);
            } else {
                 toast({ variant: 'destructive', title: 'Incorrect PIN', description: 'The old PIN you entered is incorrect.' });
            }
            return;
        }
        
        if (pinStep === 3) { // OTP verification step
            if (!confirmationResult) return;
            try {
                await confirmationResult.confirm(otp);
                toast({ title: 'OTP Verified!', description: 'You can now set a new PIN.' });
                setPinStep(1); // Proceed to set new PIN
            } catch (error) {
                toast({ variant: 'destructive', title: 'Invalid OTP', description: 'The OTP you entered is incorrect.' });
            }
            return;
        }
        
        if (newPin.length !== 4) {
            toast({ variant: 'destructive', title: 'Invalid PIN', description: 'Please enter a 4-digit PIN.' });
            return;
        }
        
        if (pinStep === 1) {
            setPinStep(2);
            return;
        }

        if (newPin !== confirmPin) {
            toast({ variant: 'destructive', title: 'PIN Mismatch', description: 'The new PINs you entered do not match.' });
            return;
        }

        localStorage.setItem('curocity-user-pin', newPin);
        toast({ title: 'PIN Set Successfully!', description: 'Your new UPI PIN has been set.', className: 'bg-green-600 text-white border-green-600' });
        setIsPinSet(true);
        setIsPinDialogOpen(false);
    }
    
    const handleForgotPin = async () => {
        if (!partnerData?.phone || !auth) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not get your phone number to send OTP.' });
            return;
        }
        
        try {
            // @ts-ignore
            window.recaptchaVerifier = window.recaptchaVerifier || new RecaptchaVerifier(auth, 'recaptcha-container-profile', { size: 'invisible' });
            // @ts-ignore
            const verifier = window.recaptchaVerifier;

            const fullPhoneNumber = `+91${partnerData.phone}`;
            const result = await signInWithPhoneNumber(auth, fullPhoneNumber, verifier);
            
            setConfirmationResult(result);
            setPinStep(3); // Move to OTP entry step
            toast({
                title: "OTP Sent!",
                description: "An OTP has been sent to your registered mobile number for verification."
            });
        } catch (error) {
            console.error("Error sending OTP for PIN reset:", error);
            toast({ variant: 'destructive', title: 'Failed to send OTP' });
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
           <div id="recaptcha-container-profile"></div>
          <h2 className="text-3xl font-bold tracking-tight">My ResQ Profile</h2>
          <Card>
              <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>Your details are verified and cannot be changed from the app.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                   <div className="flex items-center gap-4">
                      <Avatar className="w-16 h-16">
                        <AvatarImage src="https://placehold.co/100x100.png" alt={partnerData?.name} data-ai-hint="mechanic portrait" />
                        <AvatarFallback>{getInitials(partnerData?.name || '').toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                          <Label>Name</Label>
                          <Input value={partnerData?.name || '...'} disabled />
                      </div>
                  </div>
                   <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                          <Label>Phone Number</Label>
                          <Input value={partnerData?.phone || '...'} disabled />
                      </div>
                      <div className="space-y-2">
                          <Label>Garage / Business Name</Label>
                          <Input value={partnerData?.garageName || 'Individual Freelancer'} disabled />
                      </div>
                  </div>
              </CardContent>
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
                                  {pinStep === 3 && 'Verify OTP'}
                              </DialogTitle>
                              <DialogDescription>
                                  {pinStep === 0 && 'For your security, please enter your old 4-digit PIN to continue.'}
                                  {pinStep === 1 && 'Please enter a new 4-digit PIN for your Curocity Bank account.'}
                                  {pinStep === 2 && 'Please re-enter the 4-digit PIN to confirm.'}
                                  {pinStep === 3 && 'Enter the OTP sent to your registered mobile number.'}
                              </DialogDescription>
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
                              {pinStep === 3 && (
                                   <Input id="otp-pin-reset" type="text" inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value)} className="text-center text-2xl font-bold tracking-[0.5em] w-48" placeholder="123456" autoFocus />
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
                                                 To reset your PIN, we will need to verify your identity. A secure OTP will be sent to your registered mobile number.
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
                             {pinStep === 0 && <Button className="w-full" onClick={handlePinSubmit} disabled={oldPin.length !== 4}>Verify & Proceed</Button>}
                             {pinStep === 1 && <Button className="w-full" onClick={handlePinSubmit} disabled={newPin.length !== 4}>Next</Button>}
                             {pinStep === 2 && (
                                 <div className="w-full grid grid-cols-2 gap-4">
                                      <Button variant="outline" onClick={() => setPinStep(1)}>Back</Button>
                                      <Button className="w-full" onClick={handlePinSubmit} disabled={confirmPin.length !== 4}>Confirm & Set PIN</Button>
                                  </div>
                             )}
                             {pinStep === 3 && <Button className="w-full" onClick={handlePinSubmit} disabled={otp.length !== 6}>Verify OTP</Button>}
                          </DialogFooter>
                      </DialogContent>
                  </Dialog>
              </CardContent>
          </Card>
          <Card>
              <CardHeader>
                  <div className="flex items-center gap-2">
                      <Wrench className="w-5 h-5 text-primary"/>
                      <CardTitle>My Services</CardTitle>
                  </div>
                  <CardDescription>The list of services you currently offer on the Curocity platform.</CardDescription>
              </CardHeader>
              <CardContent>
                  <div className="flex flex-wrap gap-2">
                      {partnerData?.services?.map(service => (
                          <Badge key={service} variant="secondary" className="p-2 text-sm">
                              <BadgeCheck className="w-4 h-4 mr-1.5 text-green-600"/>
                              {service}
                          </Badge>
                      )) || <p className="text-sm text-muted-foreground">No services configured.</p>}
                  </div>
                   <Button variant="outline" className="w-full mt-4">Edit My Services</Button>
              </CardContent>
          </Card>
      </div>
  );
}
