
'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
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
import { doc, setDoc, serverTimestamp, GeoPoint, type DocumentReference, onSnapshot, getDoc } from 'firebase/firestore'
import { Badge } from '@/components/ui/badge'
import { MotionDiv } from '@/components/ui/motion-div'
import { NotificationsProvider } from '@/context/NotificationContext';
import { Skeleton } from '@/components/ui/skeleton'

interface PartnerData {
    id: string;
    isCabziPinkPartner?: boolean;
    name: string;
    [key: string]: any;
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

function DriverLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const { db, auth, user, isUserLoading: isAuthLoading } = useFirebase();
  const [partnerData, setPartnerData] = useState<PartnerData | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleLogout = useCallback(() => {
    if (partnerData?.id && db) {
        setDoc(doc(db, 'partners', partnerData.id), { isOnline: false, lastSeen: serverTimestamp() }, { merge: true }).catch(error => {
            console.warn("Failed to update status on logout (non-critical):", error);
        });
    }
    if (auth) auth.signOut();
    localStorage.removeItem('curocity-session');
    
    if (theme === 'pink') setTheme('system');

    toast({
        title: 'Logged Out',
        description: 'You have been successfully logged out.'
    });
    router.push('/');
  }, [auth, db, partnerData, router, toast, theme, setTheme]);

  useEffect(() => {
    if (isAuthLoading) return;

    const isOnboardingPage = pathname.includes('/driver/onboarding');

    if (!user) {
        if (!isOnboardingPage) {
            router.push('/login?role=driver');
        }
        setIsSessionLoading(false);
        return;
    }

    const session = localStorage.getItem('curocity-session');
    if (!session || !db) {
        setIsSessionLoading(false);
        if (!isOnboardingPage) {
            router.push('/login?role=driver');
        }
        return;
    }

    try {
        const sessionData = JSON.parse(session);
        if (!sessionData.role || sessionData.role !== 'driver' || !sessionData.partnerId) {
            router.push('/login?role=driver');
            setIsSessionLoading(false);
            return;
        }

        const partnerDocRef = doc(db, 'partners', sessionData.partnerId);

        const unsubPartner = onSnapshot(partnerDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const fetchedPartnerData = { id: docSnap.id, ...data } as PartnerData;

                const isPink = data.isCabziPinkPartner || false;
                if (isPink && theme !== 'pink') setTheme('pink');
                else if (!isPink && theme === 'pink') setTheme('system');

                setPartnerData(fetchedPartnerData);
            }
            setIsSessionLoading(false);
        }, (error) => {
            console.error("Error with partner data snapshot:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not load partner profile." });
            setIsSessionLoading(false);
        });

        return () => unsubPartner();

    } catch (e) {
        localStorage.removeItem('curocity-session');
        router.push('/login?role=driver');
        setIsSessionLoading(false);
    }
  }, [isAuthLoading, user, db, router, pathname, toast, theme, setTheme]);

  // Heartbeat effect
   useEffect(() => {
    let heartbeatInterval: NodeJS.Timeout | null = null;
    
    if (partnerData?.id && db) {
        heartbeatInterval = setInterval(() => {
            setDoc(doc(db, 'partners', partnerData.id), { lastSeen: serverTimestamp(), isOnline: true }, { merge: true }).catch(error => {
                console.warn("Heartbeat update failed (non-critical):", error);
            });
        }, 30000); // 30-second heartbeat
    }
    
    return () => {
        if (heartbeatInterval) clearInterval(heartbeatInterval);
    }
  }, [partnerData, db]);
  
  if (pathname === '/driver/onboarding') {
    return <>{children}<Toaster /></>
  }
  
  if (!isMounted || isSessionLoading || isAuthLoading) {
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
  
  if (!user) {
    return null;
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
       <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
         <div className="hidden border-r bg-muted/40 md:block">
             <div className="flex h-full max-h-screen flex-col gap-2">
                 <div className="flex h-16 items-center border-b px-6">
                     <LogoArea isPinkPartner={partnerData?.isCabziPinkPartner || false} />
                 </div>
                  <div className="flex-1 overflow-auto py-2">
                     <DriverNav isPinkPartner={partnerData?.isCabziPinkPartner || false} />
                  </div>
             </div>
         </div>
         <div className="flex flex-col">
            <header className="flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
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
                               <SheetTitle><LogoArea isPinkPartner={partnerData?.isCabziPinkPartner || false} /></SheetTitle>
                               <SheetDescription className="sr-only">Main menu for driver</SheetDescription>
                            </SheetHeader>
                             <div className="flex-1 overflow-auto py-2">
                                 <DriverNav isPinkPartner={partnerData?.isCabziPinkPartner || false} />
                             </div>
                        </SheetContent>
                    </Sheet>
                 </div>
                 <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4 justify-end">
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
             <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 overflow-auto">
                 <MotionDiv 
                    key={pathname}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: 'easeInOut' }}
                    className="h-full relative"
                >
                    {React.Children.map(children, child => {
                        if (React.isValidElement(child)) {
                            // @ts-ignore
                            return React.cloneElement(child, { partnerData, setPartnerData });
                        }
                        return child;
                    })}
                </MotionDiv>
             </main>
         </div>
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
