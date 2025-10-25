
'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Landmark, Gem, User, PanelLeft, LogOut, Sun, Moon, Wrench } from 'lucide-react'
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
import { doc, updateDoc, onSnapshot, serverTimestamp, getDoc, GeoPoint } from 'firebase/firestore'
import { Badge } from '@/components/ui/badge'
import { MotionDiv } from '@/components/ui/motion-div'
import { errorEmitter, FirestorePermissionError } from '@/lib/error-handling';
import { NotificationsProvider, useNotifications } from '@/context/NotificationContext';
import { Skeleton } from '@/components/ui/skeleton'


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

function DriverLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const [userName, setUserName] = useState('');
  const [isPinkPartner, setIsPinkPartner] = useState(false);
  const { theme, setTheme } = useTheme();
  const { db, auth } = useFirebase();
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  
  const partnerDocRef = useRef<any>(null);
  
  useEffect(() => {
    setIsMounted(true);
    if (pathname === '/driver/onboarding') {
      setIsSessionLoading(false);
      return;
    }

    const session = localStorage.getItem('curocity-session');
    if (!session || !db) {
        router.push('/login?role=driver');
        return;
    }

    try {
        const { name, partnerId, role } = JSON.parse(session);
        if(!role || role !== 'driver' || !partnerId) {
            router.push('/login?role=driver');
            return;
        }
        setUserName(name);
        partnerDocRef.current = doc(db, 'partners', partnerId);
        setIsSessionLoading(false);
    } catch (e) {
        localStorage.removeItem('curocity-session');
        router.push('/login?role=driver');
        return;
    }

    if (partnerDocRef.current) {
        updateDoc(partnerDocRef.current, { isOnline: true, lastSeen: serverTimestamp() })
         .catch(error => {
            const permissionError = new FirestorePermissionError({
                path: partnerDocRef.current.path,
                operation: 'update',
                requestResourceData: { isOnline: true }
            });
            errorEmitter.emit('permission-error', permissionError);
        });
    }

    const unsubscribe = onSnapshot(partnerDocRef.current, (docSnap) => {
      if(docSnap.exists()){
          const data = docSnap.data();
          const partnerIsPink = data.isCabziPinkPartner || false;
          setIsPinkPartner(partnerIsPink);

          if (partnerIsPink) {
              if (theme !== 'pink') setTheme('pink');
          } else {
              if (theme === 'pink') setTheme('system');
          }
      }
    });

    let watchId: number | undefined;
    let lastSentLocation: { lat: number, lon: number } | null = null;
    const MIN_DISTANCE_THRESHOLD = 50; // in meters
    const MIN_TIME_THRESHOLD = 30000; // 30 seconds
    let lastSentTime = 0;

    const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371e3; // metres
        const φ1 = lat1 * Math.PI/180;
        const φ2 = lat2 * Math.PI/180;
        const Δφ = (lat2-lat1) * Math.PI/180;
        const Δλ = (lon2-lon1) * Math.PI/180;
        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c; // in metres
    }

    if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
            (pos) => {
                 if (partnerDocRef.current) {
                    const now = Date.now();
                    const newLocation = { lat: pos.coords.latitude, lon: pos.coords.longitude };
                    
                    const distanceMoved = lastSentLocation ? getDistance(lastSentLocation.lat, lastSentLocation.lon, newLocation.lat, newLocation.lon) : Infinity;
                    
                    if (distanceMoved > MIN_DISTANCE_THRESHOLD || now - lastSentTime > MIN_TIME_THRESHOLD) {
                        updateDoc(partnerDocRef.current, {
                            currentLocation: new GeoPoint(newLocation.lat, newLocation.lon),
                            lastSeen: serverTimestamp()
                        }).catch(error => {
                            const permissionError = new FirestorePermissionError({
                                path: partnerDocRef.current.path,
                                operation: 'update',
                                requestResourceData: { currentLocation: '...' }
                            });
                            errorEmitter.emit('permission-error', permissionError);
                        });
                        lastSentLocation = newLocation;
                        lastSentTime = now;
                    }
                }
            },
            () => {},
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    }
    
    const handleBeforeUnload = () => {
        if(partnerDocRef.current) {
          updateDoc(partnerDocRef.current, { isOnline: false, lastSeen: serverTimestamp(), currentLocation: null });
        }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
        unsubscribe();
        if (watchId) navigator.geolocation.clearWatch(watchId);
        window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, pathname, db]);
  

  const handleLogout = async () => {
    if (partnerDocRef.current) {
        try {
            updateDoc(partnerDocRef.current, { isOnline: false, lastSeen: serverTimestamp() });
        } catch (error) {
            console.error("Failed to update logout status (non-critical):", error);
        }
    }
    if (auth) auth.signOut();
    localStorage.removeItem('curocity-session');
    
    if (theme === 'pink') {
        setTheme('system'); 
    }

    toast({
        title: 'Logged Out',
        description: 'You have been successfully logged out.'
    });
    router.push('/');
  }
  
  if (pathname === '/driver/onboarding') {
    return (
      <>
        {children}
        <Toaster />
      </>
    )
  }
  
  if (isSessionLoading || !isMounted) {
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
       <div className="flex min-h-screen w-full flex-col">
         <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur-sm md:px-6">
            <div className="md:hidden">
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="outline" size="icon" className="shrink-0">
                            <PanelLeft className="h-5 w-5" />
                            <span className="sr-only">Toggle navigation menu</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="p-0">
                        <SheetHeader className="p-6">
                           <SheetTitle><LogoArea isPinkPartner={isPinkPartner} /></SheetTitle>
                           <SheetDescription className="sr-only">Main menu for driver</SheetDescription>
                        </SheetHeader>
                         <div className="flex-1 overflow-auto py-2">
                             <DriverNav isPinkPartner={isPinkPartner} />
                         </div>
                    </SheetContent>
                </Sheet>
            </div>
            <div className="hidden md:block">
                <LogoArea isPinkPartner={isPinkPartner} />
            </div>
            <div className="ml-auto flex items-center gap-4">
                <ThemeToggle />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="icon" className="rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src="https://i.pravatar.cc/40?u=driver" alt={userName} data-ai-hint="driver portrait" />
                        <AvatarFallback>{getInitials(userName).toUpperCase()}</AvatarFallback>
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
          <main className="h-[calc(100vh-4rem)]">
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
  )
}

export default function DriverLayout({ children }: { children: React.ReactNode }) {
    return (
        <NotificationsProvider>
            <DriverLayoutContent>{children}</DriverLayoutContent>
            <Toaster />
        </NotificationsProvider>
    );
}
