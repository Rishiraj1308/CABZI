
'use client'

import React, { useState, useEffect } from 'react'
import { Toaster } from "@/components/ui/toaster";
import { Button } from '@/components/ui/button';
import { Home, History, Menu, LogOut, Heart, Gift, PanelLeft, Landmark, Sun, Moon, Settings, User, Calendar, Car, MapPin, LifeBuoy } from 'lucide-react';
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
import { AnimatePresence, motion } from 'framer-motion';


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
    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
        const data = await response.json();
        const address = data.address;
        const city = address.city || address.town || address.village;
        const state = address.state;
        if (city && state) {
          setLocation(`${city}, ${state}`);
        } else {
          setLocation(data.display_name.split(',').slice(0, 3).join(', '));
        }
      } catch (error) {
        setLocation('Location not found');
      }
    }, () => {
      setLocation('Location access denied');
    });
  }, []);
  
  return (
    <div className="flex items-center gap-1.5">
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

  if (!isMounted || isUserLoading) {
    return null; // Or a loading spinner
  }
  
  return (
      <div className="relative min-h-screen bg-background flex flex-col">
      <header className="absolute top-0 left-0 right-0 z-10 flex h-20 items-center justify-between px-4 md:px-6 bg-transparent">
          <div className="flex items-center gap-2">
              <Sheet open={open} onOpenChange={setOpen}>
                  <SheetTrigger asChild>
                      <Button variant="outline" size="icon" className="shadow-lg rounded-full">
                          <Menu className="h-5 w-5" />
                          <span className="sr-only">Open menu</span>
                      </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-full max-w-sm p-0 flex flex-col">
                      <SheetHeader className="p-4 border-b flex justify-center">
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
              <LocationDisplay />
          </div>
          <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="shadow-lg rounded-full" onClick={() => router.push('/user/support')}>
                  <LifeBuoy className="h-5 w-5" />
                  <span className="sr-only">Help & Support</span>
              </Button>
              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                  <Button variant="secondary" className="relative h-10 w-10 rounded-full shadow-lg">
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
      </header>
      <main className="flex-1 flex flex-col">
           <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
      </main>
      <Toaster />
    </div>
  );
}
