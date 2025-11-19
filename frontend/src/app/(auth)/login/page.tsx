
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import BrandLogo from '@/components/shared/brand-logo'
import { useLanguage } from '@/context/language-provider'
import { Loader2 } from 'lucide-react'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useFirebase } from '@/lib/firebase/client-provider'
import { collection, query, where, getDocs, setDoc, doc, serverTimestamp, limit, getDoc } from 'firebase/firestore'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPhoneNumber, RecaptchaVerifier, type ConfirmationResult, GoogleAuthProvider, signInWithPopup, type User } from 'firebase/auth'
import { AnimatePresence, motion } from 'framer-motion'
import { toast } from 'sonner'


export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useLanguage();
  const { auth, db } = useFirebase();
  const roleFromQuery = searchParams.get('role') || 'user'
  
  const [step, setStep] = useState<'login' | 'details' | 'otp'>('login');
  
  const [identifier, setIdentifier] = useState(searchParams.get('phone') || '');
  const [inputType, setInputType] = useState<'email' | 'phone' | 'none'>('none');
  
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const [name, setName] = useState('')
  const [gender, setGender] = useState('')
  const [dob, setDob] = useState('')
  const [adminId, setAdminId] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isMounted, setIsMounted] = useState(false);
  
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (identifier.includes('@')) {
      setInputType('email');
    } else if (/^\d{1,10}$/.test(identifier)) {
      setInputType('phone');
    } else {
      setInputType('none');
    }
  }, [identifier]);

  const handleAdminLogin = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setIsLoading(true);

      try {
        const response = await fetch('/api/auth/admin-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adminId, adminPassword }),
        });
        
        const data = await response.json();

        if (response.ok && data.success) {
            toast.success("Login Successful", { description: `Welcome, ${data.user.role}! Redirecting...`});
            // Correctly store the session object from the server response
            localStorage.setItem('curocity-admin-session', JSON.stringify(data.session));
            window.location.href = '/admin'; // Force reload to ensure layout state is fresh
        } else {
             toast.error("Authentication Failed", {
                description: data.message || "Invalid Admin ID or Password.",
            });
        }

      } catch (error) {
        toast.error("Login Error", { description: "An unexpected error occurred." });
      } finally {
        setIsLoading(false);
      }
  }

  const findAndSetSession = async (user: User) => {
    if (!db) return false;

    // Search for user in the 'users' collection by their UID
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
        const userData = userDoc.data();
        const sessionData = { 
            role: 'user',
            phone: userData.phone, 
            email: userData.email,
            name: userData.name,
            userId: user.uid,
            gender: userData.gender,
        };
        
        localStorage.setItem('curocity-session', JSON.stringify(sessionData));
        toast.success("Login Successful");
        router.push('/user');
        return true;
    }
    
    // User authenticated with Firebase but doesn't have a profile in Firestore, move to details step
    if (user.displayName) setName(user.displayName);
    if (user.email) setIdentifier(user.email);
    if (user.phoneNumber) setIdentifier(user.phoneNumber.replace('+91', ''));
    
    setStep('details'); 
    return true; // Return true to indicate the auth part was successful, but more details are needed
  }


  const handleIdentifierSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    if (inputType === 'email') {
      await handleEmailSubmit();
    } else if (inputType === 'phone') {
      await handlePhoneSubmit();
    }
    setIsLoading(false);
  }

  const handleEmailSubmit = async () => {
    if (!auth || !db) return;
    try {
      const userCredential = await signInWithEmailAndPassword(auth, identifier, password);
      await findAndSetSession(userCredential.user);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        // If user not found via email/pass, we treat it as a new registration
        setStep('details');
      } else if (error.code === 'auth/wrong-password') {
        toast.error('Incorrect Password', { description: 'Please check your password and try again.' });
      } else {
        toast.error('Login Failed', { description: error.message });
      }
    }
  }

  const handlePhoneSubmit = async () => {
    if (!auth || !identifier || !recaptchaContainerRef.current) return;
    
    try {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainerRef.current, { size: 'invisible' });
        const fullPhoneNumber = `+91${identifier}`;
        const confirmation = await signInWithPhoneNumber(auth, fullPhoneNumber, window.recaptchaVerifier);
        setConfirmationResult(confirmation);
        setStep('otp');
        toast.success('OTP Sent!', { description: `An OTP has been sent to ${fullPhoneNumber}.` });
    } catch (error: any) {
        toast.error('Failed to Send OTP', { description: error.message });
        console.error("Phone Auth Error:", error);
    }
  }
  
  const handleOtpSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setIsLoading(true);
      if (!confirmationResult || !otp) { setIsLoading(false); return };
      
      try {
          const result = await confirmationResult.confirm(otp);
          await findAndSetSession(result.user);
      } catch (error: any) {
          toast.error('OTP Verification Failed', { description: error.message });
      } finally {
          setIsLoading(false);
      }
  }


  const handleDetailsSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!name || !gender || !dob || (inputType === 'email' && !password)) {
          toast.error("Incomplete Form", { description: "Please fill out all required fields." });
          return;
      }
      if (!db || !auth) return;
      
      setIsLoading(true);
      try {
          let user = auth.currentUser;

          if (!user && inputType === 'email') {
              // This is the sign-up case for email
              user = (await createUserWithEmailAndPassword(auth, identifier, password)).user;
          }
          
          if (!user) {
              throw new Error("Could not create or find user. Please try logging in again.");
          }

          const newUserRef = doc(db, "users", user.uid);

          const dataToSave = {
              id: user.uid,
              name,
              email: user.email || (inputType === 'email' ? identifier : null),
              phone: user.phoneNumber ? user.phoneNumber.replace('+91','') : (inputType === 'phone' ? identifier : null),
              gender,
              dob,
              role: 'user', 
              createdAt: serverTimestamp(),
              isOnline: false,
          };

          await setDoc(newUserRef, dataToSave);
  
          localStorage.setItem('curocity-session', JSON.stringify({ 
            role: 'user', 
            phone: dataToSave.phone, 
            email: dataToSave.email, 
            name, 
            gender, 
            userId: user.uid 
          }));

          toast.success("Account Created!", { description: "Welcome to Curocity! Redirecting..." });
          router.push('/user');
  
      } catch (error: any) {
          console.error("Error creating new user:", error);
          if (error.code === 'auth/email-already-in-use') {
              toast.error('Registration Failed', { description: 'This email is already in use. Please log in.' });
              setStep('login');
          } else {
              toast.error('Registration Failed', { description: error.message || 'Could not create your account.' });
          }
      } finally {
          setIsLoading(false);
      }
  };

  const handleGoogleSignIn = async () => {
    if (!auth || !db) return;
    setIsLoading(true);
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        await findAndSetSession(result.user);
    } catch (error: any) {
        toast.error('Google Sign-In Failed', { description: error.message });
    } finally {
        setIsLoading(false);
    }
  }
  
  const getPageTitle = () => {
      if (roleFromQuery === 'admin') return 'Admin Panel'
      if (step === 'details') return 'Create Your Account'
      if (step === 'otp') return 'Verify OTP'
      return 'User Login or Signup'
  };
  
  const getPageDescription = () => {
      if (roleFromQuery === 'admin') return 'Please enter your credentials to access the panel.'
      if (step === 'details') return 'Just one more step! Please provide your details.'
      if (step === 'otp') return `Enter the 6-digit code sent to +91 ${identifier}`
      return `Sign in or create an account to get started.`
  };
  
  const formVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  const renderForms = () => {
    if (roleFromQuery === 'admin') {
      return (
        <motion.div key="admin" variants={formVariants}>
          <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="space-y-2">
                  <Label htmlFor="adminId">Admin ID</Label>
                  <Input id="adminId" name="adminId" type="email" placeholder="owner@curocity.com" required value={adminId} onChange={(e) => setAdminId(e.target.value)} disabled={isLoading} />
              </div>
              <div className="space-y-2">
                  <Label htmlFor="adminPassword">Password</Label>
                  <Input id="adminPassword" name="adminPassword" type="password" placeholder="••••••••" required value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} disabled={isLoading}/>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying...</> : 'Login'}
              </Button>
          </form>
        </motion.div>
      )
    }

    if (step === 'login') {
        return (
          <motion.div key="login" variants={formVariants}>
            <div className="space-y-4">
                <form onSubmit={handleIdentifierSubmit} className="space-y-4">
                     <div className="space-y-2">
                        <Label htmlFor="identifier">Phone or Email</Label>
                        {inputType === 'phone' ? (
                             <div className="flex items-center gap-0 rounded-md border border-input focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                                <span className="pl-3 text-muted-foreground text-sm">+91</span>
                                <Input 
                                    id="identifier" 
                                    name="identifier" 
                                    type="tel" 
                                    maxLength={10}
                                    placeholder="12345 67890" 
                                    required 
                                    value={identifier} 
                                    onChange={(e) => setIdentifier(e.target.value.replace(/[^0-9]/g, ''))} 
                                    disabled={isLoading} 
                                    className="border-0 h-9 focus-visible:ring-0 focus-visible:ring-offset-0 flex-1"
                                />
                             </div>
                        ) : (
                             <Input 
                                id="identifier" 
                                name="identifier" 
                                type="text" 
                                placeholder={'name@example.com'} 
                                required 
                                value={identifier} 
                                onChange={(e) => setIdentifier(e.target.value)} 
                                disabled={isLoading} 
                            />
                        )}
                    </div>

                    {inputType === 'email' && (
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input id="password" name="password" type="password" placeholder="••••••••" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} />
                        </div>
                    )}
                    
                    <Button type="submit" className="w-full" disabled={isLoading || identifier.length < 3}>
                         {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Please wait...</> : (inputType === 'phone' ? 'Send OTP' : 'Continue')}
                    </Button>
                </form>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">OR</span></div>
                </div>
                <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isLoading}>
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 48 48"> <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#4CAF50" d="M24,44c5.166,0,9.599-1.521,12.647-4.148l-6.365-4.931C28.147,33.433,26.166,34,24,34c-5.223,0-9.653-3.108-11.383-7.574l-6.57,4.819C9.656,39.663,16.318,44,24,44z"></path><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.365,4.931C39.477,35.901,44,30.548,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path></svg>
                    Sign in with Google
                </Button>
            </div>
           </motion.div>
        );
    }
    if (step === 'otp') {
        return (
            <motion.div key="otp" variants={formVariants}>
                <form onSubmit={handleOtpSubmit} className="space-y-4">
                    <div className="space-y-2 text-center">
                        <Label htmlFor="otp">Enter OTP</Label>
                        <Input id="otp" name="otp" type="tel" placeholder="123456" maxLength={6} required value={otp} onChange={(e) => setOtp(e.target.value)} disabled={isLoading} className="text-2xl tracking-[0.5em] text-center font-mono h-14" />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                         {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying...</> : "Verify & Login"}
                    </Button>
                    <Button variant="link" size="sm" className="w-full" onClick={() => setStep('login')}>Back</Button>
                </form>
            </motion.div>
        )
    }
    if (step === 'details') {
         return (
            <motion.div key="details" variants={formVariants}>
                <form onSubmit={handleDetailsSubmit} className="space-y-4">
                    {inputType === 'email' ? (
                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input id="email" value={identifier} disabled />
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <Label htmlFor="phone_details">Phone Number</Label>
                            <Input id="phone_details" value={identifier} disabled />
                        </div>
                    )}
                    {inputType === 'email' && !auth?.currentUser && (
                        <div className="space-y-2">
                            <Label htmlFor="password_details">Create Password</Label>
                            <Input id="password_details" name="password" type="password" placeholder="••••••••" required value={password} onChange={(e) => setPassword(e.target.value)} />
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input id="name" name="name" placeholder="e.g., Priya Sharma" required value={name} onChange={(e) => setName(e.target.value)} autoFocus />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="dob">Date of Birth</Label>
                        <Input id="dob" name="dob" type="date" required value={dob} onChange={(e) => setDob(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Gender</Label>
                        <RadioGroup name="gender" required className="flex gap-4 pt-2" value={gender} onValueChange={setGender}>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="male" id="male" /><Label htmlFor="male">Male</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="female" id="female" /><Label htmlFor="female">Female</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="other" id="other" /><Label htmlFor="other">Other</Label></div>
                        </RadioGroup>
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating Account...</> : "Create Account & Login"}
                    </Button>
                    <Button variant="link" size="sm" className="w-full" onClick={() => setStep('login')}>Back to Login</Button>
                </form>
            </motion.div>
        )
    }
  }
  
  if (!isMounted) return null;

  return (
    <>
      <div id="recaptcha-container" ref={recaptchaContainerRef} />
      <Card className="w-full max-w-sm overflow-hidden">
        <CardHeader className="text-center">
          <div className="mx-auto">
            <Link href="/">
              <BrandLogo />
            </Link>
          </div>
          <CardTitle className="text-2xl mt-4">{getPageTitle()}</CardTitle>
            <AnimatePresence mode="wait">
                <motion.p
                    key={step + roleFromQuery}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="text-sm text-muted-foreground"
                >
                   {getPageDescription()}
                </motion.p>
            </AnimatePresence>
        </CardHeader>
        <CardContent>
          <AnimatePresence mode="wait">
            {renderForms()}
          </AnimatePresence>
            
            <div className="mt-4 text-center text-sm text-muted-foreground space-y-2">
                {roleFromQuery === 'user' && (
                    <p>Want to partner with us? <Link href="/partner-hub" className="underline text-primary">Become a Partner</Link></p>
                )}
                {roleFromQuery !== 'user' && (
                    <p>Looking for a ride? <Link href="/login" className="underline text-primary" onClick={() => {setStep('login'); setInputType('none'); setIdentifier('');}}>Login as a User</Link></p>
                )}
                {roleFromQuery !== 'admin' && (
                     <p>
                        <Link href="/login?role=admin" className="text-xs underline" onClick={() => setStep('login')}>
                            Admin Login
                        </Link>
                    </p>
                )}
            </div>
        </CardContent>
      </Card>
    </>
  );
}

    