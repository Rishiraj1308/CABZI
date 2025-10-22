
'use client'

import React, { useState, useEffect, createContext, useContext, useRef } from 'react'
import { Toaster } from "@/components/ui/toaster";
import { Button } from '@/components/ui/button';
import { Home, History, Menu, LogOut, Heart, Gift, PanelLeft, Landmark, Sun, Moon, Settings, User, Calendar } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import BrandLogo from '@/components/brand-logo';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from 'next-themes';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
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
import { useFirebase } from '@/firebase/client-provider';
import { type User as FirebaseUser } from 'firebase/auth';
import { doc, updateDoc, collection, query, where, serverTimestamp, getDocs, GeoPoint, onSnapshot } from 'firebase/firestore';
import { errorEmitter, FirestorePermissionError } from '@/lib/error-handling';

// --- START: CONTEXT DEFINITION ---
interface RiderSession {
  name: string;
  phone: string;
  gender: string;
  userId: string;
}

interface RiderContextType {
  session: RiderSession | null;
  isLoading: boolean;
}

const RiderContext = createContext<RiderContextType | null>(null);

export function useRider() {
  const context = useContext(RiderContext);
  if (!context) {
    throw new Error('useRider must be used within a RiderLayout');
  }
  return context;
}
// --- END: CONTEXT DEFINITION ---


const navItems = [
    { href: '/rider', label: 'Book a Ride', icon: Home, comingSoon: false },
    { href: '/rider/appointments', label: 'Book Appointment', icon: Calendar, comingSoon: false },
    { href: '/rider/rides', label: 'My Rides', icon: History, comingSoon: false },
    { href: '/rider/wallet', label: 'Cabzi Bank', icon: Landmark, comingSoon: true },
    { href: '/rider/offers', label: 'Offers', icon: Gift, comingSoon: false },
]

function ThemeToggle() {
    const { setTheme } = useTheme()
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
           <Button variant="outline" size="icon" className="shadow-lg rounded-full">
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

export default function RiderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMounted, setIsMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  
  const [session, setSession] = useState<RiderSession | null>(null);
  const { user, isUserLoading: isAuthLoading, db, auth } = useFirebase();
  const userDocRef = useRef<any>(null);

  useEffect(() => {
    setIsMounted(true);

    if (isAuthLoading) {
      return; 
    }

    if (!user) {
      setSession(null);
      localStorage.removeItem('cabzi-session');
      if (window.location.pathname.startsWith('/rider')) {
        router.push('/login?role=rider');
      }
      return;
    }

    const phone = user.phoneNumber?.slice(3);
    const email = user.email;

    if (!db || (!phone && !email)) {
      auth?.signOut();
      return;
    }
    
    const identifierField = phone ? 'phone' : 'email';
    const identifierValue = phone || email;

    if (!identifierValue) {
        auth?.signOut();
        return;
    }

    const q = query(collection(db, 'users'), where(identifierField, '==', identifierValue));
    const unsubscribeUser = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const userDoc = snapshot.docs[0];
        const userData = userDoc.data();
        const sessionData: RiderSession = {
          phone: userData.phone,
          name: userData.name,
          gender: userData.gender,
          userId: userDoc.id,
        };
        setSession(sessionData);
        localStorage.setItem('cabzi-session', JSON.stringify(sessionData));
        userDocRef.current = doc(db, 'users', userDoc.id);
      } else {
         if (window.location.pathname.startsWith('/rider')) {
            auth?.signOut();
        }
      }
    }, (error) => {
        console.error("Error fetching user session:", error);
        auth?.signOut();
    });

    return () => unsubscribeUser();

  }, [user, isAuthLoading, db, auth, router]);


  useEffect(() => {
    if (isAuthLoading || !session || !db) return;
    
    if (userDocRef.current) {
        updateDoc(userDocRef.current, { isOnline: true, lastSeen: serverTimestamp() }).catch(e => {
            const fpe = new FirestorePermissionError({
                path: userDocRef.current.path,
                operation: 'update',
                requestResourceData: {isOnline: true}
            });
            errorEmitter.emit('permission-error', fpe);
        });
    }
    
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
        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c; // in metres
    }

    if(navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
            (pos) => {
                const newLocation = { lat: pos.coords.latitude, lon: pos.coords.longitude };
                const now = Date.now();
                if (userDocRef.current) {
                    const distanceMoved = lastSentLocation ? getDistance(lastSentLocation.lat, lastSentLocation.lon, newLocation.lat, newLocation.lon) : Infinity;

                    if (distanceMoved > MIN_DISTANCE_THRESHOLD || now - lastSentTime > MIN_TIME_THRESHOLD) {
                        const updateData = {
                          currentLocation: new GeoPoint(newLocation.lat, newLocation.lon),
                          lastSeen: serverTimestamp()
                        };
                        updateDoc(userDocRef.current, updateData).catch(e => {
                            const fpe = new FirestorePermissionError({
                                path: userDocRef.current.path,
                                operation: 'update',
                                requestResourceData: updateData
                            });
                            errorEmitter.emit('permission-error', fpe);
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
    
    const handleBeforeUnload = () => {
        if (userDocRef.current) {
             updateDoc(userDocRef.current, { isOnline: false, currentLocation: null });
        }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
        if (watchId) navigator.geolocation.clearWatch(watchId);
        window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isAuthLoading, session, db]);


  const handleLogout = () => {
    if (!auth) return;
    if (userDocRef.current) {
      updateDoc(userDocRef.current, { isOnline: false, currentLocation: null });
    }
    auth.signOut();
  };

  const getInitials = (name: string) => {
    if (!name) return 'R';
    const names = name.split(' ');
    return names.length > 1 ? names[0][0] + names[1][0] : name.substring(0, 2);
  }

  if (!isMounted || isAuthLoading || !session) {
    return null;
  }
  
  return (
      <RiderContext.Provider value={{ session, isLoading: isAuthLoading }}>
          <div className="relative min-h-screen bg-background flex flex-col">
          <div className="absolute top-4 left-4 z-20">
              <Sheet open={open} onOpenChange={setOpen}>
                  <SheetTrigger asChild>
                      <Button variant="outline" size="icon" className="shadow-lg rounded-full">
                          <Menu className="h-5 w-5" />
                          <span className="sr-only">Open menu</span>
                      </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-full max-w-sm p-0 flex flex-col">
                      <SheetHeader className="p-4 border-b">
                          <SheetTitle>
                              <Link href="/" legacyBehavior>
                                  <a onClick={() => setOpen(false)}><BrandLogo /></a>
                              </Link>
                          </SheetTitle>
                          <SheetDescription className="sr-only">Main menu for rider</SheetDescription>
                      </SheetHeader>
                      <nav className="flex-1 px-4 space-y-2 py-4">
                          {navItems.map(item => {
                          const linkContent = (
                              <div className={cn(
                                  "flex items-center gap-4 p-3 rounded-lg transition-colors hover:bg-muted",
                                  item.comingSoon && "opacity-50 cursor-not-allowed"
                              )}>
                                  <item.icon className="h-5 w-5 text-primary" />
                                  <span className="font-medium">{item.label}</span>
                                  {item.comingSoon && <Badge variant="secondary">Coming Soon</Badge>}
                              </div>
                          );

                          if (item.comingSoon) {
                              return (
                              <div key={item.label} onClick={() => toast({ title: "Coming Soon!", description: `The ${item.label} feature is under development.`})}>
                                  {linkContent}
                              </div>
                              )
                          }
                          
                          return (
                              <Link
                                  key={item.href}
                                  href={item.href}
                                  onClick={() => setOpen(false)}
                                  legacyBehavior>
                                  <a>{linkContent}</a>
                              </Link>
                          );
                          })}
                      </nav>
                  </SheetContent>
              </Sheet>
          </div>
          <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
              <ThemeToggle />
              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full shadow-lg border">
                      <Avatar className="h-9 w-9">
                      <AvatarImage src={`https://placehold.co/100x100.png`} alt={session?.name} data-ai-hint="customer portrait" />
                      <AvatarFallback>{getInitials(session?.name || '').toUpperCase()}</AvatarFallback>
                      </Avatar>
                  </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Hi, {session?.name}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => router.push('/rider/profile')}><User className="mr-2 h-4 w-4"/> Profile</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => router.push('/rider/support')}><Heart className="mr-2 h-4 w-4"/> Support</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => toast({title: 'Coming Soon!'})}><Settings className="mr-2 h-4 w-4"/> Settings</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <AlertDialog>
                      <AlertDialogTrigger asChild>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                          <LogOut className="mr-2 h-4 w-4"/> Logout
                      </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                          <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
                              <AlertDialogDescription>
                                  You will need to sign in again to book a ride.
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
          <main className="flex-1 flex flex-col">
              {children}
          </main>
          <Toaster />
          </div>
      </RiderContext.Provider>
  );
}
