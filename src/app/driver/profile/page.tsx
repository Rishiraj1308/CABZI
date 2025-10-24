
'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CheckCircle, QrCode, Download, KeyRound } from 'lucide-react'
import DriverIdCard from '@/components/driver-id-card'
import { db, auth } from '@/lib/firebase'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { Skeleton } from './ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, } from "@/components/ui/alert-dialog"
import { cn } from '@/lib/utils'
import { signInWithPhoneNumber, RecaptchaVerifier, type ConfirmationResult } from 'firebase/auth'


interface PartnerData {
    name: string;
    phone: string;
    vehicleType: string;
    vehicleNumber: string;
    upiId?: string;
    qrCodeUrl?: string;
}

export default function ProfilePage() {
    const [partnerData, setPartnerData] = useState<PartnerData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    
    // PIN Management State
    const [isPinSet, setIsPinSet] = useState(false);
    const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
    const [pinStep, setPinStep] = useState(0); // 0: Enter old, 1: Enter new, 2: Confirm new, 3: Verify OTP for reset
    const [oldPin, setOldPin] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [otp, setOtp] = useState('');
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && db) {
            const session = localStorage.getItem('cabzi-session');
            const storedPin = localStorage.getItem('cabzi-user-pin');
            if (storedPin) {
                setIsPinSet(true);
            }
            
            if (session) {
                const { phone } = JSON.parse(session);
                const partnersRef = collection(db, "partners");
                const q = query(partnersRef, where("phone", "==", phone));
                
                const unsubscribe = onSnapshot(q, (querySnapshot) => {
                    if (!querySnapshot.empty) {
                        const doc = querySnapshot.docs[0];
                        const data = doc.data();
                        setPartnerData({
                          ...data,
                          upiId: data.upiId || `${data.phone}@cabzi`,
                          qrCodeUrl: data.qrCodeUrl || `https://placehold.co/300x300.png?text=Cabzi+UPI`
                        } as PartnerData);
                    }
                    setIsLoading(false);
                });
                
                return () => unsubscribe();
            } else {
                 setIsLoading(false);
            }
        }
    }, []);

    const handleDownloadQR = async () => {
        if (!partnerData?.qrCodeUrl) {
            toast({
                variant: 'destructive',
                title: 'Download Error',
                description: 'QR Code image is not available to download.',
            });
            return;
        }

        try {
            const response = await fetch(partnerData.qrCodeUrl);
            if (!response.ok) throw new Error('Network response was not ok.');
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `cabzi-upi-qr-${partnerData.phone}.png`;
            
            document.body.appendChild(a);
            a.click();
            
            window.URL.revokeObjectURL(url);
            a.remove();
            
            toast({
                title: 'Download Started',
                description: 'Your Cabzi UPI QR Code is being downloaded.',
            });

        } catch (error) {
            console.error('Failed to download QR code:', error);
            toast({
                variant: 'destructive',
                title: 'Download Failed',
                description: 'Could not download the QR code image. Please try again.',
            });
        }
    };
    
    const resetPinDialog = () => {
        setPinStep(isPinSet ? 0 : 1);
        setOldPin('');
        setNewPin('');
        setConfirmPin('');
        setOtp('');
    }
    
    // Correctly set initial step when dialog opens
    const handlePinDialogChange = (open: boolean) => {
        setIsPinDialogOpen(open);
        if (open) {
            resetPinDialog();
        }
    }

    const handlePinSubmit = async () => {
        const storedPin = localStorage.getItem('cabzi-user-pin');
        
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
        
        if (pinStep === 1) { // Move to confirmation step
            setPinStep(2);
            return;
        }

        if (newPin !== confirmPin) {
            toast({ variant: 'destructive', title: 'PIN Mismatch', description: 'The new PINs you entered do not match.' });
            return;
        }

        localStorage.setItem('cabzi-user-pin', newPin);
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


  return (
      <div className="grid gap-6">
          <div id="recaptcha-container-profile"></div>
          <div className="flex flex-col md:flex-row gap-6 md:items-center md:justify-between">
            <h2 className="text-3xl font-bold tracking-tight">My Profile</h2>
          </div>
          <DriverIdCard />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Personal Information</CardTitle>
                        <CardDescription>Your personal details are verified and cannot be changed.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            {isLoading ? <Skeleton className="h-10 w-full" /> : <Input id="name" value={partnerData?.name || '...'} disabled />}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number</Label>
                            {isLoading ? <Skeleton className="h-10 w-full" /> : <Input id="phone" value={partnerData?.phone || '...'} disabled />}
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
                                        {pinStep === 1 && 'Please enter a new 4-digit PIN for your Cabzi Bank account.'}
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
                    <CardTitle>Vehicle Details</CardTitle>
                    <CardDescription>Your registered vehicle information is verified and cannot be changed.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="vehicle-type">Vehicle Type</Label>
                            {isLoading ? <Skeleton className="h-10 w-full" /> : (
                                <Select value={partnerData?.vehicleType || ''} disabled>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="bike">Bike</SelectItem>
                                        <SelectItem value="auto">Auto</SelectItem>
                                        <SelectItem value="cab-lite">Cab (Lite)</SelectItem>
                                        <SelectItem value="cab-prime">Cab (Prime)</SelectItem>
                                        <SelectItem value="cab-xl">Cab (XL)</SelectItem>
                                        <SelectItem value="toto">Toto</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="vehicle-number">Vehicle Number</Label>
                            {isLoading ? <Skeleton className="h-10 w-full" /> : <Input id="vehicle-number" value={partnerData?.vehicleNumber || '...'} disabled />}
                        </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <QrCode className="w-6 h-6 text-primary"/>
                            <CardTitle>Payment Details</CardTitle>
                        </div>
                        <CardDescription>This QR code is linked to your Cabzi Bank account for receiving payments.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-4">
                        {isLoading ? <Skeleton className="h-48 w-48 rounded-lg"/> : (
                             <div className="p-4 bg-white rounded-lg border">
                               <Image 
                                 src={partnerData?.qrCodeUrl || ''}
                                 alt="UPI QR Code"
                                 width={180}
                                 height={180}
                                 data-ai-hint="qr code"
                               />
                             </div>
                        )}
                        <div>
                            <p className="text-sm text-muted-foreground">Your UPI ID</p>
                            {isLoading ? <Skeleton className="h-6 w-40 mt-1"/> : <p className="font-semibold text-lg text-center">{partnerData?.upiId || '...'}</p>}
                        </div>
                        <Button variant="outline" className="w-full" onClick={handleDownloadQR} disabled={isLoading || !partnerData?.qrCodeUrl}>
                            <Download className="mr-2 h-4 w-4" />
                            Download QR Code
                        </Button>
                    </CardContent>
                </Card>
            </div>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>KYC & Vehicle Documents</CardTitle>
              <CardDescription>Manage your uploaded documents.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-3 rounded-lg border">
                <div>
                  <p>Driving License</p>
                  <p className="text-sm text-green-600 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Verified</p>
                </div>
                <Button variant="outline">View/Update</Button>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg border">
                <div>
                  <p>Aadhaar Card</p>
                  <p className="text-sm text-green-600 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Verified</p>
                </div>
                <Button variant="outline">View/Update</Button>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg border">
                <div>
                  <p>Vehicle RC</p>
                   <p className="text-sm text-green-600 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Verified</p>
                </div>
                <Button variant="outline">View/Update</Button>
              </div>
            </CardContent>
          </Card>
      </div>
  );
}
