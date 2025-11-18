
'use client'

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, LogOut, Sun, Moon, Bell, Ambulance, NotebookText, User, PanelLeft, History, Gem, Landmark, Stethoscope, BarChart, ShieldCheck, Users as UsersIcon, Hospital } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Toaster } from 'sonner'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { toast } from 'sonner'
import BrandLogo from '@/components/shared/brand-logo'
import { useTheme } from 'next-themes'
import { useDb, useAuth } from '@/lib/firebase/client-provider'
import { doc, onSnapshot, updateDoc } from 'firebase/firestore'
import { Skeleton } from '@/components/ui/skeleton'

// Define the shape of the partner data and context
interface PartnerData {
    id: string;
    name: string;
    phone: string;
    isErFull: boolean;
    totalBeds?: number;
    bedsOccupied?: number;
    location?: any;
    isOnline?: boolean;
    businessType?: string;
    clinicType?: string;
}

interface CureContextType {
    partnerData: PartnerData | null;
    isLoading: boolean;
}

// Create the context
const CureContext = createContext<CureContextType | null>(null);

// Create a custom hook to use the context
export const useCurePartner = () => {
    const context = useContext(CureContext);
    if (!context) {
        throw new Error('useCurePartner must be used within a CureLayout');
    }
    return context;
}

function ThemeToggle() {
    const { setTheme } = useTheme()
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
               <Button variant="outline" size="icon">
                <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
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

function CureNav({ navItems }: { navItems: any[] }) {
  const pathname = usePathname();
  return (
    <nav className="grid items-start gap-1 px-4 text-sm font-medium md:flex md:flex-row md:items-center md:gap-5 md:px-0">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary md:p-0',
            pathname === item.href && 'text-primary'
          )}
          passHref
        >
            <item.icon className="h-4 w-4 md:hidden" />
            {item.label}
        </Link>
      ))}
    </nav>
  );
}

export default function CureLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [partnerData, setPartnerData] = useState<PartnerData | null>(null);
  const db = useDb();
  const auth = useAuth();
  const [navItems, setNavItems] = useState<any[]>([]);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  
  const handleLogout = useCallback(() => {
    if (auth) auth.signOut();
    localStorage.removeItem('curocity-cure-session');
    localStorage.removeItem('curocity-session');
    toast.success('Logged Out', {
        description: 'You have been successfully logged out.'
    });
    router.push('/');
  }, [auth, router]);

  useEffect(() => {
    if (!db) return;

    const isOnboardingPage = pathname.includes('/cure/onboarding');

    const sessionString = localStorage.getItem('curocity-cure-session');
    if (!sessionString) {
      if (!isOnboardingPage) router.replace('/partner-login');
      setIsSessionLoading(false);
      return;
    }

    let unsubPartner: (() => void) | null = null;
    let isSubscribed = true;

    try {
      const sessionData = JSON.parse(sessionString);
      if (!sessionData.role || sessionData.role !== 'cure' || !sessionData.partnerId) {
        if (!isOnboardingPage) handleLogout();
        setIsSessionLoading(false);
        return;
      }

      const partnerRef = doc(db, 'curePartners', sessionData.partnerId);
      unsubPartner = onSnapshot(partnerRef, (docSnap) => {
        if (!isSubscribed) return;
        if (docSnap.exists()) {
          const data = docSnap.data();
          const partner: PartnerData = { id: docSnap.id, ...data } as PartnerData;
          setPartnerData(partner);

          const isHospital = partner.businessType?.toLowerCase().includes('hospital');
          const menu = isHospital
            ? [
                { href: '/cure', label: 'Mission Control', icon: LayoutDashboard },
                { href: '/cure/cases', label: 'Case History', icon: History },
                { href: '/cure/insurance', label: 'Insurance', icon: ShieldCheck },
                { href: '/cure/billing', label: 'Billing', icon: Landmark },
                { href: '/cure/analytics', label: 'Analytics', icon: BarChart },
                { href: '/cure/subscription', label: 'Subscription', icon: Gem },
              ]
            : [
                { href: '/cure', label: 'Dashboard', icon: LayoutDashboard },
                { href: '/cure/billing', label: 'Billing', icon: Landmark },
                { href: '/cure/subscription', label: 'Subscription', icon: Gem },
              ];
          setNavItems(menu);
        } else {
          if (!isOnboardingPage) handleLogout();
        }
        setIsSessionLoading(false);
      }, (error) => {
        console.error("CureLayout onSnapshot error:", error);
        if (!isOnboardingPage) handleLogout();
        setIsSessionLoading(false);
      });
    } catch (e) {
      console.error("CureLayout session parsing error:", e);
      if (!isOnboardingPage) handleLogout();
      setIsSessionLoading(false);
    }
    
    return () => {
      isSubscribed = false;
      if (unsubPartner) unsubPartner();
    };
  }, [db, pathname, router, handleLogout]);

  
  if (pathname.includes('/cure/onboarding')) {
    return (
      <CureContext.Provider value={{ partnerData, isLoading: isSessionLoading }}>
        {children}
        <Toaster />
      </CureContext.Provider>
    )
  }

  if (isSessionLoading) {
    return (
      <div className="flex h-screen w-full flex-col">
        <header className="flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
          <Skeleton className="h-10 w-28" />
          <div className="ml-auto flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </header>
        <main className="flex-1 p-6">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-[calc(100vh-20rem)] w-full mt-6" />
        </main>
      </div>
    );
  }

  const getInitials = (name: string) => {
    if (!name) return 'C';
    const names = name.split(' ');
    if (names.length > 1) {
      return names[0][0] + names[names.length - 1][0];
    }
    return name.substring(0, 2);
  }

  return (
    <CureContext.Provider value={{ partnerData, isLoading: isSessionLoading }}>
      <div className="flex min-h-screen w-full flex-col">
        <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-4 md:px-6 z-50">
          <nav className="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 lg:gap-6">
            <Link
              href="/"
              className="flex items-center gap-2 text-lg font-semibold md:text-base"
              passHref>
              <BrandLogo />
              <span className="ml-2 text-xs font-semibold px-2 py-1 rounded-full bg-red-500/20 text-red-600">Cure</span>
            </Link>
              <div className="w-px bg-border h-6 mx-2"></div>
              <CureNav navItems={navItems} />
          </nav>
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 md:hidden"
              >
                <PanelLeft className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0">
                <SheetHeader className="flex h-16 items-center border-b px-6">
                  <SheetTitle>
                      <Link href="/" className="flex items-center gap-2 font-semibold">
                          <BrandLogo />
                          <span className="ml-2 text-xs font-semibold px-2 py-1 rounded-full bg-red-500/20 text-red-600">Cure</span>
                      </Link>
                  </SheetTitle>
                </SheetHeader>
                <CureNav navItems={navItems} />
            </SheetContent>
          </Sheet>
          <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4 justify-end">
              <div className="ml-auto flex-1 sm:flex-initial"></div>
              <ThemeToggle/>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                      <AvatarImage src="https://placehold.co/40x40.png" alt={partnerData?.name} data-ai-hint="hospital building" />
                      <AvatarFallback>{getInitials(partnerData?.name || '').toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="sr-only">Toggle user menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/cure/profile')}>Profile</DropdownMenuItem>
                <DropdownMenuItem>Support</DropdownMenuItem>
                <DropdownMenuSeparator />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                        Logout
                      </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                      <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleLogout} className="bg-destructive hover:bg-destructive/90">
                              Logout
                          </AlertDialogAction>
                      </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            {children}
        </main>
        <Toaster />
      </div>
    </CureContext.Provider>
  );
}


    