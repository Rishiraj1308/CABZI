
'use client'

import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Landmark, Gem, User, PanelLeft, LogOut, Sun, Moon, Wrench, MapPin, Map } from 'lucide-react'
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

interface PartnerData {
    id: string;
    isCabziPinkPartner?: boolean;
    name: string;
    isOnline?: boolean;
    currentLocation?: GeoPoint;
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
  { href: '/driver', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/driver/wallet', label: 'Curocity Bank', icon: Landmark },
  { href: '/driver/subscription', label: 'Subscription', icon: Gem },
  { href: '/driver/support', label: 'Support', icon: Wrench },
  { href: '/driver/profile', label: 'Profile', icon: User },
]

function DriverNav({ isPinkPartner }: { isPinkPartner: boolean }) {
  const pathname = usePathname()
  
  return (
    <nav className="grid items-start gap-1 px-4 text-sm font-medium">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:bg-muted hover:text-primary',
            pathname === item.href && (isPinkPartner ? 'bg-pink-100/50 text-pink-700 dark:text-pink-300 font-semibold' : 'bg-muted text-primary font-semibold')
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
              <DropdownMenuItem onClick={() => setTheme('pink')}>Pink</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('system')}>System</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

function LocationDisplay() {
    const { partnerData } = useDriver();
    const [locationAddress, setLocationAddress] = useState('Locating...');

    useEffect(() => {
        let isMounted = true;
        const getAddress = async (lat: number, lon: number) => {
            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14`);
                if (!response.ok || !isMounted) return;
                const data = await response.json();
                const address = data.address;
                const primaryLocation = address.suburb || address.neighbourhood || address.city || address.town || address.village;
                const secondaryLocation = address.city || address.state;

                if (isMounted) {
                    if (primaryLocation && secondaryLocation && primaryLocation !== secondaryLocation) {
                        setLocationAddress(`${primaryLocation}, ${secondaryLocation}`);
                    } else if (primaryLocation) {
                        setLocationAddress(primaryLocation);
                    } else {
                        setLocationAddress(data.display_name.split(',').slice(0, 2).join(', '));
                    }
                }
            } catch (error) {
                if (isMounted) setLocationAddress('Location details unavailable');
            }
        };

        if (partnerData?.currentLocation) {
            getAddress(partnerData.currentLocation.latitude, partnerData.currentLocation.longitude);
        } else {
            setLocationAddress('Location Unknown');
        }

        return () => { isMounted = false; };
    }, [partnerData?.currentLocation]);

    return (
        <div className="flex items-center gap-2 overflow-hidden">
            <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0"/>
            <span className="text-sm font-medium text-muted-foreground truncate">{locationAddress}</span>
        </div>
    );
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
  
  useEffect(() => {
    if (!isLoading && partnerData?.isCabziPinkPartner && theme !== 'pink') {
      setTheme('pink');
    } else if (!isLoading && !partnerData?.isCabziPinkPartner && theme === 'pink') {
      setTheme('system');
    }
  }, [isLoading, partnerData, theme, setTheme]);
  
  if (pathname.includes('/onboarding')) {
    return <>{children}</>
  }
  
  if (isLoading) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <Skeleton className="h-full w-full" />
        </div>
    )
  }

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('');
  const isPinkPartner = partnerData?.isCabziPinkPartner ?? false;

  return (
    <div className={cn("grid min-h-screen w-full lg:grid-cols-[280px_1fr]", isPinkPartner && 'pink')}>
      <div className="hidden border-r bg-muted/40 lg:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-[60px] items-center border-b px-6">
            <Link href="/driver" className="flex items-center gap-2 font-semibold">
              <BrandLogo />
            </Link>
          </div>
          <div className="flex-1 overflow-auto py-2">
            <DriverNav isPinkPartner={isPinkPartner} />
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="lg:hidden">
                <PanelLeft className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0">
               <SheetHeader className="h-[60px] flex flex-row items-center border-b px-6">
                   <SheetTitle className="sr-only">Main Menu</SheetTitle>
                   <Link href="/driver" className="flex items-center gap-2 font-semibold">
                      <BrandLogo />
                   </Link>
               </SheetHeader>
               <div className="pt-4"><DriverNav isPinkPartner={isPinkPartner} /></div>
            </SheetContent>
          </Sheet>
          
          <LocationDisplay />

          <div className="ml-auto flex items-center gap-2">
            {isPinkPartner && <Badge className="bg-pink-500 text-white">Curocity Pink Partner</Badge>}
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
                  <DropdownMenuLabel>{partnerData?.name || 'Driver'}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push('/driver/profile')}>Profile</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/driver/support')}>Support</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <AlertDialog>
                      <AlertDialogTrigger asChild>
                         <DropdownMenuItem onSelect={e => e.preventDefault()} className="text-destructive focus:bg-destructive/10">
                            <LogOut className="mr-2 h-4 w-4" /> Logout
                         </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Confirm Logout</AlertDialogTitle><AlertDialogDescription>Are you sure you want to end your session?</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleLogout} className="bg-destructive hover:bg-destructive/90">Logout</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6 bg-muted/20">
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

    
