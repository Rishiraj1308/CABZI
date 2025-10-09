
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import BrandLogo from '@/components/brand-logo'
import { db, auth } from '@/lib/firebase'
import { collection, addDoc, serverTimestamp, query, where, getDocs, limit, doc, setDoc } from "firebase/firestore";
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from 'firebase/auth'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft } from 'lucide-react'

export default function RiderOnboardingPage() {
    const { toast } = useToast()
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [step, setStep] = useState(1);
    const totalSteps = 3;

    // Form state
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [name, setName] = useState('');
    const [gender, setGender] = useState('');

    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && auth) {
             // @ts-ignore
            if (!window.recaptchaVerifier) {
                // @ts-ignore
                window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                    'size': 'invisible',
                    'callback': (response: any) => {
                        // reCAPTCHA solved, allow signInWithPhoneNumber.
                    }
                });
            }
        }
    }, []);

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        if (!db || !auth) {
            toast({ variant: 'destructive', title: "System Error", description: "Firebase is not initialized." });
            setIsLoading(false);
            return;
        }

        try {
            // Check if user already exists
            const q = query(collection(db, "users"), where("phone", "==", phone), limit(1));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                toast({
                    variant: 'destructive',
                    title: "User Already Exists",
                    description: "This phone number is already registered. Please log in instead.",
                    action: <Button onClick={() => router.push('/login?role=rider')}>Login</Button>
                });
                setIsLoading(false);
                return;
            }
            
            // @ts-ignore
            const verifier = window.recaptchaVerifier;
            const fullPhoneNumber = `+91${phone}`;
            const result = await signInWithPhoneNumber(auth, fullPhoneNumber, verifier);
            
            setConfirmationResult(result);
            setStep(2);
            toast({
              title: 'OTP Sent',
              description: "Use 123456 for any test number you've added in Firebase.",
              duration: 9000,
            })

        } catch (error) {
            console.error("Error sending OTP:", error);
            toast({ variant: 'destructive', title: "Failed to Send OTP", description: "Please check the number or try again." });
        } finally {
            setIsLoading(false);
        }
    }
    
    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        if (!confirmationResult) {
            toast({ variant: 'destructive', title: "Verification Error", description: "Please request an OTP first."});
            setIsLoading(false);
            return;
        }

        try {
            await confirmationResult.confirm(otp);
            toast({ title: "OTP Verified!", description: "Please enter your details." });
            setStep(3);
        } catch (error) {
            toast({ variant: 'destructive', title: "Invalid OTP", description: "The OTP you entered is incorrect." });
        } finally {
            setIsLoading(false);
        }
    }
    
    const handleCreateAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        if (!db || !name || !gender) {
            toast({ variant: 'destructive', title: "Incomplete Details" });
            setIsLoading(false);
            return;
        }

        try {
            const newUserRef = doc(collection(db, "users"));
            await setDoc(newUserRef, {
                name,
                phone,
                gender,
                role: 'rider',
                createdAt: serverTimestamp(),
            });

            localStorage.setItem('cabzi-session', JSON.stringify({ role: 'rider', phone, name, gender, userId: newUserRef.id }));
            
            toast({ title: "Account Created!", description: "Welcome to Cabzi! Redirecting...", className: "bg-green-600 text-white border-green-600" });
            setTimeout(() => {
                router.push('/rider');
            }, 1500);

        } catch (error) {
            console.error("Error creating account:", error);
            toast({ variant: 'destructive', title: "Registration Failed" });
            setIsLoading(false);
        }
    }
    
    const renderStepContent = () => {
        switch (step) {
            case 1:
                return (
                    <form onSubmit={handleSendOtp} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="phone">Enter Your Mobile Number</Label>
                            <div className="flex items-center gap-0 rounded-md border border-input focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                                <span className="pl-3 text-muted-foreground text-sm">+91</span>
                                <Input id="phone" name="phone" type="tel" maxLength={10} placeholder="12345 67890" required value={phone} onChange={(e) => setPhone(e.target.value.replace(/\\D/g, ''))} disabled={isLoading} className="border-0 h-9 focus-visible:ring-0 focus-visible:ring-offset-0 flex-1" />
                            </div>
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? 'Sending...' : 'Send OTP'}</Button>
                    </form>
                );
            case 2:
                 return (
                    <form onSubmit={handleVerifyOtp} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="otp">Enter 6-Digit OTP</Label>
                            <Input id="otp" name="otp" type="text" inputMode="numeric" maxLength={6} placeholder="123456" required value={otp} onChange={(e) => setOtp(e.target.value)} disabled={isLoading} autoFocus />
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? 'Verifying...' : 'Verify OTP'}</Button>
                    </form>
                 );
            case 3:
                return (
                    <form onSubmit={handleCreateAccount} className="space-y-4 animate-fade-in">
                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input id="name" name="name" placeholder="e.g., Priya Sharma" required value={name} onChange={(e) => setName(e.target.value)} autoFocus />
                        </div>
                        <div className="space-y-2">
                            <Label>Gender</Label>
                            <RadioGroup name="gender" required className="flex gap-4 pt-2" value={gender} onValueChange={setGender}>
                                <div className="flex items-center space-x-2"><RadioGroupItem value="male" id="male" /><Label htmlFor="male">Male</Label></div>
                                <div className="flex items-center space-x-2"><RadioGroupItem value="female" id="female" /><Label htmlFor="female">Female</Label></div>
                                <div className="flex items-center space-x-2"><RadioGroupItem value="other" id="other" /><Label htmlFor="other">Other</Label></div>
                            </RadioGroup>
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? 'Creating Account...' : 'Create Account & Login'}</Button>
                    </form>
                );
        }
    }


    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-muted/40">
            <div id="recaptcha-container"></div>
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto"><BrandLogo /></div>
                    <CardTitle className="text-2xl mt-4">Join Cabzi</CardTitle>
                    <CardDescription>Create your account in a few simple steps.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="px-4 mb-6">
                        <Progress value={(step / totalSteps) * 100} className="w-full" />
                    </div>
                    {renderStepContent()}
                </CardContent>
                 <CardFooter className="flex-col gap-2">
                     <p className="text-xs text-muted-foreground">
                        Already have an account?{' '}
                        <Link href="/login?role=rider" className="underline text-primary">
                            Log In
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
