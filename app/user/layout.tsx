
'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Toaster } from "@/components/ui/toaster";
import { Button } from '@/components/ui/button';
import { Home, History, Menu, LogOut, Heart, Gift, PanelLeft, Landmark, Sun, Moon, Settings, User, Calendar, Car, MapPin, LifeBuoy, Search, MessageSquare, Shield, Phone, Siren } from 'lucide-react';
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
import { doc, updateDoc } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';


const navItems = [
    { href: '/user', label: 'Services', icon: Home, comingSoon: false },
    { href: '/user/activity', label: 'My Activity', icon: History, comingSoon: false },
    { href: '/user/profile', label: 'Profile', icon: User, comingSoon: false },
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

function LocationDisplay() {
  const [location, setLocation] = useState('Locating...');

  useEffect(() => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=14`);
                    if (!response.ok) {
                        setLocation('Location not found');
                        return;
                    }
                    const data = await response.json();
                    const address = data.address;
                    const primaryLocation = address.suburb || address.neighbourhood || address.city || address.town || address.village;
                    const secondaryLocation = address.city || address.state;

                    if (primaryLocation && secondaryLocation && primaryLocation !== secondaryLocation) {
                        setLocation(`${primaryLocation}, ${secondaryLocation}`);
                    } else if (primaryLocation) {
                        setLocation(primaryLocation);
                    } else {
                        setLocation(data.display_name.split(',').slice(0, 2).join(', '));
                    }
                } catch (error) {
                    setLocation('Location not found');
                }
            }, 
            () => {
                setLocation('Location Unavailable');
            },
            { timeout: 10000 }
        );
    } else {
        setLocation('Geolocation not supported');
    }
  }, []);
  
  return (
    <div className="flex items-center gap-2">
      <MapPin className="w-4 h-4 text-muted-foreground"/>
      <span className="text-sm font-medium text-muted-foreground truncate">{location}</span>
    </div>
  )
}

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMounted, setIsMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  
  const { user, isUserLoading, db, auth } = useFirebase();

  useEffect(() => {
    setIsMounted(true);
    if (!isUserLoading && !user) {
      if (window.location.pathname.startsWith('/rider') || window.location.pathname.startsWith('/user')) {
        router.push('/login?role=user');
      }
    }
  }, [user, isUserLoading, router]);

  const handleLogout = () => {
    if (!auth) return;
    if (user?.uid && db) {
      const userDocRef = doc(db, 'users', user.uid);
      updateDoc(userDocRef, { isOnline: false, currentLocation: null });
    }
    auth.signOut().then(() => {
      localStorage.removeItem('curocity-session');
      router.push('/login?role=user');
    });
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'R';
    const names = name.split(' ');
    return names.length > 1 ? names[0][0] + names[1][0] : name.substring(0, 2);
  }
  
  const pageVariants = {
    initial: {
      opacity: 0,
      scale: 0.98,
    },
    in: {
      opacity: 1,
      scale: 1,
    },
    out: {
      opacity: 0,
      scale: 1.02,
    },
  };

  const pageTransition = {
    type: 'tween',
    ease: 'anticipate',
    duration: 0.4,
  };


  if (!isMounted || isUserLoading) {
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
  
  return (
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
                  <AvatarImage src={user?.photoURL || 'https://placehold.co/100x100.png'} alt={user?.displayName || 'User'} data-ai-hint="customer portrait" />
                  <AvatarFallback>{getInitials(user?.displayName).toUpperCase()}</AvatarFallback>
                  </Avatar>
              </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
              <DropdownMenuLabel>Hi, {user?.displayName}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => router.push('/user/profile')}><User className="mr-2 h-4 w-4"/> Profile</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => router.push('/user/support')}><Heart className="mr-2 h-4 w-4"/> Support</DropdownMenuItem>
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
          <AnimatePresence mode="wait">
                <motion.div 
                    key={pathname}
                    initial="initial"
                    animate="in"
                    exit="out"
                    variants={pageVariants}
                    transition={pageTransition}
                >
                {children}
                </motion.div>
            </AnimatePresence>
      </main>
      <div className="fixed bottom-6 right-6 z-20 flex flex-col gap-3">
             <Dialog>
                <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-14 w-14 rounded-full shadow-2xl bg-background/80 backdrop-blur-md">
                        <MessageSquare className="w-6 h-6"/>
                        <span className="sr-only">Help</span>
                    </Button>
                </DialogTrigger>
                 <DialogContent>
                    <DialogHeader><DialogTitle>Live Support</DialogTitle><DialogDescription>This feature is coming soon.</DialogDescription></DialogHeader>
                </DialogContent>
            </Dialog>
            <Dialog>
                <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-14 w-14 rounded-full shadow-2xl bg-background/80 backdrop-blur-md">
                        <Shield className="w-6 h-6"/>
                        <span className="sr-only">Safety Toolkit</span>
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader><DialogTitle>Safety Toolkit</DialogTitle></DialogHeader>
                    <div className="py-4 space-y-2">
                        <Button variant="outline" className="w-full justify-start gap-2" onClick={() => toast({title: "Coming Soon!"})}><MessageSquare className="w-4 h-4"/> Share Live Location</Button>
                        <Button variant="outline" className="w-full justify-start gap-2"><a href="tel:1800-XXX-XXXX"><Phone className="w-4 h-4"/> Contact Support</a></Button>
                        <Button variant="destructive" className="w-full justify-start gap-2"><a href="tel:112"><Siren className="w-4 h-4"/> Emergency SOS</a></Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
      <Toaster />
    </div>
  );
}
