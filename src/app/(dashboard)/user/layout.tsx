
'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Toaster } from "@/components/ui/toaster";
import { Button } from '@/components/ui/button';
import { Home, History, Menu, LogOut, Gift, PanelLeft, Landmark, Sun, Moon, Settings, User, Calendar, Car, MapPin, LifeBuoy, Search, MessageSquare, Shield, Phone, Siren, Languages, Wallet } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import BrandLogo from '@/components/shared/brand-logo';
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
import { useFirebase } from '@/lib/firebase/client-provider';
import { doc, updateDoc } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/context/language-provider';


const navItems = [
    { href: '/user', label: 'Services', icon: Home, comingSoon: false },
    { href: '/user/activity', label: 'My Activity', icon: History, comingSoon: false },
    { href: '/user/wallet', label: 'Wallet', icon: Wallet, comingSoon: false },
    { href: '/user/profile', label: 'Profile', icon: User, comingSoon: false },
    { href: '/user/support', label: 'Support', icon: LifeBuoy, comingSoon: false },
]

function LanguageToggle() {
    const { setLanguage, language } = useLanguage()
    return (
        <Button variant="ghost" size="icon" onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')} className="inline-flex items-center justify-center h-10 w-10 rounded-full border border-border bg-card/50 backdrop-blur hover:bg-accent/80" aria-label="Switch language" title="Switch language">
            <Languages className="h-4 w-4" />
        </Button>
    )
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
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  
  const { user, isUserLoading, db, auth } = useFirebase();

  const isMapPage = pathname === '/user/ride-map';

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

  const menuContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const menuItemVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: { opacity: 1, y: 0 },
  };

  if (!isMounted || isUserLoading) {
    return (
        <div className="flex h-screen w-full flex-col bg-background"></div>
    );
  }
  
  return (
    <div className={cn("h-full min-h-screen antialiased text-foreground bg-background")} style={{fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, 'Helvetica Neue', 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'sans-serif'"}}>
        {!isMapPage && (
             <header className="fixed top-0 left-0 right-0 z-50 bg-background/30 backdrop-blur-lg">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <nav className="flex items-center justify-between py-4">
                        <Link href="/user" className="flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-2 backdrop-blur hover:bg-accent/80 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/30" aria-label="Home">
                            <BrandLogo iconClassName='w-8 h-8' />
                        </Link>

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
                              <DropdownMenuContent asChild align="end">
                                <motion.div
                                  variants={menuContainerVariants}
                                  initial="hidden"
                                  animate="visible"
                                >
                                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                                  <DropdownMenuSeparator/>
                                  {navItems.map(item => (
                                    <motion.div key={item.href} variants={menuItemVariants}>
                                      <DropdownMenuItem onClick={() => router.push(item.href)}>
                                        <item.icon className="w-4 h-4 mr-2"/> {item.label}
                                      </DropdownMenuItem>
                                    </motion.div>
                                  ))}
                                  <DropdownMenuSeparator/>
                                   <motion.div variants={menuItemVariants}>
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
                                   </motion.div>
                                </motion.div>
                              </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </nav>
                </div>
            </header>
        )}
        <AnimatePresence mode="wait">
            <motion.main 
                key={pathname}
                initial="initial"
                animate="in"
                exit="out"
                variants={pageVariants}
                transition={pageTransition}
                className={cn(isMapPage ? 'h-screen' : 'pt-24')}
            >
            {children}
            </motion.main>
        </AnimatePresence>
        {!isMapPage && (
            <>
                <div className="fixed bottom-5 right-5 z-30 flex flex-col items-center gap-3">
                    <Button className="h-12 w-12 rounded-full border border-border bg-card/50 backdrop-blur shadow-xl hover:bg-accent/80 inline-flex items-center justify-center focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/30" title="Open chat">
                      <MessageSquare className="h-5 w-5 fill-background/80" stroke="black" strokeWidth={1.5} />
                      <span className="sr-only">Open chat</span>
                    </Button>
                    <Button className="h-12 w-12 rounded-full border border-border bg-card/50 backdrop-blur shadow-xl hover:bg-accent/80 inline-flex items-center justify-center focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/30" title="Safety">
                      <Shield className="h-5 w-5 fill-background/80" stroke="black" strokeWidth={1.5} />
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
            </>
        )}
      <Toaster />
    </div>
  );
}
