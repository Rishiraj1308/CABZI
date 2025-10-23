'use client'

import React, { useState, useEffect } from 'react'
import { Toaster } from "@/components/ui/toaster";
import { Button } from '@/components/ui/button';
import { Home, History, Menu, LogOut, Heart, Gift, PanelLeft, Landmark, Sun, Moon, Settings, User, Calendar, Car } from 'lucide-react';
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
    { href: '/user', label: 'Services', icon: Home, comingSoon: false },
    { href: '/user/rides', label: 'My Rides', icon: History, comingSoon: false },
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

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  
  const [session, setSession] = useState<any | null>(null);
  const { user, isUserLoading, db, auth } = useFirebase();

  useEffect(() => {
    setIsMounted(true);
    if (!isUserLoading && !user) {
      if (window.location.pathname.startsWith('/user')) {
        router.push('/login');
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
      router.push('/login');
    });
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const names = name.split(' ');
    return names.length > 1 ? names[0][0] + names[1][0] : name.substring(0, 2);
  }

  if (!isMounted || isUserLoading || !session) {
    return null; // Or a loading spinner
  }
  
  return (
    <div className="flex h-screen w-full flex-col aurora-background">
       <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
        <Link href="/user">
          <BrandLogo />
        </Link>
        <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4 justify-end">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={`https://placehold.co/100x100.png`} alt={session?.name} data-ai-hint="customer portrait" />
                    <AvatarFallback>{getInitials(session?.name || '').toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="sr-only">Toggle user menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Hi, {session?.name}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => router.push('/user/profile')}>Profile</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => router.push('/user/support')}>Support</DropdownMenuItem>
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
                      <AlertDialogDescription>You will need to sign in again to book a ride.</AlertDialogDescription>
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
      </header>
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          {children}
      </main>
       <nav className="fixed bottom-0 left-0 right-0 z-10 border-t bg-background/80 backdrop-blur-sm md:hidden">
        <div className="mx-auto grid h-16 max-w-lg grid-cols-3 items-center px-4">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} legacyBehavior>
              <a className={cn(
                "flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground",
                pathname === item.href && "text-primary font-semibold"
              )}>
                <item.icon className="h-5 w-5" />
                {item.label}
              </a>
            </Link>
          ))}
        </div>
      </nav>
      <Toaster />
    </div>
  );
}
