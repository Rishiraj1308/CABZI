
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
import { Sun, Moon, Globe } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useFirebase } from '@/firebase/client-provider'
import { collection, query, where, getDocs, setDoc, doc, serverTimestamp, limit } from 'firebase/firestore'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPhoneNumber, RecaptchaVerifier, type ConfirmationResult, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'

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
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');

  const [email, setEmail] = useState(searchParams.get('email') || '')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
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
  }

  const findAndSetSession = async (user: { uid: string; email?: string | null; phoneNumber?: string | null }) => {
    if (!db) return false;

    const isPartnerLogin = roleFromQuery === 'driver' || roleFromQuery === 'mechanic' || roleFromQuery === 'cure' || roleFromQuery === 'doctor' || roleFromQuery === 'ambulance';
    
    const partnerCollections = [
        { name: 'partners', role: 'driver' },
        { name: 'mechanics', role: 'mechanic' },
        { name: 'ambulances', role: 'cure' },
        { name: 'ambulanceDrivers', role: 'ambulance'},
        { name: 'doctors', role: 'doctor'},
    ];
    const userCollections = [{ name: 'users', role: 'user' }];

    const collectionsToSearch = isPartnerLogin 
        ? [...partnerCollections, ...userCollections] 
        : [...userCollections, ...partnerCollections];
    
    let identifier: string | undefined;
    let identifierField: 'email' | 'phone' = 'phone';

    if (loginMethod === 'email' && user.email) {
        identifier = user.email;
        identifierField = 'email';
    } else if (user.phoneNumber) {
        identifier = user.phoneNumber.replace('+91', '');
        identifierField = 'phone';
    }
    
    if (!identifier) return false;

    for (const { name: colName, role } of collectionsToSearch) {
        const q = query(collection(db, colName), where(identifierField, "==", identifier), limit(1));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            const userDoc = snapshot.docs[0];
            const userData = userDoc.data();
            
            if (isPartnerLogin && role === 'user') {
                continue; 
            }
            
            const sessionData: any = { 
                role: role,
                phone: userData.phone, 
                email: userData.email,
                name: userData.name,
                userId: user.uid,
            };

            if (colName !== 'users') {
                 sessionData.partnerId = userDoc.id;
                 if(userData.hospitalId) sessionData.hospitalId = userData.hospitalId;
            }
            
            let localStorageKey = 'cabzi-session';
            let redirectPath = `/${role}`;
            
            if (role === 'mechanic') localStorageKey = 'cabzi-resq-session';
            if (role === 'cure') localStorageKey = 'cabzi-cure-session';
            if (role === 'ambulance') localStorageKey = 'cabzi-ambulance-session';
            if (role === 'doctor') localStorageKey = 'cabzi-doctor-session';
            if (role === 'user') redirectPath = '/user';

            localStorage.setItem(localStorageKey, JSON.stringify(sessionData));
            
            toast({ title: "Login Successful" });
            router.push(redirectPath);
            return true;
        }
    }
    
    if (roleFromQuery === 'user') {
        setStep('details');
        return true; 
    } else {
        toast({ variant: 'destructive', title: 'Partner Not Found', description: 'This account does not exist. Please onboard first from the Partner Hub.' });
        return false;
    }
  }

  const handleEmailSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    if (!auth || !db) return;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await findAndSetSession(userCredential.user);
      
    } catch (error: any) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        if(roleFromQuery === 'user') {
            setStep('details');
        } else {
            toast({ variant: 'destructive', title: 'Partner Not Found', description: 'This account does not exist. Please onboard first from the Partner Hub.' });
        }
      } else if (error.code === 'auth/wrong-password') {
        toast({ variant: 'destructive', title: 'Incorrect Password', description: 'Please check your password and try again.' });
      } else {
        toast({ variant: 'destructive', title: 'Login Failed', description: error.message });
      }
    } finally {
      setIsLoading(false);
    }
  }

  const handlePhoneSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    if (!auth || !phone || !recaptchaContainerRef.current) return;
    
    try {
        const fullPhoneNumber = `+91${phone}`;
        const verifier = new RecaptchaVerifier(auth, recaptchaContainerRef.current, { size: 'invisible' });
        const confirmation = await signInWithPhoneNumber(auth, fullPhoneNumber, verifier);
        setConfirmationResult(confirmation);
        setStep('otp');
        toast({ title: 'OTP Sent!', description: `An OTP has been sent to ${fullPhoneNumber}.` });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Failed to Send OTP', description: error.message });
    } finally {
        setIsLoading(false);
    }
  }
  
  const handleOtpSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setIsLoading(true);
      if (!confirmationResult || !otp) return;
      
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
          // Determine if we need to create a new user or link details to an existing one.
          let user = auth.currentUser;

          if (!user) { // This handles the case for email/password signup
              user = (await createUserWithEmailAndPassword(auth, email, password)).user;
          }

          const newUserRef = doc(db, "users", user.uid);
          await setDoc(newUserRef, {
              name,
              email: user.email || email,
              phone: user.phoneNumber ? user.phoneNumber.replace('+91','') : phone,
              gender,
              role: 'user', 
              createdAt: serverTimestamp(),
              isOnline: false,
          });
  
          localStorage.setItem('cabzi-session', JSON.stringify({ role: 'user', email: user.email, name, gender, userId: user.uid }));
          toast({ title: "Account Created!", description: "Welcome to Cabzi! Redirecting...", className: "bg-green-600 text-white border-green-600" });
          router.push('/user');
  
      } catch (error: any) {
          console.error("Error creating new user:", error);
          if (error.code === 'auth/email-already-in-use') {
              toast({ variant: 'destructive', title: 'Registration Failed', description: 'This email is already in use. Please log in.' });
              setStep('login');
          } else {
              toast({ variant: 'destructive', title: 'Registration Failed', description: error.message || 'Could not create your account.' });
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
        setEmail(result.user.email || ''); 
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
      if (step === 'otp') return `Enter the 6-digit code sent to +91 ${phone}`
       if (isPartnerFlow) return `Enter your credentials to log in.`
      return `Sign in or create an account to get started.`
  };

  const renderAdminForm = () => (
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
            {isLoading ? "Verifying..." : 'Login'}
        </Button>
    </form>
  );

  const renderUserAndPartnerForms = () => {
    if (step === 'login') {
        return (
            <div className="space-y-4">
                {loginMethod === 'phone' ? (
                    <form onSubmit={handlePhoneSubmit} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone Number</Label>
                          <div className="flex items-center gap-0 rounded-md border border-input focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                            <span className="pl-3 text-muted-foreground text-sm">+91</span>
                            <Input id="phone" name="phone" type="tel" placeholder="12345 67890" maxLength={10} required value={phone} onChange={(e) => setPhone(e.target.value)} disabled={isLoading} className="border-0 h-9 focus-visible:ring-0 focus-visible:ring-offset-0 flex-1" />
                          </div>
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? "Sending..." : 'Send OTP'}
                        </Button>
                        <Button variant="link" size="sm" className="w-full" onClick={() => setLoginMethod('email')}>Sign in with Email instead</Button>
                    </form>
                ) : (
                    <form onSubmit={handleEmailSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input id="email" name="email" type="email" placeholder="priya@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input id="password" name="password" type="password" placeholder="••••••••" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} />
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? "Please wait..." : 'Continue with Email'}
                        </Button>
                         <Button variant="link" size="sm" className="w-full" onClick={() => setLoginMethod('phone')}>Sign in with Phone instead</Button>
                    </form>
                )}
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
        );
    }
    if (step === 'otp') {
        return (
            <form onSubmit={handleOtpSubmit} className="space-y-4">
                <div className="space-y-2 text-center">
                    <Label htmlFor="otp">Enter OTP</Label>
                    <Input id="otp" name="otp" type="tel" placeholder="123456" maxLength={6} required value={otp} onChange={(e) => setOtp(e.target.value)} disabled={isLoading} className="text-2xl tracking-[0.5em] text-center font-mono" />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Verifying..." : "Verify & Login"}
                </Button>
                <Button variant="link" size="sm" className="w-full" onClick={() => setStep('login')}>Back</Button>
            </form>
        )
    }
    if (step === 'details') {
         return (
            <form onSubmit={handleDetailsSubmit} className="space-y-4">
                 {loginMethod === 'email' ? (
                     <>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input id="email" value={email} disabled />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password_details">Create Password</Label>
                            <Input id="password_details" name="password" type="password" placeholder="••••••••" required value={password} onChange={(e) => setPassword(e.target.value)} />
                        </div>
                     </>
                 ) : (
                     <div className="space-y-2">
                        <Label htmlFor="phone_details">Phone Number</Label>
                        <Input id="phone_details" value={phone} disabled />
                    </div>
                 )}
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
                    {isLoading ? "Creating Account..." : "Create Account & Login"}
                </Button>
                 <Button variant="link" size="sm" className="w-full" onClick={() => setStep('login')}>Back to Login</Button>
            </form>
        )
    }
  }
  
  if (!isMounted) return null;

  const isPartnerFlow = ['driver', 'mechanic', 'cure', 'doctor', 'ambulance'].includes(roleFromQuery);

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
                {getPageDescription()}
              </CardDescription>
            </CardHeader>
            <CardContent>
                {roleFromQuery === 'admin' ? renderAdminForm() : renderUserAndPartnerForms()}
                
                <div className="mt-4 text-center text-sm text-muted-foreground space-y-2">
                    {roleFromQuery === 'user' && (
                        <p>Want to partner with us? <Link href="/partner-hub" className="underline text-primary">Become a Partner</Link></p>
                    )}
                    {isPartnerFlow && (
                        <p>Looking for a ride? <Link href="/login?role=user" className="underline text-primary" onClick={() => {setStep('login'); setLoginMethod('email');}}>Login as a User</Link></p>
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

