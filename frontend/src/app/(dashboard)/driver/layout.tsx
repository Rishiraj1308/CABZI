
'use client'

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, LogOut, Sun, Moon, Wrench, Radio, Landmark, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
import BrandLogo from '@/components/shared/brand-logo'
import { useTheme } from 'next-themes'
import { useFirebase } from '@/lib/firebase/client-provider'
import { doc, updateDoc, serverTimestamp, type DocumentReference, onSnapshot, GeoPoint } from 'firebase/firestore'
import { Badge } from '@/components/ui/badge'
import { NotificationsProvider } from '@/context/NotificationContext'
import { Skeleton } from '@/components/ui/skeleton'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useDriverLocation } from '@/features/driver/hooks/useDriverLocation'


interface PartnerData {
    id: string;
    isCabziPinkPartner?: boolean;
    name: string;
    isOnline?: boolean;
    currentLocation?: GeoPoint;
    vehicleNumber?: string;
    partnerId?: string;
    photoUrl?: string;
    [key: string]: any;
}

// 1. Create the Context
interface DriverContextType {
    partnerData: PartnerData | null;
    isLoading: boolean;
}

const DriverContext = createContext<DriverContextType | null>(null);

// Custom hook to use the context
export const useDriver = () => {
    const context = useContext(DriverContext);
    if (!context) {
        throw new Error('useDriver must be used within a DriverProvider');
    }
    return context;
}

function DriverProvider({ children }: { children: React.ReactNode }) {
    const [partnerData, setPartnerData] = useState<PartnerData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { db, user, isUserLoading: isAuthLoading } = useFirebase();
    const router = useRouter();
    const pathname = usePathname();
    
    useEffect(() => {
        if (isAuthLoading) return; // Wait until Firebase Auth is initialized

        const isOnboardingPage = pathname.includes('/driver/onboarding');

        if (!user) {
            if (!isOnboardingPage) router.replace('/login?role=driver');
            setIsLoading(false);
            return;
        }

        let unsubscribe: (() => void) | null = null;
        let isSubscribed = true;

        const sessionString = localStorage.getItem('curocity-session');
        if (!sessionString) {
             if (!isOnboardingPage) router.replace('/login?role=driver');
             setIsLoading(false);
             return;
        }

        const sessionData = JSON.parse(sessionString);
        if (!sessionData.role || sessionData.role !== 'driver' || !sessionData.partnerId) {
             if (!isOnboardingPage) router.replace('/login?role=driver');
             setIsLoading(false);
             return;
        }

        const partnerDocRef = doc(db, 'pathPartners', sessionData.partnerId);
        unsubscribe = onSnapshot(partnerDocRef, (docSnap) => {
            if (!isSubscribed) return;
            if (docSnap.exists()) {
                setPartnerData({ id: docSnap.id, ...docSnap.data() } as PartnerData);
            } else {
                 if (!isOnboardingPage) router.replace('/login?role=driver');
            }
            setIsLoading(false);
        }, (error) => {
            console.error("Driver data listener error:", error);
            if (!isOnboardingPage) router.replace('/login?role=driver');
            setIsLoading(false);
        });
      
        return () => {
            isSubscribed = false;
            if (unsubscribe) unsubscribe();
        };
    }, [isAuthLoading, user, db, pathname, router]);

    return (
        <DriverContext.Provider value={{ partnerData, isLoading }}>
            {children}
        </DriverContext.Provider>
    );
}


const navItems = [
  { href: '/driver', label: 'Patrol Dashboard', icon: LayoutDashboard },
  { href: '/driver/wallet', label: 'Curocity Bank', icon: Landmark },
  { href: '/driver/support', label: 'On-Duty Support', icon: Radio },
]

function DriverNav() {
  const pathname = usePathname()
  
  return (
    <nav className="grid items-start gap-1 px-4 text-sm font-medium">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:bg-muted hover:text-primary',
            pathname === item.href && 'bg-muted text-primary font-semibold'
          )}
        >
            <item.icon className="h-4 w-4" />
            {item.label}
        </Link>
      ))}
    </nav>
  );
}

function ThemeToggle() {
    const { setTheme } = useTheme();
    return (
       <DropdownMenu>
        <DropdownMenuTrigger asChild>
           <Button variant="outline" size="icon" className="h-9 w-9">
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
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

function DriverLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { auth, db } = useFirebase();
  const { partnerData, isLoading } = useDriver();
  useDriverLocation();
  
  const handleLogout = useCallback(() => {
    if (partnerData?.id && db) {
        updateDoc(doc(db, 'pathPartners', partnerData.id), { isOnline: false, lastSeen: serverTimestamp() }).catch(error => {
            console.warn("Failed to update status on logout (non-critical):", error);
        });
    }
    if (auth) auth.signOut();
    localStorage.removeItem('curocity-session');
    toast.success('Logged Out');
    router.push('/');
  }, [auth, db, partnerData?.id, router]);
  
  if (pathname.includes('/onboarding')) {
    return <>{children}</>
  }
  
  if (isLoading) {
    return (
        <div className="grid min-h-screen w-full lg:grid-cols-[280px_1fr]">
            <div className="hidden border-r bg-muted/40 lg:block">
                 <div className="flex h-full max-h-screen flex-col gap-2">
                    <div className="flex h-[60px] items-center border-b px-6"><Skeleton className="h-8 w-32" /></div>
                     <div className="flex-1 overflow-auto py-2"><div className="p-4 space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div></div>
                 </div>
            </div>
             <div className="flex flex-col">
                <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-6">
                    <Skeleton className="h-8 w-8 rounded-full lg:hidden" />
                    <Skeleton className="h-6 w-48" />
                     <div className="ml-auto flex items-center gap-2"><Skeleton className="h-8 w-8 rounded-full" /></div>
                </header>
                <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6"><Skeleton className="h-full w-full rounded-lg" /></main>
            </div>
        </div>
    )
  }

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('');

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-muted/40 lg:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-[60px] items-center border-b px-6">
            <Link href="/driver" className="flex items-center gap-2 font-semibold">
                <BrandLogo />
            </Link>
          </div>
          <div className="flex-1 overflow-auto py-2">
            <DriverNav />
          </div>
          <div className="mt-auto p-4">
              <Card>
                  <CardHeader className="pb-4">
                      <CardTitle>Need Assistance?</CardTitle>
                      <CardDescription>Request on-duty support for vehicle or other issues.</CardDescription>
                  </CardHeader>
                  <CardContent>
                      <Button size="sm" className="w-full" asChild>
                          <Link href="/user/resq">
                              <Wrench className="w-4 h-4 mr-2" /> Request ResQ
                          </Link>
                      </Button>
                  </CardContent>
              </Card>
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0 lg:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col p-0">
               <SheetHeader className="h-[60px] flex flex-row items-center border-b px-6">
                   <Link href="/driver" className="flex items-center gap-2 font-semibold">
                       <BrandLogo />
                    </Link>
               </SheetHeader>
               <div className="pt-4"><DriverNav/></div>
               <div className="mt-auto p-4 border-t">
                  <Button size="sm" className="w-full" asChild>
                       <Link href="/user/resq">
                          <Wrench className="w-4 h-4 mr-2" /> Request ResQ
                      </Link>
                  </Button>
                </div>
            </SheetContent>
          </Sheet>
          
          <div className="w-full flex-1">
             <h1 className="font-semibold text-lg">Unit: {partnerData?.partnerId}</h1>
          </div>

          <div className="flex items-center gap-4">
             <Badge className={cn("text-xs", partnerData?.isOnline ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800")}>
                {partnerData?.isOnline ? "ONLINE" : "OFFLINE"}
             </Badge>
             <ThemeToggle />
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="icon" className="rounded-full">
                    <Avatar className="h-8 w-8">
                       <AvatarImage src={partnerData?.photoUrl || undefined} alt={partnerData?.name || 'Driver'} />
                       <AvatarFallback>{getInitials(partnerData?.name || 'D')}</AvatarFallback>
                    </Avatar>
                    <span className="sr-only">Toggle user menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{partnerData?.name}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push('/driver/profile')}>Profile</DropdownMenuItem>
                  <DropdownMenuSeparator/>
                  <AlertDialog>
                      <AlertDialogTrigger asChild>
                         <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive focus:text-destructive">
                            <LogOut className="mr-2 h-4 w-4" /> Sign Out
                         </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Confirm Sign Out</AlertDialogTitle><AlertDialogDescription>Are you sure you want to end your shift?</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleLogout} className="bg-destructive hover:bg-destructive/90">Sign Out</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
            {children}
        </main>
      </div>
    </div>
  );
}

export default function DriverLayout({ children }: { children: React.ReactNode }) {
    return (
        <NotificationsProvider>
          <DriverProvider>
            <DriverLayoutContent>{children}</DriverLayoutContent>
          </DriverProvider>
        </NotificationsProvider>
    );
}
