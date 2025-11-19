
'use client'

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, LogOut, Sun, Moon, Wrench, MapPin, Map, Shield, Siren, Radio, UserCheck, Landmark, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
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
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'


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

    const handleLogout = useCallback(() => {
        const sessionString = localStorage.getItem('curocity-session');
        if (sessionString && db) {
            try {
                const sessionData = JSON.parse(sessionString);
                if (sessionData.partnerId) {
                    updateDoc(doc(db, 'pathPartners', sessionData.partnerId), { isOnline: false, lastSeen: serverTimestamp() }).catch(error => {
                        console.warn("Failed to update status on logout (non-critical):", error);
                    });
                }
            } catch (e) {
                console.error("Error parsing session on logout:", e);
            }
        }
        localStorage.removeItem('curocity-session');
        router.push('/');
    }, [db, router]);
    
    useEffect(() => {
        if (isAuthLoading || !db) return;

        const isOnboardingPage = pathname.includes('/driver/onboarding');

        if (!user) {
            if (!isOnboardingPage) router.replace('/login?role=driver');
            setIsLoading(false);
            return;
        }

        let unsubscribe: (() => void) | null = null;
        let isSubscribed = true;

        try {
            const sessionString = localStorage.getItem('curocity-session');
            if (!sessionString) {
                if (!isOnboardingPage) handleLogout();
                setIsLoading(false);
                return;
            }

            const sessionData = JSON.parse(sessionString);
            if (!sessionData.role || sessionData.role !== 'driver' || !sessionData.partnerId) {
                if (!isOnboardingPage) handleLogout();
                setIsLoading(false);
                return;
            }

            const partnerDocRef = doc(db, 'pathPartners', sessionData.partnerId);
            unsubscribe = onSnapshot(partnerDocRef, (docSnap) => {
                if (!isSubscribed) return;
                if (docSnap.exists()) {
                    setPartnerData({ id: docSnap.id, ...docSnap.data() } as PartnerData);
                } else {
                    if (!isOnboardingPage) handleLogout();
                }
                setIsLoading(false);
            }, (error) => {
                if (!isOnboardingPage) handleLogout();
                setIsLoading(false);
            });
        } catch (e) {
            if (!isOnboardingPage) handleLogout();
            setIsLoading(false);
        }
      
        return () => {
            isSubscribed = false;
            if (unsubscribe) unsubscribe();
        };
    }, [isAuthLoading, user, db, handleLogout, pathname, router]);

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
    const { theme, setTheme } = useTheme();
    return (
       <Button variant="outline" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="h-9 w-9">
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
        </Button>
    )
}

function DriverLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { auth, db } = useFirebase();
  const { partnerData, isLoading } = useDriver();
  
  const handleLogout = useCallback(() => {
    if (auth) auth.signOut();
    const sessionString = localStorage.getItem('curocity-session');
    if (sessionString && db) {
        try {
            const sessionData = JSON.parse(sessionString);
            if (sessionData.partnerId) {
                updateDoc(doc(db, 'pathPartners', sessionData.partnerId), { isOnline: false, lastSeen: serverTimestamp() });
            }
        } catch (e) {
            console.error("Error parsing session on logout:", e);
        }
    }
    
    localStorage.removeItem('curocity-session');
    
    if (theme === 'pink') setTheme('system');

    toast.success('Logged Out', {
        description: 'You have been successfully logged out.'
    });
    router.push('/');
  }, [auth, db, router, theme, setTheme]);

   useEffect(() => {
    let heartbeatInterval: NodeJS.Timeout | null = null;
    
    if (partnerData?.id && db && partnerData?.isOnline) { 
        heartbeatInterval = setInterval(() => {
            updateDoc(doc(db, 'pathPartners', partnerData.id), { lastSeen: serverTimestamp() }).catch(error => {
                console.warn("Heartbeat update failed (non-critical):", error);
            });
        }, 60000); 
    }
    
    return () => {
        if (heartbeatInterval) clearInterval(heartbeatInterval);
    }
  }, [partnerData, db]);
  
  
  if (pathname.includes('/onboarding')) {
    return <>{children}</>
  }
  
  if (isLoading) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-gray-900">
             <div className="grid min-h-screen w-full lg:grid-cols-[280px_1fr]">
                <div className="hidden border-r bg-gray-900/50 lg:block">
                     <div className="flex h-full max-h-screen flex-col gap-2">
                        <div className="flex h-[60px] items-center border-b px-6"><Skeleton className="h-8 w-32" /></div>
                         <div className="flex-1 overflow-auto py-2"><div className="p-4 space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div></div>
                     </div>
                </div>
                 <div className="flex flex-col">
                    <header className="flex h-14 items-center gap-4 border-b bg-gray-950 px-6">
                        <Skeleton className="h-8 w-8 rounded-full lg:hidden" />
                        <Skeleton className="h-6 w-48" />
                         <div className="ml-auto flex items-center gap-2"><Skeleton className="h-8 w-8 rounded-full" /></div>
                    </header>
                    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6"><Skeleton className="h-full w-full rounded-lg" /></main>
                </div>
            </div>
        </div>
    )
  }

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('');

  return (
    <div className={cn("grid min-h-screen w-full lg:grid-cols-[280px_1fr] dark bg-gray-950 text-gray-200")}>
      <div className="hidden border-r border-gray-800 bg-gray-900 lg:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-[60px] items-center border-b border-gray-800 px-6">
            <Link href="/driver" className="flex items-center gap-2 font-semibold text-white">
                <Shield className="h-6 w-6 text-blue-400"/>
                <span>Patrol System</span>
            </Link>
          </div>
          <div className="flex-1 overflow-auto py-2">
            <DriverNav />
          </div>
          <div className="mt-auto p-4 border-t border-gray-800">
              <Card className="bg-gray-800/50 border-gray-700">
                  <CardHeader className="p-3">
                      <CardTitle className="text-base">Need Assistance?</CardTitle>
                      <CardDescription className="text-xs">Request on-duty support for vehicle or other issues.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                      <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-500" asChild>
                          <Link href="/user/resq">
                            <Siren className="w-4 h-4 mr-2" /> Request ResQ
                          </Link>
                      </Button>
                  </CardContent>
              </Card>
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b border-gray-800 bg-gray-900/50 px-4 lg:h-[60px] lg:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0 lg:hidden bg-gray-800 border-gray-700 hover:bg-gray-700">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col bg-gray-900 border-gray-800 text-white p-0">
               <SheetHeader className="h-[60px] flex flex-row items-center border-b border-gray-800 px-6">
                   <Link href="/driver" className="flex items-center gap-2 font-semibold text-white">
                        <Shield className="h-6 w-6 text-blue-400"/>
                        <span>Patrol System</span>
                    </Link>
               </SheetHeader>
               <div className="pt-4"><DriverNav/></div>
               <div className="mt-auto p-4 border-t border-gray-800">
                  <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-500" asChild>
                      <Link href="/user/resq">
                        <Siren className="w-4 h-4 mr-2" /> Request ResQ
                      </Link>
                  </Button>
                </div>
            </SheetContent>
          </Sheet>
          
          <div className="w-full flex-1">
             <h1 className="font-semibold text-lg text-gray-300">Unit: {partnerData?.partnerId}</h1>
          </div>

          <div className="flex items-center gap-4">
             <Badge className={cn("text-xs", partnerData?.isOnline ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-gray-500/20 text-gray-400 border-gray-500/30")}>
                {partnerData?.isOnline ? "ON DUTY" : "OFF DUTY"}
             </Badge>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
                    <Avatar className="h-8 w-8">
                       <AvatarImage src={partnerData?.photoUrl || undefined} alt={partnerData?.name || 'Driver'} />
                       <AvatarFallback className="bg-gray-700 text-gray-300">{getInitials(partnerData?.name || 'D')}</AvatarFallback>
                    </Avatar>
                    <span className="sr-only">Toggle user menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-gray-900 border-gray-800 text-gray-200">
                  <DropdownMenuLabel>{partnerData?.name}</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-gray-800" />
                  <DropdownMenuItem onClick={() => router.push('/driver/profile')} className="focus:bg-gray-800"><UserCheck className="mr-2 h-4 w-4" /> Profile</DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-gray-800"/>
                  <AlertDialog>
                      <AlertDialogTrigger asChild>
                         <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-red-400 focus:bg-red-500/20 focus:text-red-400">
                            <LogOut className="mr-2 h-4 w-4" /> Sign Out
                         </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-gray-900 border-gray-800 text-gray-200">
                          <AlertDialogHeader><AlertDialogTitle>Confirm Sign Out</AlertDialogTitle><AlertDialogDescription className="text-gray-400">Are you sure you want to end your patrol session?</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel className="bg-gray-800 border-gray-700 hover:bg-gray-700">Cancel</AlertDialogCancel><AlertDialogAction onClick={handleLogout} className="bg-red-600 hover:bg-red-500">Sign Out</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6 bg-gray-950/50">
          <NotificationsProvider>
            {children}
          </NotificationsProvider>
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

    

    
