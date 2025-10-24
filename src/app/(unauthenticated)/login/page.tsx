
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import BrandLogo from '@/components/brand-logo'
import { useLanguage } from '@/hooks/use-language'
import { useTheme } from 'next-themes'
import { Sun, Moon, Globe, Loader2 } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useFirebase } from '@/firebase/client-provider'
import { collection, query, where, getDocs, setDoc, doc, serverTimestamp, limit, collectionGroup } from 'firebase/firestore'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPhoneNumber, RecaptchaVerifier, type ConfirmationResult, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { AnimatePresence, motion } from 'framer-motion'

// This now matches the team page data for consistent roles
const MOCK_ADMIN_USERS = [
    { id: 'owner@cabzi.com', password: 'password123', name: 'Platform Owner', role: 'Platform Owner' },
    { id: 'cofounder@cabzi.com', password: 'password123', name: 'Co-founder', role: 'Co-founder' },
    { id: 'manager@cabzi.com', password: 'password123', name: 'Alok Singh', role: 'Manager' },
    { id: 'support@cabzi.com', password: 'password123', name: 'Priya Sharma', role: 'Support Staff' },
    { id: 'intern@cabzi.com', password: 'password123', name: 'Rahul Verma', role: 'Tech Intern' },
    { id: 'ai.support@cabzi.com', password: 'password123', name: 'AI Assistant', role: 'AI Assistant' },
];

function LanguageToggle() {
    const { setLanguage, t } = useLanguage()
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                    <Globe className="h-5 w-5" />
                    <span className="sr-only">Toggle language</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setLanguage('en')}>English</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage('hi')}>हिन्दी</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

function ThemeToggle() {
    const { setTheme } = useTheme()
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                    <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">Toggle theme</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setTheme('light')}>Light</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('dark')}>Dark</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('system')}>System</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { t } = useLanguage();
  const { auth, db } = useFirebase();
  const roleFromQuery = searchParams.get('role') || 'user'

  const [step, setStep] = useState<'login' | 'details' | 'otp'>('login');
  
  const [identifier, setIdentifier] = useState(searchParams.get('email') || '');
  
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const [name, setName] = useState('')
  const [gender, setGender] = useState('')
  const [adminId, setAdminId] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isMounted, setIsMounted] = useState(false);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleAdminLogin = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setIsLoading(true);

      const user = MOCK_ADMIN_USERS.find(u => u.id === adminId && u.password === adminPassword);

      setTimeout(() => {
        if (user) {
            localStorage.setItem('cabzi-session', JSON.stringify({ role: 'admin', phone: '', name: user.name, adminRole: user.role }));
            toast({ title: "Login Successful", description: `Welcome, ${user.role}!`});
            router.push('/admin');
        } else {
            toast({
                variant: 'destructive',
                title: "Authentication Failed",
                description: "Invalid Admin ID or Password.",
            });
        }
        setIsLoading(false);
      }, 1000)
  }

  const findAndSetSession = async (user: { uid: string; email?: string | null; phoneNumber?: string | null }) => {
    if (!db) return false;

    const isPartnerLogin = ['driver', 'mechanic', 'cure', 'doctor', 'ambulance'].includes(roleFromQuery);
    
    const partnerCollections = [
        { name: 'partners', role: 'driver' },
        { name: 'mechanics', role: 'mechanic' },
        { name: 'ambulances', role: 'cure' },
        { name: 'doctors', role: 'doctor' },
        { name: 'ambulanceDrivers', role: 'ambulance' },
    ];
    const userCollections = [{ name: 'users', role: 'user' }];
    
    const collectionsToSearch = isPartnerLogin ? partnerCollections : userCollections;

    for (const { name: colName, role } of collectionsToSearch) {
        // Create multiple queries for each possible identifier
        const queries = [
            query(collection(db, colName), where("phone", "==", identifier), limit(1)),
            query(collection(db, colName), where("email", "==", identifier), limit(1)),
            query(collection(db, colName), where("partnerId", "==", identifier), limit(1)),
        ];

        for (const q of queries) {
             const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                const userDoc = snapshot.docs[0];
                const userData = userDoc.data();

                // If a partner is trying to log in via the user flow, skip to the next collection
                if (roleFromQuery === 'user' && partnerCollections.some(p => p.role === role)) {
                    continue;
                }
                
                // Password check is required for all partner logins
                if (isPartnerLogin && userData.password !== password) {
                    toast({ variant: 'destructive', title: 'Incorrect Password' });
                    return false;
                }
                
                let localStorageKey = 'cabzi-session';
                if (role === 'mechanic') localStorageKey = 'cabzi-resq-session';
                if (role === 'cure') localStorageKey = 'cabzi-cure-session';
                if (role === 'ambulance') localStorageKey = 'cabzi-ambulance-session';
                if (role === 'doctor') localStorageKey = 'cabzi-doctor-session';

                const sessionData: any = { 
                    role: role,
                    phone: userData.phone, 
                    email: userData.email,
                    name: userData.name,
                    partnerId: userData.partnerId || userDoc.id,
                };
                
                 if (role === 'doctor' || role === 'ambulance') {
                    const pathParts = userDoc.ref.path.split('/');
                    if (pathParts.length >= 2) {
                        sessionData.hospitalId = pathParts[1];
                    }
                }

                localStorage.setItem(localStorageKey, JSON.stringify(sessionData));
                
                toast({ title: "Login Successful" });
                router.push(`/${role}`);
                return true;
            }
        }
    }
    
    // Fallback logic if no user/partner is found
     if (roleFromQuery === 'user' && !identifier.startsWith('CZ')) {
        setStep('details');
        return true; 
    } else {
        toast({ variant: 'destructive', title: 'Account Not Found', description: 'This account does not exist. Please check your credentials or onboard first.' });
        return false;
    }
  }

  const handleIdentifierSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const isPhoneNumber = /^\d{10}$/.test(identifier);

    if (isPhoneNumber && roleFromQuery === 'user') {
      await handlePhoneSubmit();
    } else {
       await findAndSetSession({ uid: '', email: null, phoneNumber: null });
    }
    
    setIsLoading(false);
  }


  const handlePhoneSubmit = async () => {
    if (!auth || !identifier || !recaptchaContainerRef.current) return;
    
    try {
        const fullPhoneNumber = `+91${identifier}`;
        const verifier = new RecaptchaVerifier(auth, recaptchaContainerRef.current, { size: 'invisible' });
        const confirmation = await signInWithPhoneNumber(auth, fullPhoneNumber, verifier);
        setConfirmationResult(confirmation);
        setStep('otp');
        toast({ title: 'OTP Sent!', description: `An OTP has been sent to ${fullPhoneNumber}.` });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Failed to Send OTP', description: error.message });
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
          toast({ variant: 'destructive', title: 'OTP Verification Failed', description: error.message });
      } finally {
          setIsLoading(false);
      }
  }


  const handleDetailsSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!name || !gender) {
          toast({ variant: 'destructive', title: "Incomplete Form", description: "Please provide your name and gender." });
          return;
      }
      if (!db || !auth) return;
      
      setIsLoading(true);
      try {
          let user = auth.currentUser;

          if (!user) {
              // This flow is for phone OTP. If email login needs creation, it needs separate logic.
              // For simplicity, we assume phone OTP flow leads here.
              toast({ variant: 'destructive', title: 'Authentication Error', description: 'User not authenticated. Please try again.' });
              setIsLoading(false);
              return;
          }

          const newUserRef = doc(db, "users", user.uid);
          await setDoc(newUserRef, {
              name,
              phone: user.phoneNumber ? user.phoneNumber.replace('+91','') : identifier,
              gender,
              role: 'user', 
              createdAt: serverTimestamp(),
              isOnline: false,
          });
  
          localStorage.setItem('cabzi-session', JSON.stringify({ role: 'user', phone: user.phoneNumber, name, gender, userId: user.uid }));
          toast({ title: "Account Created!", description: "Welcome to Cabzi! Redirecting...", className: "bg-green-600 text-white border-green-600" });
          router.push('/user');
  
      } catch (error: any) {
          console.error("Error creating new user:", error);
          toast({ variant: 'destructive', title: 'Registration Failed', description: error.message || 'Could not create your account.' });
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
        setIdentifier(result.user.email || ''); 
        await findAndSetSession(result.user);

    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Google Sign-In Failed', description: error.message });
    } finally {
        setIsLoading(false);
    }
  }
  
  const getPageTitle = () => {
      const isPartnerFlow = ['driver', 'mechanic', 'cure', 'doctor', 'ambulance'].includes(roleFromQuery);
      if (roleFromQuery === 'admin') return 'Admin Panel'
      if (step === 'details') return 'Create Your Account'
      if (step === 'otp') return 'Verify OTP'
      if (isPartnerFlow) return 'Partner Login'
      return 'User Login or Signup'
  };
  
  const getPageDescription = () => {
       const isPartnerFlow = ['driver', 'mechanic', 'cure', 'doctor', 'ambulance'].includes(roleFromQuery);
      if (roleFromQuery === 'admin') return 'Please enter your credentials to access the panel.'
      if (step === 'details') return 'Just one more step! Please provide your details.'
      if (step === 'otp') return `Enter the 6-digit code sent to +91 ${identifier}`
       if (isPartnerFlow) return `Enter your Partner ID, Phone, or Email to log in.`
      return `Sign in or create an account to get started.`
  };
  
  const formVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  const renderForms = () => {
    const isPartnerFlow = ['driver', 'mechanic', 'cure', 'doctor', 'ambulance'].includes(roleFromQuery);
    const isPhoneNumber = /^\d{10}$/.test(identifier);

    if (roleFromQuery === 'admin') {
      return (
        <motion.div key="admin" variants={formVariants}>
          <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="space-y-2">
                  <Label htmlFor="adminId">Admin ID</Label>
                  <Input id="adminId" name="adminId" type="email" placeholder="owner@cabzi.com" required value={adminId} onChange={(e) => setAdminId(e.target.value)} disabled={isLoading} />
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
                        <Label htmlFor="identifier">{isPartnerFlow ? "Partner ID, Email, or Phone" : "Email or Phone Number"}</Label>
                        <Input 
                            id="identifier" 
                            name="identifier" 
                            type="text" 
                            placeholder={isPartnerFlow ? "Enter your credential" : "name@example.com or phone"} 
                            required 
                            value={identifier} 
                            onChange={(e) => setIdentifier(e.target.value)} 
                            disabled={isLoading} 
                        />
                    </div>

                    {isPartnerFlow && (
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input id="password" name="password" type="password" placeholder="••••••••" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} />
                        </div>
                    )}
                    
                    <Button type="submit" className="w-full" disabled={isLoading || !identifier}>
                         {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Please wait...</> : (isPhoneNumber && !isPartnerFlow ? 'Send OTP' : 'Continue')}
                    </Button>
                </form>

                {roleFromQuery === 'user' && (
                    <>
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                            <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">OR</span></div>
                        </div>
                        <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isLoading}>
                            <svg className="mr-2 h-4 w-4" viewBox="0 0 48 48"> <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#4CAF50" d="M24,44c5.166,0,9.599-1.521,12.647-4.148l-6.365-4.931C28.147,33.433,26.166,34,24,34c-5.223,0-9.653-3.108-11.383-7.574l-6.57,4.819C9.656,39.663,16.318,44,24,44z"></path><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.365,4.931C39.477,35.901,44,30.548,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path></svg>
                            Sign in with Google
                        </Button>
                    </>
                )}
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
                        <Input id="otp" name="otp" type="tel" placeholder="123456" maxLength={6} required value={otp} onChange={(e) => setOtp(e.target.value)} disabled={isLoading} className="text-2xl tracking-[0.5em] text-center font-mono" />
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
                    <div className="space-y-2">
                        <Label>Identifier</Label>
                        <Input value={identifier} disabled />
                    </div>
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
      <div className="flex min-h-screen items-center justify-center p-4 bg-muted/40">
          <div id="recaptcha-container" ref={recaptchaContainerRef}></div>
          <div className="absolute top-4 right-4 flex items-center gap-2">
              <LanguageToggle />
              <ThemeToggle />
          </div>
          <Card className="w-full max-w-sm overflow-hidden">
            <CardHeader className="text-center">
              <div className="mx-auto">
                <Link href="/">
                  <BrandLogo />
                </Link>
              </div>
              <CardTitle className="text-2xl mt-4">{getPageTitle()}</CardTitle>
              <CardDescription>
                <AnimatePresence mode="wait">
                    <motion.p
                        key={step + roleFromQuery}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2 }}
                    >
                       {getPageDescription()}
                    </motion.p>
                </AnimatePresence>
              </CardDescription>
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
                        <p>Looking for a ride? <Link href="/login?role=user" className="underline text-primary" onClick={() => {setStep('login'); setIdentifier('');}}>Login as a User</Link></p>
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
      </div>
  );
}
