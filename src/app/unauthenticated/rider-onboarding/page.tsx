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
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth'

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
  const role = searchParams.get('role') || 'rider'

  const [step, setStep] = useState<'login' | 'details'>('login');
  const [email, setEmail] = useState(searchParams.get('email') || '')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [gender, setGender] = useState('')
  const [adminId, setAdminId] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

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

  const handleEmailSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    if (!auth || !db) {
        toast({ variant: 'destructive', title: 'Error', description: 'Firebase not initialized correctly.' });
        setIsLoading(false);
        return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      
      const q = query(collection(db, "users"), where("email", "==", email));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        const sessionData = { role, email, name: userData.name, gender: userData.gender, userId: userDoc.id };
        localStorage.setItem('cabzi-session', JSON.stringify(sessionData));
        
        toast({ title: "Login Successful", description: "Redirecting..." });
        
        // Redirect based on role
        switch(role) {
            case 'driver': router.push('/driver'); break;
            case 'mechanic': router.push('/mechanic'); break;
            case 'cure': router.push('/cure'); break;
            default: router.push('/rider');
        }
      } else {
        setStep('details');
      }
    } catch (error: any) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        if(role === 'rider') {
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


  const handleDetailsSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!name || !gender) {
          toast({ variant: 'destructive', title: "Incomplete Form", description: "Please provide your name and gender." });
          return;
      }
      if (!db || !auth || !email || !password) {
          toast({ variant: 'destructive', title: 'Error', description: 'Session details are missing. Please start over.' });
          return;
      }
      
      setIsLoading(true);
      try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const user = userCredential.user;

          const newUserRef = doc(db, "users", user.uid);
          await setDoc(newUserRef, {
              name,
              email,
              phone: '', // Phone is optional now
              gender,
              role: 'rider',
              createdAt: serverTimestamp(),
              isOnline: false,
          });
  
          localStorage.setItem('cabzi-session', JSON.stringify({ role: 'rider', email, name, gender, userId: user.uid }));
          toast({ title: "Account Created!", description: "Welcome to Cabzi! Redirecting...", className: "bg-green-600 text-white border-green-600" });
          router.push('/rider');
  
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
        <Link href="/login?role=driver" className="underline text-primary" onClick={() => setStep('login')}>
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
                <Link href="/login?role=rider" className="underline text-primary" onClick={() => setStep('login')}>
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
      if (step === 'details') return 'Create Your Account'
      if (role === 'rider') return 'Rider Login or Signup'
      return 'Partner Login'
  }
  
  const getPageDescription = () => {
      if (role === 'admin') return 'Please enter your credentials to access the panel.'
      if (step === 'details') return 'This email is new to us! Please provide your details to create an account.'
      return `Enter your email and password to log in or sign up as a ${getRoleDescription()}.`
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
    if (step === 'login') {
        return (
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
                    {isLoading ? "Verifying..." : 'Continue'}
                </Button>
            </form>
        );
    }
    if (step === 'details') {
        return (
            <form onSubmit={handleDetailsSubmit} className="space-y-4">
                 <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" value={email} disabled />
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
                 <Button variant="link" className="w-full" onClick={() => setStep('login')} disabled={isLoading}>
                    Back to Login
                </Button>
            </form>
        )
    }
  }
  
  // Partner form is now the same as rider form, using email/password
  const renderPartnerForm = () => {
     return (
        <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="email">Registered Email</Label>
                <Input id="email" name="email" type="email" placeholder="ramesh@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} />
            </div>
             <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" placeholder="••••••••" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Logging In..." : "Login"}
            </Button>
        </form>
      );
  };
  
  if (!isMounted) return null;

  return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-muted/40">
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
                {role === 'admin' && renderAdminForm()}
                {role === 'rider' && renderRiderForm()}
                {(role === 'driver' || role === 'mechanic' || role === 'cure') && renderPartnerForm()}
                <div className="mt-4 text-center text-sm text-muted-foreground">
                    {getFooterLink()}
                    {role !== 'admin' && (
                        <p className="mt-2">
                            <Link href="/login?role=admin" className="text-xs underline" onClick={() => setStep('login')}>
                                Admin Login
                            </Link>
                        </p>
                    )}
                </div>
            </CardContent>
          </Card>
          <div id="recaptcha-container"></div>
      </div>
  );
}