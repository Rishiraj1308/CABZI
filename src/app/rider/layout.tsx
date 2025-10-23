
'use client'

import React, { useState, useEffect } from 'react'
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
import { doc, updateDoc } from 'firebase/firestore';


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
  
  const [session, setSession] = useState<any | null>(null);
  const { user, isUserLoading, db, auth } = useFirebase();

  useEffect(() => {
    setIsMounted(true);
    if (!isUserLoading && !user) {
      if (window.location.pathname.startsWith('/rider')) {
        router.push('/login?role=user');
      }
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    const sessionData = localStorage.getItem('cabzi-session');
    if (sessionData) {
      setSession(JSON.parse(sessionData));
    }
  }, []);

  const handleLogout = () => {
    if (!auth) return;
    if (session?.userId && db) {
      const userDocRef = doc(db, 'users', session.userId);
      updateDoc(userDocRef, { isOnline: false, currentLocation: null });
    }
    auth.signOut().then(() => {
      localStorage.removeItem('cabzi-session');
      router.push('/login?role=user');
    });
  };

  const getInitials = (name: string) => {
    if (!name) return 'R';
    const names = name.split(' ');
    return names.length > 1 ? names[0][0] + names[1][0] : name.substring(0, 2);
  }

  if (!isMounted || isUserLoading || !session) {
    return null; // Or a loading spinner
  }
  
  return (
      <div className="relative h-screen flex flex-col">
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
      <main className="flex-1 flex flex-col h-full">
          {children}
      </main>
      <Toaster />
      </div>
  );
}
