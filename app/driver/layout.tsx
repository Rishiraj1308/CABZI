

'use client'

import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Landmark, Gem, User, PanelLeft, LogOut, Sun, Moon, Wrench, MapPin, Map } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/toaster'
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
import { useToast } from '@/hooks/use-toast'
import BrandLogo from '@/components/brand-logo'
import { useTheme } from 'next-themes'
import { useFirebase } from '@/firebase/client-provider'
import { doc, updateDoc, serverTimestamp, type DocumentReference, onSnapshot, GeoPoint } from 'firebase/firestore'
import { Badge } from '@/components/ui/badge'
import { MotionDiv } from '@/components/ui/motion-div'
import { NotificationsProvider } from '@/context/NotificationContext';
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import dynamic from 'next/dynamic'


const LiveMap = dynamic(() => import('@/components/live-map'), { 
    ssr: false,
    loading: () => <div className="w-full h-full bg-muted flex items-center justify-center"><p>Loading Map...</p></div>
});


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
                    updateDoc(doc(db, 'partners', sessionData.partnerId), { isOnline: false, lastSeen: serverTimestamp() }).catch(error => {
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
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { auth, db } = useFirebase();
  const { partnerData, isLoading } = useDriver();
  
  useEffect(() => {
    // This effect will redirect the user away from any page in the /driver route
    // except for the onboarding page.
    if (pathname !== '/driver/onboarding') {
      toast({
        title: "Driver Dashboard Disabled",
        description: "This feature is temporarily unavailable while we work on other parts of the app.",
      });
      router.push('/');
    }
  }, [pathname, router, toast]);

  const handleLogout = useCallback(() => {
    if (auth) auth.signOut();
    const sessionString = localStorage.getItem('curocity-session');
    if (sessionString && db) {
        try {
            const sessionData = JSON.parse(sessionString);
            if (sessionData.partnerId) {
                updateDoc(doc(db, 'partners', sessionData.partnerId), { isOnline: false, lastSeen: serverTimestamp() }).catch(error => {
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

  // A loading or placeholder screen while redirecting
  return (
    <div className="flex h-screen w-full items-center justify-center">
        <Skeleton className="h-full w-full" />
    </div>
  );
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
