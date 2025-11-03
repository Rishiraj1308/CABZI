
'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Toaster } from "@/components/ui/toaster";
import { Button } from '@/components/ui/button';
import { Home, History, Menu, LogOut, Heart, Gift, PanelLeft, Landmark, Sun, Moon, Settings, User, Calendar, Car, MapPin, LifeBuoy, Search, MessageSquare, Shield, Phone, Siren, Languages, Wallet } from 'lucide-react';
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
import { useLanguage } from '@/hooks/use-language';


const navItems = [
    { href: '/user', label: 'Services', icon: Home, comingSoon: false },
    { href: '/user/activity', label: 'My Activity', icon: History, comingSoon: false },
    { href: '/user/profile', label: 'Profile', icon: User, comingSoon: false },
]

function LanguageToggle() {
    const { setLanguage, language } = useLanguage()
    return (
        <Button variant="ghost" size="icon" onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')} className="inline-flex items-center justify-center h-10 w-10 rounded-full border border-border bg-card/50 backdrop-blur hover:bg-accent/80" aria-label="Switch language" title="Switch language">
            <Languages className="h-4 w-4" />
        </Button>
    )
}

function LocationDisplay() {
  const [locationAddress, setLocationAddress] = useState('Locating...');

  useEffect(() => {
    let isMounted = true;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          if (!isMounted) return;
          const { latitude, longitude } = position.coords;
          try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=14`);
            if (!response.ok || !isMounted) return;
            const data = await response.json();
            const address = data.address;
            const primaryLocation = address.suburb || address.neighbourhood || address.city || address.town || address.village;
             if (isMounted) setLocationAddress(primaryLocation || data.display_name.split(',')[0]);
          } catch (error) {
             if (isMounted) setLocationAddress('Location details unavailable');
          }
        },
        () => {
           if (isMounted) setLocationAddress('Location access denied');
        }
      );
    } else {
       if (isMounted) setLocationAddress('Geolocation not supported');
    }
    return () => { isMounted = false; };
  }, []);

  return (
    <div className="hidden md:flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-2 text-sm backdrop-blur">
      <MapPin className="h-4 w-4 text-muted-foreground" />
      <span className="font-medium text-foreground truncate">{locationAddress}</span>
    </div>
  );
}


function ThemeToggle() {
    const { theme, setTheme } = useTheme()
    return (
      <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="inline-flex items-center justify-center h-10 w-10 rounded-full border border-border bg-card/50 backdrop-blur hover:bg-accent/80" aria-label="Toggle theme" title="Toggle theme">
        <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    )
}

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMounted, setIsMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
    },
    in: {
      opacity: 1,
    },
    out: {
      opacity: 0,
    },
  };

  const pageTransition = {
    type: 'tween',
    ease: 'anticipate',
    duration: 0.5,
  };

  const OuterContainer = ({ children }: { children: React.ReactNode }) => (
     <div className={cn("h-full min-h-screen antialiased text-foreground aurora-background")} style={{fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, 'Helvetica Neue', 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'sans-serif'"}}>
      {children}
    </div>
  )


  if (!isMounted || isUserLoading) {
    return (
        <OuterContainer>
             <div className="flex h-screen w-full flex-col"></div>
        </OuterContainer>
    );
  }
  
  return (
    <OuterContainer>
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
             <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-br from-amber-500/10 via-amber-400/10 to-amber-300/10 backdrop-blur-lg">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <nav className="flex items-center justify-between py-4">
                        <SheetTrigger asChild>
                            <Button id="openDrawer" className="inline-flex items-center justify-center h-10 w-10 rounded-full border border-border bg-card/50 backdrop-blur hover:bg-accent/80 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/30" aria-label="Open menu" aria-controls="drawer" aria-expanded={isMobileMenuOpen} title="Open menu">
                                <Menu className="h-5 w-5"></Menu>
                            </Button>
                        </SheetTrigger>
                        
                        <LocationDisplay />

                        <div className="flex items-center gap-2">
                            <ThemeToggle />
                            <LanguageToggle />
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                 <Button variant="ghost" size="icon" className="rounded-full w-10 h-10 border border-border bg-card/50 backdrop-blur hover:bg-accent/80">
                                   <Avatar className="h-8 w-8">
                                      <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || 'User'} />
                                      <AvatarFallback>{getInitials(user?.displayName)}</AvatarFallback>
                                   </Avatar>
                                 </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                                  <DropdownMenuSeparator/>
                                  <DropdownMenuItem onClick={() => {router.push('/user/profile'); setIsMobileMenuOpen(false);}}><User className="w-4 h-4 mr-2"/> Profile</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {router.push('/user/wallet'); setIsMobileMenuOpen(false);}}><Wallet className="w-4 h-4 mr-2"/> Wallet</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {router.push('/user/offers'); setIsMobileMenuOpen(false);}}><Gift className="w-4 h-4 mr-2"/> Offers</DropdownMenuItem>
                                  <DropdownMenuSeparator/>
                                   <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                          <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                                              <LogOut className="w-4 h-4 mr-2"/> Logout
                                          </DropdownMenuItem>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                          <AlertDialogHeader>
                                              <AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                                              <AlertDialogAction onClick={handleLogout} className="bg-destructive hover:bg-destructive/90">Logout</AlertDialogAction>
                                          </AlertDialogFooter>
                                      </AlertDialogContent>
                                   </AlertDialog>
                              </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </nav>
                </div>
            </header>
            <SheetContent side="left" className="w-64 p-0">
                <SheetHeader className="border-b p-4">
                    <SheetTitle><BrandLogo/></SheetTitle>
                </SheetHeader>
                <div className="p-4 space-y-2">
                    {navItems.map((item) => (
                        <Button
                            key={item.href}
                            variant={pathname === item.href ? 'secondary' : 'ghost'}
                            className="w-full justify-start"
                            onClick={() => {
                                router.push(item.href);
                                setIsMobileMenuOpen(false);
                            }}
                        >
                            <item.icon className="mr-2 h-4 w-4" />
                            {item.label}
                        </Button>
                    ))}
                </div>
            </SheetContent>
        </Sheet>
        <AnimatePresence mode="wait">
            <motion.main 
                key={pathname}
                initial="initial"
                animate="in"
                exit="out"
                variants={pageVariants}
                transition={pageTransition}
                className="pt-24"
            >
            {children}
            </motion.main>
        </AnimatePresence>
        <div className="fixed bottom-5 right-5 z-30 flex flex-col items-center gap-3">
            <Button className="h-12 w-12 rounded-full border border-border bg-card/50 backdrop-blur shadow-xl hover:bg-accent/80 inline-flex items-center justify-center focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/30" title="Open chat">
              <MessageSquare className="h-5 w-5" />
              <span className="sr-only">Open chat</span>
            </Button>
            <Button className="h-12 w-12 rounded-full border border-border bg-card/50 backdrop-blur shadow-xl hover:bg-accent/80 inline-flex items-center justify-center focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/30" title="Safety">
              <Shield className="h-5 w-5" />
              <span className="sr-only">Safety</span>
            </Button>
        </div>
        <footer className="mt-10 border-t border-border/30">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Curocity. All rights reserved.</p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <Link href="/terms" className="hover:text-primary focus:outline-none focus-visible:underline">Terms</Link>
              <Link href="/privacy" className="hover:text-primary focus:outline-none focus-visible:underline">Privacy</Link>
            </div>
          </div>
        </footer>
      <Toaster />
    </OuterContainer>
  );
}
