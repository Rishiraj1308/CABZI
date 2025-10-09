
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
import { Sun, Moon, Globe, LogOut, Laptop, Smartphone, KeyRound } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { db, auth } from '@/lib/firebase'
import { collection, query, where, getDocs, setDoc, doc, serverTimestamp, updateDoc, addDoc, Timestamp } from 'firebase/firestore'
import { signInWithPhoneNumber, RecaptchaVerifier, type ConfirmationResult } from 'firebase/auth'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

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
  const role = searchParams.get('role') || 'rider'

  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState<'phone' | 'details' | 'otp' | 'password'>('phone');
  const [phone, setPhone] = useState(searchParams.get('phone') || '')
  const [otp, setOtp] = useState('')
  const [name, setName] = useState('')
  const [gender, setGender] = useState('')
  const [adminId, setAdminId] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [partnerType, setPartnerType] = useState<'driver' | 'mechanic' | 'cure' | 'ambulance_driver' | null>(null);
  const [isAlreadyLoggedIn, setIsAlreadyLoggedIn] = useState<any>(null);
  const [password, setPassword] = useState('');
  const [loginId, setLoginId] = useState('');
  const [ambulanceDriverData, setAmbulanceDriverData] = useState<any>(null);
  const [isPartnerId, setIsPartnerId] = useState(false);
  
  const handleAdminLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const user = MOCK_ADMIN_USERS.find(u => u.id === adminId && u.password === adminPassword);

    if (user) {
        localStorage.setItem('cabzi-session', JSON.stringify({ role: 'admin', phone: '', name: user.name, adminRole: user.role }));
        toast({ title: t('toast_login_success_title'), description: `Welcome, ${user.role}!`});
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
  
  const handleLoginIdChange = (value: string) => {
    setLoginId(value);
    if (/\D/.test(value)) {
        setIsPartnerId(true);
    } else {
        setIsPartnerId(false);
    }
  };

  const sendOtp = async (phoneNumber: string) => {
    setIsLoading(true);
    if (!auth || !recaptchaContainerRef.current) {
        toast({ variant: 'destructive', title: 'Error', description: 'Authentication service not ready.'})
        setIsLoading(false);
        return;
    }
    try {
        // @ts-ignore
        if (window.recaptchaVerifier) {
          // @ts-ignore
          window.recaptchaVerifier.clear();
        }
        const verifier = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
            'size': 'invisible', 
            'callback': () => {}
        });
        // @ts-ignore
        window.recaptchaVerifier = verifier;

        const fullPhoneNumber = `+91${phoneNumber}`;
        const result = await signInWithPhoneNumber(auth, fullPhoneNumber, verifier);
        
        setConfirmationResult(result);
        setStep('otp');
        toast({
          title: 'OTP Sent',
          description: "Use 123456 for any test number you've added in Firebase.",
          duration: 9000,
        })
    } catch(error) {
        console.error("Error sending OTP:", error);
        toast({
            variant: 'destructive',
            title: "Failed to Send OTP",
            description: "Please check number or try again. This might be due to a network issue or invalid test number.",
        });
    } finally {
        setIsLoading(false);
    }
  }

  const handlePhoneSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await sendOtp(phone);
  }


  const handleDetailsSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!name || !gender) {
          toast({ variant: 'destructive', title: "Incomplete Form", description: "Please fill out all fields."});
          return;
      }
    if (!db || !phone || !name || !gender) {
        toast({variant: 'destructive', title: 'Error', description: 'Missing required details to create an account.'});
        return;
    }
    setIsLoading(true);
    try {
        const newUserRef = doc(collection(db, "users"));
        
        await setDoc(newUserRef, {
            name,
            phone,
            gender,
            role: 'rider',
            createdAt: serverTimestamp(),
            isOnline: false,
        });
        
        localStorage.setItem('cabzi-session', JSON.stringify({ role: 'rider', phone, name, gender, userId: newUserRef.id }));
        
        toast({ title: t('toast_login_success_title'), description: t('toast_login_success_desc')});
        router.push('/rider');

    } catch (error) {
        console.error("Error creating new user:", error);
        localStorage.removeItem('cabzi-session');
        toast({variant: 'destructive', title: 'Registration Failed', description: 'Could not create your account.'});
    } finally {
        setIsLoading(false);
    }
  };


  const handleVerifyOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true);

    if (!confirmationResult || !db) {
        toast({ variant: 'destructive', title: "Verification Error", description: "Something went wrong. Please try again."});
        setIsLoading(false);
        return;
    }

    try {
        await confirmationResult.confirm(otp);
        
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("phone", "==", phone));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            setStep('details');
        } else {
            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data();
            localStorage.setItem('cabzi-session', JSON.stringify({ role: 'rider', phone, name: userData.name, gender: userData.gender, userId: userDoc.id }))
            toast({ title: t('toast_login_success_title'), description: t('toast_login_success_desc')})
            router.push('/rider');
        }
    
    } catch (error) {
        console.error("Error verifying OTP:", error);
        toast({
            variant: 'destructive',
            title: t('error_invalid_otp_title'),
            description: t('error_invalid_otp_desc'),
        });
    } finally {
        setIsLoading(false);
    }
  }

  const handlePartnerLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const currentLoginId = loginId; 

    if (!currentLoginId) {
        toast({ variant: 'destructive', title: "ID or Phone required", description: "Please enter your registered Phone Number or Partner ID." })
        return
    }
    if (!db) {
        toast({ variant: 'destructive', title: "Database Error", description: "Could not connect to database." })
        return
    }
    
    const isPhoneNumber = /^\d+$/.test(currentLoginId);
    
    if (!isPhoneNumber) {
        const driverQuery = query(collection(db, 'ambulanceDrivers'), where("partnerId", "==", currentLoginId));
        const driverSnapshot = await getDocs(driverQuery);
        if (!driverSnapshot.empty) {
            setAmbulanceDriverData(driverSnapshot.docs[0].data());
            setStep('password');
            return;
        } else {
            toast({ variant: 'destructive', title: "Invalid ID", description: "This Partner ID is not registered." });
            return;
        }
    }

    const [partnerSnapshot, mechanicSnapshot, cureSnapshot] = await Promise.all([
        getDocs(query(collection(db, "partners"), where("phone", "==", currentLoginId))),
        getDocs(query(collection(db, "mechanics"), where("phone", "==", currentLoginId))),
        getDocs(query(collection(db, "ambulances"), where("phone", "==", currentLoginId))),
    ]);

    let partnerDoc: any;
    let foundPartnerType: 'driver' | 'mechanic' | 'cure' | null = null;
    
    if(!partnerSnapshot.empty) {
        partnerDoc = partnerSnapshot.docs[0];
        foundPartnerType = 'driver';
    } else if(!mechanicSnapshot.empty) {
        partnerDoc = mechanicSnapshot.docs[0];
        foundPartnerType = 'mechanic';
    } else if(!cureSnapshot.empty) {
        partnerDoc = cureSnapshot.docs[0];
        foundPartnerType = 'cure';
    }

    if (!partnerDoc || !foundPartnerType) {
        toast({
            variant: 'destructive',
            title: "Partner Not Found",
            description: "This phone number is not registered. Please onboard first.",
        })
        return;
    }
    
    setPhone(currentLoginId);
    setPartnerType(foundPartnerType);
    
    const partnerData = partnerDoc.data();
    if (partnerData.status === 'pending_verification') {
        toast({ variant: 'destructive', title: 'Account Pending Approval', description: 'Your application is under review. Please wait for admin approval.' });
        return;
    }
    
    if (partnerData.status === 'suspended') {
        const suspensionEndDate = (partnerData.suspensionEndDate as Timestamp)?.toDate();
        if (suspensionEndDate && suspensionEndDate > new Date()) {
            toast({
                variant: 'destructive',
                title: 'Account Suspended',
                description: `Your account is temporarily blocked due to a policy violation. It will be unblocked on ${suspensionEndDate.toLocaleDateString()}.`,
                duration: 9000,
            });
            return;
        } else {
            await updateDoc(partnerDoc.ref, { status: 'verified', suspensionEndDate: null });
        }
    }
    
    if (partnerData.isLoggedIn) {
        setIsAlreadyLoggedIn({
            device: partnerData.lastLoginDevice || 'an unknown device',
            time: partnerData.lastLoginTimestamp?.toDate().toLocaleString() || 'recently'
        });
        return;
    }


    await sendOtp(currentLoginId);
  }

  const handleAmbulanceDriverLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    if (password === ambulanceDriverData.password) {
        const sessionData = {
            role: 'ambulance_driver',
            phone: ambulanceDriverData.phone,
            name: ambulanceDriverData.name,
            partnerId: ambulanceDriverData.partnerId,
            hospitalId: ambulanceDriverData.hospitalId,
        };
        await updateDoc(doc(db, "ambulanceDrivers", ambulanceDriverData.id), {
            isLoggedIn: true,
            lastLoginTimestamp: serverTimestamp(),
            lastLoginDevice: navigator.userAgent
        });
        localStorage.setItem('cabzi-ambulance-session', JSON.stringify(sessionData));
        toast({ title: 'Login Successful', description: `Welcome, ${ambulanceDriverData.name}!` });
        router.push('/ambulance');
    } else {
        toast({ variant: 'destructive', title: 'Incorrect Password', description: 'Please check your password and try again.' });
    }
    setIsLoading(false);
  }
  
  const handlePartnerOtpVerify = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    if (!confirmationResult || !db || !partnerType) {
        setIsLoading(false);
        return;
    }
    
    try {
        await confirmationResult.confirm(otp);
        
        let sessionKey: string;
        let redirectPath: string;
        let collectionName: string;

        switch(partnerType) {
            case 'driver':
                collectionName = 'partners';
                sessionKey = 'cabzi-session';
                redirectPath = '/driver';
                break;
            case 'mechanic':
                collectionName = 'mechanics';
                sessionKey = 'cabzi-resq-session';
                redirectPath = '/mechanic';
                break;
            case 'cure':
                collectionName = 'ambulances';
                sessionKey = 'cabzi-cure-session';
                redirectPath = '/cure';
                break;
            case 'ambulance_driver':
                throw new Error("Ambulance driver trying OTP flow.");
            default:
                throw new Error("Invalid partner type during OTP verification.");
        }


        const q = query(collection(db, collectionName), where("phone", "==", phone));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            throw new Error("Partner not found after OTP verification.");
        }

        const partnerDoc = querySnapshot.docs[0];
        const partnerData = partnerDoc.data();
        const sessionData: any = {
            role: partnerType,
            phone,
            name: partnerData.name,
            partnerId: partnerDoc.id,
        };
        
        await updateDoc(doc(db, collectionName, partnerDoc.id), {
            isLoggedIn: true,
            lastLoginTimestamp: serverTimestamp(),
            lastLoginDevice: navigator.userAgent
        });

        localStorage.setItem(sessionKey, JSON.stringify(sessionData))
        toast({ title: t('toast_login_success_title'), description: t('toast_login_success_desc')})
        router.push(redirectPath);

    } catch (error) {
        console.error("Error during partner login:", error);
        toast({ variant: 'destructive', title: t('error_invalid_otp_title') });
    } finally {
        setIsLoading(false);
    }
  }


  const getRoleDescription = () => {
    if (role === 'driver') return t('role_partner')
    if (role === 'admin') return t('role_admin')
    return t('role_rider')
  }

  const getFooterLink = () => {
    if (role === 'rider') {
      return (
        <p>
        Want to partner with us?{' '}
        <Link href="/login?role=driver" className="underline text-primary" onClick={() => setStep('phone')}>
            Login as a Partner
        </Link>
        </p>
      )
    }
    if (role === 'driver') {
      return (
          <div className="space-y-2">
              <p>
                {t('login_footer_looking_for_ride')}{' '}
                <Link
                    href="/login?role=rider"
                    className="underline text-primary"
                    onClick={() => setStep('phone')}
                    >
                  {t('login_footer_login_as_rider')}
                </Link>
              </p>
              <p>
               {t('login_footer_new_to_cabzi')}{' '}
               <Link href="/partner-hub" className="underline text-primary">
                 {t('login_footer_onboard_as_partner')}
               </Link>
             </p>
          </div>
      );
    }
    return null
  }
  
  const getPageTitle = () => {
      if (role === 'admin') return 'Admin Panel'
      if (step === 'otp') return 'Verify OTP'
      if (step === 'details') return 'Create Your Account'
      if (step === 'password') return 'Enter Password'
      if (role === 'rider') return 'Rider Login or Signup'
      return t('login_title_welcome_back')
  }
  
  const getPageDescription = () => {
      if (role === 'admin') return 'Please enter your credentials to access the panel.'
      if (step === 'otp') return `${t('login_desc_enter_otp')} ${isPartnerId ? loginId : `+91${phone}`}.`
      if (step === 'details') return 'Your number is verified! Please provide your details to create an account.'
       if (step === 'password') return `Welcome, ${ambulanceDriverData.name}. Please enter your password to continue.`
      return `Enter your mobile number to log in or sign up as a ${getRoleDescription()}.`
  }

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
  )

  const renderRiderForm = () => {
    if (step === 'phone') {
        return (
            <form onSubmit={handlePhoneSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="phone">{t('form_label_mobile_number')}</Label>
                     <div className="flex items-center gap-0 rounded-md border border-input focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                        <span className="pl-3 text-muted-foreground text-sm">+91</span>
                        <Input id="phone" name="phone" type="tel" maxLength={10} placeholder="12345 67890" required value={phone} onChange={(e) => setPhone(e.target.value.replace(/\\D/g, ''))} readOnly={!!searchParams.get('phone')} disabled={isLoading} className="border-0 h-9 focus-visible:ring-0 focus-visible:ring-offset-0 flex-1" />
                    </div>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Sending OTP..." : 'Continue'}
                </Button>
            </form>
        );
    }
    if (step === 'details') {
        return (
            <form onSubmit={handleDetailsSubmit} className="space-y-4">
                 <div className="space-y-2">
                    <Label htmlFor="phone">Mobile Number</Label>
                    <Input id="phone" value={`+91 ${phone}`} disabled />
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
                    {isLoading ? "Creating Account..." : "Create Account & Login"}
                </Button>
            </form>
        )
    }
    if (step === 'otp') {
         return (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="otp">{t('form_label_enter_otp')}</Label>
                    <Input id="otp" name="otp" type="text" inputMode="numeric" maxLength={6} placeholder="123456" required value={otp} onChange={(e) => setOtp(e.target.value)} disabled={isLoading} autoFocus />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Verifying..." : t('button_verify_login')}
                </Button>
                <Button variant="link" className="w-full" onClick={() => setStep('phone')} disabled={isLoading}>
                    {t('button_back')}
                </Button>
            </form>
         )
    }
  }
  
  const renderPartnerForm = () => {
    if (step === 'phone') {
      return (
        <form onSubmit={handlePartnerLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="loginId">Registered Phone / Partner ID</Label>
             <div className="flex items-center gap-0 rounded-md border border-input focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                {!isPartnerId && <span className="pl-3 text-muted-foreground text-sm">+91</span>}
                <Input id="loginId" name="loginId" type="text" placeholder="Enter Phone or Partner ID" required value={loginId} onChange={(e) => handleLoginIdChange(e.target.value)} disabled={isLoading} className="border-0 h-9 focus-visible:ring-0 focus-visible:ring-offset-0 flex-1" />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Verifying..." : "Continue"}
          </Button>
        </form>
      );
    }
    if (step === 'otp') {
      return (
        <form onSubmit={handlePartnerOtpVerify} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="otp">{t('form_label_enter_otp')}</Label>
            <Input id="otp" name="otp" type="text" inputMode="numeric" maxLength={6} placeholder="123456" required value={otp} onChange={(e) => setOtp(e.target.value)} disabled={isLoading} />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Verifying..." : t('button_verify_login')}
          </Button>
           <Button variant="link" className="w-full" onClick={() => setStep('phone')} disabled={isLoading}>
              {t('button_back')}
          </Button>
        </form>
      );
    }
    if (step === 'password') {
      return (
         <form onSubmit={handleAmbulanceDriverLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
                <Input id="password" type="password" placeholder="••••••••" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} className="pl-10"/>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Logging In..." : 'Login'}
          </Button>
           <Button variant="link" className="w-full" onClick={() => { setStep('phone'); setAmbulanceDriverData(null); }} disabled={isLoading}>
              {t('button_back')}
          </Button>
        </form>
      )
    }
  };

  return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-muted/40">
          <div className="absolute top-4 right-4 flex items-center gap-2">
              <LanguageToggle />
              <ThemeToggle />
          </div>
          <div ref={recaptchaContainerRef}></div>
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
                {role === 'admin' && renderAdminForm()}
                {role === 'rider' && renderRiderForm()}
                {role === 'driver' && renderPartnerForm()}
                <div className="mt-4 text-center text-sm text-muted-foreground">
                    {getFooterLink()}
                    {role !== 'admin' && (
                        <p className="mt-2">
                            <Link href="/login?role=admin" className="text-xs underline" onClick={() => setStep('phone')}>
                                Admin Login
                            </Link>
                        </p>
                    )}
                </div>
            </CardContent>
          </Card>
          <AlertDialog open={!!isAlreadyLoggedIn} onOpenChange={(open) => !open && setIsAlreadyLoggedIn(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Already Logged In</AlertDialogTitle>
                    <AlertDialogDescription>
                        This account is already active on another device.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="p-4 bg-muted rounded-lg space-y-2">
                    <div className="flex items-center gap-3">
                        {isAlreadyLoggedIn?.device?.toLowerCase().includes('mobile') ? 
                            <Smartphone className="w-8 h-8 text-muted-foreground" /> : 
                            <Laptop className="w-8 h-8 text-muted-foreground" />
                        }
                        <div>
                            <p className="font-semibold text-sm">{isAlreadyLoggedIn?.device}</p>
                            <p className="text-xs text-muted-foreground">Last active: {isAlreadyLoggedIn?.time}</p>
                        </div>
                    </div>
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => { setIsAlreadyLoggedIn(null); sendOtp(loginId); }}>
                        Logout & Continue
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
      </div>
  );
}
