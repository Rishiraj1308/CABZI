
'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Landmark, History, User, PanelLeft, LogOut, Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/toaster'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
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
import { doc, updateDoc, serverTimestamp, GeoPoint } from 'firebase/firestore'
import { MotionDiv } from '@/components/ui/motion-div'
import { errorEmitter, FirestorePermissionError } from '@/lib/error-handling';
import { Skeleton } from '@/components/ui/skeleton'

const navItems = [
  { href: '/mechanic', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/mechanic/jobs', label: 'My Jobs', icon: History },
  { href: '/mechanic/wallet', label: 'Curocity Bank', icon: Landmark },
  { href: '/mechanic/profile', label: 'Profile', icon: User },
]

function MechanicNav() {
  const pathname = usePathname()
  return (
    <nav className="grid items-start gap-1 px-4 text-sm font-medium md:flex md:flex-row md:items-center md:gap-5 md:px-0">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:bg-muted hover:text-primary md:p-0 md:hover:bg-transparent',
            pathname === item.href && 'font-semibold text-primary'
          )}
        >
            <item.icon className="h-4 w-4 md:hidden" />
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
              <DropdownMenuItem onClick={() => setTheme('system')}>System</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

export default function MechanicLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [userName, setUserName] = useState('');
  const { db, auth } = useFirebase();
  const mechanicDocRef = useRef<any>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);

  useEffect(() => {
    let watchId: number | undefined;
    let lastSentLocation: { lat: number; lon: number } | null = null;
    const MIN_DISTANCE_THRESHOLD = 50; // meters
    const MIN_TIME_THRESHOLD = 30000; // 30 seconds
    let lastSentTime = 0;

    const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371e3; // metres
        const φ1 = lat1 * Math.PI/180;
        const φ2 = lat2 * Math.PI/180;
        const Δφ = (lat2-lat1) * Math.PI/180;
        const Δλ = (lon2-lon1) * Math.PI/180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c; // in metres
    }

    if (pathname === '/mechanic/onboarding' || pathname === '/garage/onboarding') {
      setIsSessionLoading(false);
      return;
    }

    const sessionString = localStorage.getItem('curocity-resq-session');
    if (sessionString && db) {
        try {
            const sessionData = JSON.parse(sessionString);
            if (!sessionData.role || sessionData.role !== 'mechanic' || !sessionData.partnerId) {
                router.push('/login?role=driver');
                return;
            }

            setUserName(sessionData.name);
            mechanicDocRef.current = doc(db, 'mechanics', sessionData.partnerId);
             setIsSessionLoading(false);

            updateDoc(mechanicDocRef.current, { isAvailable: true, lastOnline: serverTimestamp() })
            .catch(error => {
                const permissionError = new FirestorePermissionError({
                    path: mechanicDocRef.current.path,
                    operation: 'update',
                    requestResourceData: { isAvailable: true }
                });
                errorEmitter.emit('permission-error', permissionError);
            });

            
            if (navigator.geolocation) {
                 watchId = navigator.geolocation.watchPosition(
                    (pos) => {
                        const newLocation = { lat: pos.coords.latitude, lon: pos.coords.longitude };
                        const now = Date.now();
                        
                        if (mechanicDocRef.current) {
                            const distanceMoved = lastSentLocation ? getDistance(lastSentLocation.lat, lastSentLocation.lon, newLocation.lat, newLocation.lon) : Infinity;

                            if (distanceMoved > MIN_DISTANCE_THRESHOLD || now - lastSentTime > MIN_TIME_THRESHOLD) {
                                updateDoc(mechanicDocRef.current, { 
                                    currentLocation: new GeoPoint(newLocation.lat, newLocation.lon),
                                    lastOnline: serverTimestamp() 
                                }).catch(error => {
                                    const permissionError = new FirestorePermissionError({
                                        path: mechanicDocRef.current.path,
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
                    { enableHighAccuracy: true }
                );
            }
        } catch (error) {
            console.error("Failed to parse session, redirecting", error);
            localStorage.removeItem('curocity-resq-session');
            router.push('/login?role=driver');
        }
    } else {
        router.push('/login?role=driver');
    }
    
    const handleBeforeUnload = () => {
        if (mechanicDocRef.current) {
            updateDoc(mechanicDocRef.current, { isAvailable: false, lastOnline: serverTimestamp(), currentLocation: null });
        }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        if (watchId) navigator.geolocation.clearWatch(watchId);
        if (mechanicDocRef.current) {
            updateDoc(mechanicDocRef.current, { isAvailable: false, lastOnline: serverTimestamp(), currentLocation: null });
        }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, db]);

  const handleLogout = async () => {
    if (mechanicDocRef.current) {
        try {
            await updateDoc(mechanicDocRef.current, { isAvailable: false, lastSeen: serverTimestamp() });
        } catch (error) {
            console.error("Failed to update logout status for mechanic:", error);
        }
    }
    if (auth) auth.signOut();
    localStorage.removeItem('curocity-resq-session');
    toast({
        title: 'Logged Out',
        description: 'You have been successfully logged out.'
    });
    router.push('/');
  }

  if (pathname === '/mechanic/onboarding' || pathname === '/garage/onboarding') {
    return (
      <>
        {children}
        <Toaster />
      </>
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
          <Skeleton className="h-full w-full" />
        </main>
      </div>
    );
  }

  const getInitials = (name: string) => {
    if (!name) return 'R';
    const names = name.split(' ');
    if (names.length > 1) {
      return names[0][0] + names[names.length - 1][0];
    }
    return name.substring(0, 2);
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur-sm md:px-6">
         <nav className="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 lg:gap-6">
           <Link
             href="/"
             className="flex items-center gap-2 text-lg font-semibold md:text-base"
             passHref legacyBehavior>
                <a>
                    <BrandLogo />
                    <span className="ml-2 text-xs font-semibold px-2 py-1 rounded-full bg-orange-500/20 text-orange-600">ResQ</span>
                </a>
           </Link>
            <div className="w-px bg-border h-6 mx-2"></div>
            <MechanicNav />
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
              <div className="flex h-16 items-center border-b px-6">
                 <Link href="/" className="flex items-center gap-2 font-semibold">
                    <BrandLogo />
                    <span className="ml-2 text-xs font-semibold px-2 py-1 rounded-full bg-orange-500/20 text-orange-600">ResQ</span>
                 </Link>
              </div>
              <MechanicNav />
           </SheetContent>
         </Sheet>
         <div className="ml-auto flex items-center gap-4">
            <ThemeToggle/>
           <DropdownMenu>
             <DropdownMenuTrigger asChild>
               <Button variant="secondary" size="icon" className="rounded-full">
                 <Avatar className="h-8 w-8">
                   <AvatarImage src="https://i.pravatar.cc/40?u=mechanic" alt={userName} data-ai-hint="mechanic portrait" />
                   <AvatarFallback>{getInitials(userName).toUpperCase()}</AvatarFallback>
                 </Avatar>
                 <span className="sr-only">Toggle user menu</span>
               </Button>
             </DropdownMenuTrigger>
             <DropdownMenuContent align="end">
               <DropdownMenuLabel>My Account</DropdownMenuLabel>
               <DropdownMenuSeparator />
               <DropdownMenuItem onClick={() => router.push('/mechanic/profile')}>Profile</DropdownMenuItem>
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
                         <AlertDialogDescription>
                            You will need to sign in again to access your ResQ dashboard.
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
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <MotionDiv 
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
            className="h-full"
        >
          {children}
        </MotionDiv>
      </main>
      <Toaster />
    </div>
  );
}
