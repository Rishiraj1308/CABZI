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
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPhoneNumber, RecaptchaVerifier, type ConfirmationResult } from 'firebase/auth'

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

  const [adminId, setAdminId] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
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
            
            // This is the CRITICAL CHECK. Does the role we found match what the user is trying to log in as?
            const isRiderLogin = roleFromQuery === 'rider';
            const isPartnerLogin = ['driver', 'mechanic', 'cure'].includes(roleFromQuery);
            
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
            auth.signOut();
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
                  auth.signOut();
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
  
  const getPageTitle = () => {
      if (roleFromQuery === 'admin') return 'Admin Panel';
      if (step === 'details') return 'Create Your Account';
      if (step === 'otp') return 'Verify OTP';
      if (roleFromQuery === 'rider') return 'Rider Login or Signup';
      return 'Partner Login';
  };
  
  const getPageDescription = () => {
      if (roleFromQuery === 'admin') return 'Please enter your credentials to access the panel.';
      if (step === 'details') return 'Just one more step! Please provide your details.';
      if (step === 'otp') return `Enter the OTP sent to +91 ${loginInput}`;
      return `Enter your email or phone number to log in or sign up as a ${getRoleDescription()}.`;
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

  const renderLoginForm = () => (
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
    return t('role_rider')
  }

  const renderContent = () => {
    if (roleFromQuery === 'admin') return renderAdminForm();
    
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
    if (roleFromQuery === 'driver' || roleFromQuery === 'mechanic' || roleFromQuery === 'cure') {
      return (
          <div className="space-y-2">
              <p>
                Looking for a ride?{' '}
                <Link href="/login?role=rider" className="underline text-primary" onClick={() => { setStep('login'); setLoginInput(''); setPassword(''); }}>
                  Login as a Rider
                </Link>
              </p>
              <p>
               New to Cabzi?{' '}
               <Link href="/partner-hub" className="underline text-primary">
                 Onboard as a Partner
               </Link>
             </p>
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
