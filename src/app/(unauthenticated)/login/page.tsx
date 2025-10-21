
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
import { collection, query, where, getDocs, setDoc, doc, serverTimestamp } from 'firebase/firestore'
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
                <DropdownMenuItem onClick={() => setLanguage('en')}>{t('lang_english')}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage('hi')}>{t('lang_hindi')}</DropdownMenuItem>
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
  const roleFromQuery = searchParams.get('role') || 'rider'

  const [step, setStep] = useState<'login' | 'otp' | 'details'>('login');
  const [loginInput, setLoginInput] = useState(searchParams.get('email') || searchParams.get('phone') || '');
  const [inputType, setInputType] = useState<'email' | 'phone'>('email');
  
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [otp, setOtp] = useState('');

  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const [partnerIdInput, setPartnerIdInput] = useState('')
  const [partnerPassword, setPartnerPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isMounted, setIsMounted] = useState(false);
  
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
    // Initialize reCAPTCHA verifier
    if (auth && recaptchaContainerRef.current) {
        if (typeof (window as any).recaptchaVerifier === 'object') {
            (window as any).recaptchaVerifier.clear();
        }
        (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
            'size': 'invisible',
            'callback': (response: any) => {
              // reCAPTCHA solved, allow signInWithPhoneNumber.
            }
        });
    }
  }, [auth]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLoginInput(value);
    if (/^\d+$/.test(value) && value.length > 0) {
        setInputType('phone');
    } else {
        setInputType('email');
    }
  }
  
  const handlePartnerLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    if (!db) {
        setIsLoading(false);
        return;
    }
    
    let collectionName = '';
    let targetRole = '';
    let sessionKey = '';
    let redirectPath = '';

    if (roleFromQuery === 'doctor') {
      collectionName = 'doctors';
      targetRole = 'doctor';
      sessionKey = 'cabzi-doctor-session';
      redirectPath = '/doctor';
    }

    if (!collectionName) {
        toast({ variant: 'destructive', title: 'Invalid Role' });
        setIsLoading(false);
        return;
    }
    
    try {
        const q = query(collection(db, collectionName), where("partnerId", "==", partnerIdInput), where("password", "==", partnerPassword));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            const partnerDoc = snapshot.docs[0];
            const partnerData = partnerDoc.data();
            const sessionData = { 
                role: targetRole,
                phone: partnerData.phone, 
                name: partnerData.name, 
                partnerId: partnerIdInput,
                hospitalId: partnerData.hospitalId,
            };
            localStorage.setItem(sessionKey, JSON.stringify(sessionData));
            toast({ title: "Login Successful" });
            router.push(redirectPath);
        } else {
            toast({ variant: 'destructive', title: 'Invalid Credentials' });
        }

    } catch (error) {
        console.error(`Error during ${targetRole} login:`, error);
        toast({ variant: 'destructive', title: 'Login Failed' });
    } finally {
        setIsLoading(false);
    }
  }


 const findAndSetSession = async (user: { uid: string; email?: string | null; phoneNumber?: string | null }) => {
    if (!db) return false;

    const collectionsToSearch = [
        { name: 'partners', role: 'driver', sessionKey: 'cabzi-session' },
        { name: 'mechanics', role: 'mechanic', sessionKey: 'cabzi-resq-session' },
        { name: 'ambulances', role: 'cure', sessionKey: 'cabzi-cure-session' },
        { name: 'users', role: 'rider', sessionKey: 'cabzi-session' },
    ];
    
    let userIdentifier: string | undefined;
    let identifierField: 'email' | 'phone' = user.email ? 'email' : 'phone';

    if (user.email) {
        userIdentifier = user.email;
    } else if (user.phoneNumber) {
        userIdentifier = user.phoneNumber.slice(3); // Remove +91
    }
    
    if (!userIdentifier) return false;

    for (const { name: colName, role, sessionKey } of collectionsToSearch) {
        const q = query(collection(db, colName), where(identifierField, "==", userIdentifier));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            const userDoc = snapshot.docs[0];
            const userData = userDoc.data();
            
            const isRiderLogin = roleFromQuery === 'rider';
            const isPartnerLogin = ['driver', 'mechanic', 'cure', 'doctor'].includes(roleFromQuery);
            
            const foundRider = role === 'rider';
            const foundPartner = ['driver', 'mechanic', 'cure'].includes(role);

            if ((isRiderLogin && foundRider) || (isPartnerLogin && foundPartner)) {
                const sessionData = { 
                    role,
                    phone: userData.phone, 
                    name: userData.name, 
                    partnerId: userDoc.id, 
                    userId: userData.role === 'rider' ? userDoc.id : undefined
                };
                localStorage.setItem(sessionKey, JSON.stringify(sessionData));
                toast({ title: "Login Successful" });
                router.push(`/${role}`);
                return true;
            }
        }
    }
    return false;
  }

  const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    if (!auth || !db) {
        toast({ variant: 'destructive', title: 'Error', description: 'Firebase not initialized correctly.' });
        setIsLoading(false);
        return;
    }
    
    if (inputType === 'phone') {
        try {
            const verifier = (window as any).recaptchaVerifier;
            const fullPhoneNumber = `+91${loginInput}`;
            const result = await signInWithPhoneNumber(auth, fullPhoneNumber, verifier);
            setConfirmationResult(result);
            setStep('otp');
            toast({ title: 'OTP Sent', description: `An OTP has been sent to ${fullPhoneNumber}` });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Failed to Send OTP', description: error.message });
        } finally {
            setIsLoading(false);
        }
        return;
    }
    
    // Email Login
    const email = loginInput;
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userFound = await findAndSetSession(userCredential.user);
      
      if (!userFound) {
        if (roleFromQuery === 'rider') {
            setStep('details'); // New rider, go to details form.
        } else {
            if (auth) auth.signOut();
            toast({ variant: 'destructive', title: 'Partner Not Found', description: 'This account does not exist or you are trying to log into the wrong portal.' });
        }
      }
    } catch (error: any) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        if(roleFromQuery === 'rider') {
            setStep('details');
        } else {
            toast({ variant: 'destructive', title: 'Partner Not Found', description: 'Please check your credentials or onboard first.' });
        }
      } else if (error.code === 'auth/wrong-password') {
        toast({ variant: 'destructive', title: 'Incorrect Password' });
      } else {
        toast({ variant: 'destructive', title: 'Login Failed', description: error.message });
      }
    } finally {
      setIsLoading(false);
    }
  }

  const handleOtpSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!confirmationResult || !otp) return;
      setIsLoading(true);
      try {
          const userCredential = await confirmationResult.confirm(otp);
          const userFound = await findAndSetSession(userCredential.user);

          if (!userFound) {
              if (roleFromQuery === 'rider') {
                  setStep('details');
              } else {
                  if(auth) auth.signOut();
                  toast({ variant: 'destructive', title: 'Partner Not Found', description: 'Please onboard via the Partner Hub first.' });
              }
          }
      } catch (error: any) {
          toast({ variant: 'destructive', title: 'OTP Verification Failed', description: error.message });
      } finally {
          setIsLoading(false);
      }
  };

  const handleDetailsSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!name || !gender) {
          toast({ variant: 'destructive', title: "Incomplete Form" });
          return;
      }
      if (!db || !auth) return;
      
      setIsLoading(true);
      try {
          let user = auth.currentUser;

          if (!user && inputType === 'email') {
              const userCredential = await createUserWithEmailAndPassword(auth, loginInput, password);
              user = userCredential.user;
          }
          
          if (!user) throw new Error("User authentication failed.");

          const newUserRef = doc(db, "users", user.uid);
          await setDoc(newUserRef, {
              name,
              phone: inputType === 'phone' ? loginInput : '',
              email: inputType === 'email' ? loginInput : '',
              gender,
              role: 'rider',
              createdAt: serverTimestamp(),
              isOnline: false,
          });
  
          localStorage.setItem('cabzi-session', JSON.stringify({ role: 'rider', email: loginInput, name, gender, userId: user.uid }));
          toast({ title: "Account Created!", description: "Welcome to Cabzi! Redirecting...", className: "bg-green-600 text-white border-green-600" });
          router.push('/rider');
  
      } catch (error: any) {
          console.error("Error creating new user:", error);
          if (error.code === 'auth/email-already-in-use') {
              toast({ variant: 'destructive', title: 'Registration Failed', description: 'This email is already in use.' });
              setStep('login');
          } else {
              toast({ variant: 'destructive', title: 'Registration Failed', description: error.message });
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
        const user = result.user;
        const userEmail = user.email;

        if (!userEmail) {
            throw new Error("Could not get email from Google Sign-In.");
        }

        const userQuery = query(collection(db, 'users'), where('email', '==', userEmail));
        const userSnapshot = await getDocs(userQuery);

        if (!userSnapshot.empty) { // User exists
            const userDoc = userSnapshot.docs[0];
            const userData = userDoc.data();
            const sessionData = { 
                role: 'rider',
                phone: userData.phone, 
                name: userData.name, 
                userId: userDoc.id 
            };
            localStorage.setItem('cabzi-session', JSON.stringify(sessionData));
            toast({ title: "Login Successful" });
            router.push('/rider');
        } else { // New user, create a document
            const newUserRef = doc(db, "users", user.uid);
            await setDoc(newUserRef, {
                name: user.displayName,
                email: user.email,
                phone: '', // No phone from Google
                gender: 'other', // Default gender
                role: 'rider',
                createdAt: serverTimestamp(),
                isOnline: false,
            });
            localStorage.setItem('cabzi-session', JSON.stringify({ role: 'rider', email: user.email, name: user.displayName, userId: user.uid }));
            toast({ title: "Welcome to Cabzi!", description: "Your account has been created." });
            router.push('/rider');
        }

    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Google Sign-In Failed', description: error.message });
    } finally {
        setIsLoading(false);
    }
  }
  
  const getPageTitle = () => {
      if (roleFromQuery === 'admin') return 'Admin Panel';
      if (roleFromQuery === 'doctor') return 'Doctor Login';
      if (step === 'details') return 'Create Your Account';
      if (step === 'otp') return 'Verify OTP';
      if (roleFromQuery === 'rider') return 'Rider Login or Signup';
      return 'Partner Login';
  };
  
  const getPageDescription = () => {
      if (roleFromQuery === 'admin') return 'Please enter your credentials to access the panel.';
      if (roleFromQuery === 'doctor') return 'Enter your Doctor ID and password provided by the hospital.';
      if (step === 'details') return 'Just one more step! Please provide your details.';
      if (step === 'otp') return `Enter the OTP sent to +91 ${loginInput}`;
      return `Enter your email or phone number to log in or sign up as a ${getRoleDescription()}.`;
  };

  const renderAdminForm = () => (
    <form onSubmit={handleAdminLogin} className="space-y-4">
        <div className="space-y-2">
            <Label htmlFor="adminId">Admin ID</Label>
            <Input id="adminId" name="adminId" type="email" placeholder="owner@cabzi.com" required value={partnerIdInput} onChange={(e) => setPartnerIdInput(e.target.value)} disabled={isLoading} />
        </div>
        <div className="space-y-2">
            <Label htmlFor="adminPassword">Password</Label>
            <Input id="adminPassword" name="adminPassword" type="password" placeholder="••••••••" required value={partnerPassword} onChange={(e) => setPartnerPassword(e.target.value)} disabled={isLoading}/>
        </div>
        <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Verifying..." : 'Login'}
        </Button>
    </form>
  );

  const renderDoctorLoginForm = () => (
    <form onSubmit={handlePartnerLogin} className="space-y-4">
        <div className="space-y-2">
            <Label htmlFor="partnerId">Doctor ID</Label>
            <Input id="partnerId" name="partnerId" placeholder="e.g., CZD-1234" required value={partnerIdInput} onChange={(e) => setPartnerIdInput(e.target.value)} disabled={isLoading} />
        </div>
        <div className="space-y-2">
            <Label htmlFor="partnerPassword">Password</Label>
            <Input id="partnerPassword" name="partnerPassword" type="password" placeholder="••••••••" required value={partnerPassword} onChange={(e) => setPartnerPassword(e.target.value)} disabled={isLoading}/>
        </div>
        <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Verifying..." : 'Login'}
        </Button>
    </form>
  )

  const renderLoginForm = () => (
    <div className="space-y-4">
      <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div className="space-y-2">
              <Label htmlFor="loginInput">Email or Phone</Label>
              <div className="relative">
                  {inputType === 'phone' && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">+91</span>}
                  <Input 
                      id="loginInput" 
                      name="loginInput" 
                      type="text"
                      placeholder={inputType === 'email' ? "priya@example.com" : "9876543210"} 
                      required 
                      value={loginInput} 
                      onChange={handleInputChange} 
                      disabled={isLoading} 
                      className={inputType === 'phone' ? 'pl-10' : ''}
                  />
              </div>
          </div>
          {inputType === 'email' && (
              <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" name="password" type="password" placeholder="••••••••" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} />
              </div>
          )}
          <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Please wait..." : 'Continue'}
          </Button>
      </form>
      {roleFromQuery === 'rider' && (
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

  const renderOtpForm = () => (
    <form onSubmit={handleOtpSubmit} className="space-y-4">
        <div className="space-y-2">
            <Label htmlFor="otp">Enter OTP</Label>
            <Input id="otp" name="otp" type="tel" maxLength={6} placeholder="123456" required value={otp} onChange={(e) => setOtp(e.target.value)} disabled={isLoading} autoFocus />
        </div>
        <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Verifying..." : 'Verify & Continue'}
        </Button>
         <Button variant="link" className="w-full" onClick={() => setStep('login')} disabled={isLoading}>
            Back
        </Button>
    </form>
  );

  const renderDetailsForm = () => (
    <form onSubmit={handleDetailsSubmit} className="space-y-4">
        <div className="space-y-2">
            <Label>Email / Phone</Label>
            <Input value={loginInput} disabled />
        </div>
        {inputType === 'email' && !password && (
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
    </form>
  );
  
  const getRoleDescription = () => {
    if (roleFromQuery === 'driver') return t('role_partner')
    if (roleFromQuery === 'admin') return t('role_admin')
    if (roleFromQuery === 'doctor') return 'Doctor'
    return t('role_rider')
  }

  const renderContent = () => {
    if (roleFromQuery === 'admin') return renderAdminForm();
    if (roleFromQuery === 'doctor') return renderDoctorLoginForm();
    
    switch(step) {
        case 'login':
            return renderLoginForm();
        case 'otp':
            return renderOtpForm();
        case 'details':
            return renderDetailsForm();
        default:
            return null;
    }
  }

  const getFooterLink = () => {
    if (roleFromQuery === 'rider') {
      return (
        <p>
        Want to partner with us?{' '}
        <Link href="/login?role=driver" className="underline text-primary" onClick={() => { setStep('login'); setLoginInput(''); setPassword(''); }}>
            Login as a Partner
        </Link>
        </p>
      )
    }
    if (['driver', 'mechanic', 'cure', 'doctor'].includes(roleFromQuery)) {
      return (
          <div className="space-y-2">
              <p>
                Looking for a ride?{' '}
                <Link href="/login?role=rider" className="underline text-primary" onClick={() => { setStep('login'); setLoginInput(''); setPassword(''); }}>
                  Login as a Rider
                </Link>
              </p>
              {roleFromQuery !== 'doctor' && (
                <p>
                New to Cabzi?{' '}
                <Link href="/partner-hub" className="underline text-primary">
                    Onboard as a Partner
                </Link>
                </p>
              )}
          </div>
      );
    }
    return null
  }
  
  if (!isMounted) return null;

  return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-muted/40">
          <div ref={recaptchaContainerRef}></div>
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
                {renderContent()}
                {roleFromQuery !== 'admin' && step === 'login' && (
                    <div className="mt-4 text-center text-sm text-muted-foreground">
                        {getFooterLink()}
                         <p className="mt-2">
                            <Link href="/login?role=admin" className="text-xs underline" onClick={() => setStep('login')}>
                                Admin Login
                            </Link>
                        </p>
                    </div>
                )}
            </CardContent>
          </Card>
      </div>
  );
}
