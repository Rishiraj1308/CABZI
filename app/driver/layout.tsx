
'use client'

import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Landmark, Gem, User, PanelLeft, LogOut, Sun, Moon, Wrench, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/toaster'
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
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
import { useToast } from '@/hooks/use-toast'
import BrandLogo from '@/components/brand-logo'
import { useTheme } from 'next-themes'
import { useFirebase } from '@/firebase/client-provider'
import { doc, setDoc, serverTimestamp, type DocumentReference, onSnapshot, GeoPoint, updateDoc } from 'firebase/firestore'
import { Badge } from '@/components/ui/badge'
import { MotionDiv } from '@/components/ui/motion-div'
import { NotificationsProvider } from '@/context/NotificationContext';
import { Skeleton } from '@/components/ui/skeleton'

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
                    setDoc(doc(db, 'partners', sessionData.partnerId), { isOnline: false, lastSeen: serverTimestamp() }, { merge: true }).catch(error => {
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

            const partnerDocRef = doc(db, 'partners', sessionData.partnerId);
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

                if (primaryLocation && secondaryLocation && primaryLocation !== secondaryLocation) {
                    setLocationAddress(`${primaryLocation}, ${secondaryLocation}`);
                } else if (primaryLocation) {
                    setLocationAddress(primaryLocation);
                } else {
                    setLocationAddress(data.display_name.split(',').slice(0, 2).join(', '));
                }
            } catch (error) {
                if (isMounted) setLocationAddress('Location details unavailable');
            }
        };

        if (partnerData?.currentLocation) {
            getAddress(partnerData.currentLocation.latitude, partnerData.currentLocation.longitude);
        } else if (navigator.geolocation) {
             navigator.geolocation.getCurrentPosition(
                (position) => {
                    if (isMounted) {
                       getAddress(position.coords.latitude, position.coords.longitude);
                    }
                },
                () => { if (isMounted) setLocationAddress('Location Unavailable'); },
                { timeout: 10000 }
            );
        }

        return () => { isMounted = false; };
    }, [partnerData?.currentLocation]);

    return (
        <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground"/>
            <span className="text-sm font-medium text-muted-foreground truncate">{locationAddress}</span>
        </div>
    );
}

function DriverLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
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
                setDoc(doc(db, 'partners', sessionData.partnerId), { isOnline: false, lastSeen: serverTimestamp() }, { merge: true }).catch(error => {
                    console.warn("Failed to update status on logout (non-critical):", error);
                });
            }
        } catch (e) {
            console.error("Error parsing session on logout:", e);
        }
    }
    
    localStorage.removeItem('curocity-session');
    
    if (theme === 'pink') setTheme('system');

    toast({
        title: 'Logged Out',
        description: 'You have been successfully logged out.'
    });
    router.push('/');
  }, [auth, db, router, toast, theme, setTheme]);

   useEffect(() => {
    let heartbeatInterval: NodeJS.Timeout | null = null;
    
    if (partnerData?.id && db && partnerData?.isOnline) { 
        heartbeatInterval = setInterval(() => {
            updateDoc(doc(db, 'partners', partnerData.id), { lastSeen: serverTimestamp() }).catch(error => {
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
    return <>{children}<Toaster /></>
  }

  if (isLoading) {
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
          <Skeleton className="h-full w-full" />
        </main>
      </div>
    );
  }

  const getInitials = (name: string) => {
    if (!name) return 'D';
    const names = name.split(' ');
    if (names.length > 1) {
      return names[0][0] + names[names.length - 1][0];
    }
    return name.substring(0, 2);
  }

  const LogoArea = ({ isPinkPartner }: { isPinkPartner: boolean }) => (
    <Link href="/" className="flex items-center gap-2 font-semibold">
      <BrandLogo />
      {isPinkPartner && <Badge className="bg-pink-600/20 text-pink-700 dark:bg-pink-500/20 dark:text-pink-400 border-pink-600/30">Pink Partner</Badge>}
    </Link>
  );

  return (
       <div className={cn("flex min-h-screen w-full flex-col", partnerData?.isCabziPinkPartner ? 'pink-theme' : 'default-theme')}>
         <div className="md:hidden border-b bg-background p-4 flex justify-between items-center">
            <Sheet>
                <SheetTrigger asChild>
                    <Button variant="outline" size="icon" className="shrink-0">
                        <PanelLeft className="h-5 w-5" />
                        <span className="sr-only">Toggle navigation menu</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0">
                             <SheetHeader className="p-6">
                               <SheetTitle><LogoArea isPinkPartner={partnerData?.isCabziPinkPartner || false} /></SheetTitle>
                               <SheetDescription className="sr-only">Main menu for driver</SheetDescription>
                            </SheetHeader>
                             <div className="flex-1 overflow-auto py-2">
                                 <DriverNav isPinkPartner={partnerData?.isCabziPinkPartner || false} />
                             </div>
                        </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2">
                <ThemeToggle />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="icon" className="rounded-full">
                        <Avatar className="h-8 w-8">
                        <AvatarImage src="https://i.pravatar.cc/40?u=driver" alt={partnerData?.name} data-ai-hint="driver portrait" />
                        <AvatarFallback>{getInitials(partnerData?.name || '').toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="sr-only">Toggle user menu</span>
                    </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => router.push('/driver/profile')}>Profile</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => router.push('/driver/support')}>Support</DropdownMenuItem>
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
                                <AlertDialogDescription>
                                You will be returned to the home page and will need to log in again to access your dashboard.
                                </AlertDialogDescription>
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
        </div>

        <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
         <div className="hidden border-r bg-background/95 md:block">
             <div className="flex h-full max-h-screen flex-col gap-2">
                 <div className="flex h-16 items-center border-b px-6">
                     <LogoArea isPinkPartner={partnerData?.isCabziPinkPartner || false} />
                 </div>
                  <div className="flex-1 overflow-auto py-2">
                     <DriverNav isPinkPartner={partnerData?.isCabziPinkPartner || false} />
                  </div>
             </div>
         </div>
         <div className="flex flex-col bg-muted/40">
             <header className="hidden md:flex h-16 items-center gap-4 border-b bg-background px-6">
                 <LocationDisplay />
                 <div className="ml-auto flex items-center gap-2">
                    <ThemeToggle />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="secondary" size="icon" className="rounded-full">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src="https://i.pravatar.cc/40?u=driver" alt={partnerData?.name} data-ai-hint="driver portrait" />
                            <AvatarFallback>{getInitials(partnerData?.name || '').toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="sr-only">Toggle user menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>My Account</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => router.push('/driver/profile')}>Profile</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => router.push('/driver/support')}>Support</DropdownMenuItem>
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
                                    <AlertDialogDescription>
                                       You will be returned to the home page and will need to log in again to access your dashboard.
                                    </AlertDialogDescription>
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
             <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6 overflow-auto">
                 <MotionDiv 
                    key={pathname}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: 'easeInOut' }}
                    className="h-full relative"
                >
                   {children}
                </MotionDiv>
             </main>
         </div>
       </div>
       </div>
  )
}

export default function DriverLayout({ children }: { children: React.ReactNode }) {
    return (
        <NotificationsProvider>
          <DriverProvider>
            <DriverLayoutContent>{children}</DriverLayoutContent>
          </DriverProvider>
          <Toaster />
        </NotificationsProvider>
    );
}
