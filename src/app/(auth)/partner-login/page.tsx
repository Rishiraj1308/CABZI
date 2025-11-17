
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import BrandLogo from '@/components/shared/brand-logo'
import { Loader2 } from 'lucide-react'
import { useFirebase } from '@/lib/firebase/client-provider'
import { collection, query, where, getDocs, limit, collectionGroup } from 'firebase/firestore'
import { AnimatePresence, motion } from 'framer-motion'
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from 'firebase/auth'

export default function PartnerLoginPage() {
  const router = useRouter()
  const { auth, db } = useFirebase();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isMounted, setIsMounted] = useState(false);
  const [inputType, setInputType] = useState<'phone' | 'partnerId' | 'none'>('none');
  const [step, setStep] = useState<'login' | 'otp'>('login');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const recaptchaContainerRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (/^\d{1,10}$/.test(identifier)) {
      setInputType('phone');
    } else if (identifier.length > 3) {
      setInputType('partnerId');
    } else {
      setInputType('none');
    }
  }, [identifier]);


  const findAndSetSession = async (searchField: string, searchValue: string) => {
    if (!db) {
        toast.error('Database Error', { description: 'Could not connect to the database.' });
        return;
    }

    const partnerCollections = [
        { name: 'pathPartners', role: 'driver' },
        { name: 'mechanics', role: 'mechanic' },
        { name: 'curePartners', role: 'cure' },
        { name: 'doctors', role: 'doctor' },
        { name: 'ambulanceDrivers', role: 'ambulance' },
    ];
    
    for (const { name: colName, role } of partnerCollections) {
        
        let q;
        if (['doctor', 'ambulance'].includes(role)) {
             q = query(collectionGroup(db, colName), where(searchField, "==", searchValue), limit(1));
        } else {
             q = query(collection(db, colName), where(searchField, "==", searchValue), limit(1));
        }

        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            const userDoc = snapshot.docs[0];
            const userData = userDoc.data();
            
            if (searchField === 'partnerId' && userData.password !== password) {
                toast.error('Incorrect Password');
                return; 
            }
            
            const status = userData.docStatus || userData.status;
            if (status && status.toLowerCase() !== 'verified') {
                 let message = 'Your account requires admin approval. Please wait or contact support.';
                if (status.toLowerCase().includes('rejected') || status.toLowerCase().includes('suspended')) {
                    message = 'Your account has been rejected or suspended. Please contact support.';
                }
                toast.error('Account Not Active', { description: message, duration: 7000 });
                return;
            }

            let hospitalId = null;
            if ((role === 'doctor' || role === 'ambulance') && userDoc.ref.parent.parent) {
                hospitalId = userDoc.ref.parent.parent.id;
            }

            const sessionData: any = { 
                role: role,
                phone: userData.phone, 
                email: userData.email,
                name: userData.name,
                partnerId: userDoc.id,
                id: userDoc.id,
                hospitalId: hospitalId || userData.hospitalId,
                userId: userData.userId
            };
            
            let localStorageKey = 'curocity-session';
            let redirectPath = `/${role}`;
            
            if (role === 'driver') redirectPath = '/driver';
            if (role === 'mechanic') {
                localStorageKey = 'curocity-resq-session';
                redirectPath = '/mechanic';
            }
            if (role === 'cure') {
                localStorageKey = 'curocity-cure-session';
                redirectPath = '/cure';
            }
            if (role === 'ambulance') {
                 localStorageKey = 'curocity-ambulance-session';
                 redirectPath = '/ambulance';
            }
            if (role === 'doctor') {
                 localStorageKey = 'curocity-doctor-session';
                 redirectPath = '/doctor';
            }
            
            localStorage.setItem(localStorageKey, JSON.stringify(sessionData));
            
            toast.success("Login Successful", {
                description: `Welcome back, ${userData.name}!`
            });
            router.push(redirectPath);
            return; 
        }
    }
    
    toast.error('Partner Not Found', { description: 'This account does not exist. Please check your credentials or onboard first.' });
  }

  const handlePartnerLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    if(inputType === 'phone'){
        await handlePhoneSubmit();
    } else if (inputType === 'partnerId') {
        await findAndSetSession('partnerId', identifier);
    }
    setIsLoading(false);
  }

  const handlePhoneSubmit = async () => {
    if (!auth || !identifier || !recaptchaContainerRef.current) return;
    
    try {
        const fullPhoneNumber = `+91${identifier}`;
        window.recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainerRef.current, { size: 'invisible' });
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
    if (!confirmationResult || !otp) { setIsLoading(false); return; }
    
    try {
        const result = await confirmationResult.confirm(otp);
        await findAndSetSession('phone', result.user.phoneNumber!.replace('+91',''));
    } catch (error: any) {
        toast.error('OTP Verification Failed', { description: error.message });
    } finally {
        setIsLoading(false);
    }
  }
  
  const formVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };
  
  if (!isMounted) return null;

  return (
      <Card className="w-full max-w-sm">
          <div id="recaptcha-container" ref={recaptchaContainerRef} />
          <CardHeader className="text-center">
            <div className="mx-auto">
              <Link href="/">
                <BrandLogo />
              </Link>
            </div>
            <CardTitle className="text-2xl mt-4">Partner Login</CardTitle>
              <AnimatePresence mode="wait">
                  <motion.p
                      key={step}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.2 }}
                      className="text-sm text-muted-foreground"
                  >
                     {step === 'login' ? 'Enter your credentials to access your dashboard.' : `Enter OTP sent to +91 ${identifier}`}
                  </motion.p>
              </AnimatePresence>
          </CardHeader>
          <CardContent>
            <AnimatePresence mode="wait">
               {step === 'login' ? (
                   <motion.div key="partner-form" variants={formVariants}>
                      <form onSubmit={handlePartnerLogin} className="space-y-4">
                          <div className="space-y-2">
                              <Label htmlFor="identifier">Registered Phone or Partner ID</Label>
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
                                      placeholder="e.g., CZD1234 or 9876543210"
                                      required 
                                      value={identifier} 
                                      onChange={(e) => setIdentifier(e.target.value)} 
                                      disabled={isLoading} 
                                  />
                              )}
                          </div>

                          {inputType === 'partnerId' && (
                              <div className="space-y-2">
                                  <Label htmlFor="password">Password</Label>
                                  <Input id="password" name="password" type="password" placeholder="••••••••" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} />
                              </div>
                          )}
                      
                          <Button type="submit" className="w-full" disabled={isLoading || identifier.length < 3}>
                              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Please wait...</> : (inputType === 'phone' ? 'Send OTP' : 'Login')}
                          </Button>
                      </form>
                  </motion.div>
               ) : (
                  <motion.div key="otp-form" variants={formVariants}>
                      <form onSubmit={handleOtpSubmit} className="space-y-4">
                          <div className="space-y-2 text-center">
                              <Label htmlFor="otp">Enter OTP</Label>
                              <Input id="otp" name="otp" type="tel" placeholder="123456" maxLength={6} required value={otp} onChange={(e) => setOtp(e.target.value)} disabled={isLoading} className="text-2xl tracking-[0.5em] text-center font-mono" />
                          </div>
                          <Button type="submit" className="w-full" disabled={isLoading}>
                              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying...</> : "Verify & Login"}
                          </Button>
                          <Button variant="link" size="sm" className="w-full" onClick={() => setStep('login')}>Back</Button>
                      </form>
                  </motion.div>
               )}
            </AnimatePresence>
              
              <div className="mt-4 text-center text-sm text-muted-foreground space-y-2">
                  <p>Not a partner? <Link href="/partner-hub" className="underline text-primary">Become a Partner</Link></p>
                  <p>Looking for a ride? <Link href="/login" className="underline text-primary">Login as a User</Link></p>
              </div>
          </CardContent>
      </Card>
  );
}
