
'use client'

import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Landmark, History, User, PanelLeft, LogOut, Sun, Moon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/toaster'
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
import { doc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore'
import { MotionDiv } from '@/components/ui/motion-div'
import { Skeleton } from '@/components/ui/skeleton'

// Centralized Partner Provider
interface PartnerDataContextType {
    partnerData: any;
    isLoading: boolean;
}

const PartnerDataContext = createContext<PartnerDataContextType | null>(null);

export const usePartnerData = () => {
    const context = useContext(PartnerDataContext);
    if (!context) {
        throw new Error('usePartnerData must be used within a PartnerProvider');
    }
    return context;
};

function PartnerProvider({ children, partnerType }: { children: React.ReactNode, partnerType: 'driver' | 'mechanic' }) {
    const [partnerData, setPartnerData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { db, user, isUserLoading } = useFirebase();
    const router = useRouter();
    const pathname = usePathname();

     const handleLogout = useCallback(() => {
        if (partnerData?.id && db) {
            updateDoc(doc(db, partnerType === 'driver' ? 'partners' : 'mechanics', partnerData.id), { 
                isOnline: false, 
                isAvailable: false, 
                lastSeen: serverTimestamp() 
            }).catch(e => console.warn("Failed to update status on logout:", e));
        }
        localStorage.removeItem(`curocity-${partnerType === 'driver' ? 'session' : 'resq-session'}`);
        router.push('/');
    }, [db, partnerData, partnerType, router]);
    
    useEffect(() => {
        if (isUserLoading || !db) return;

        const isOnboarding = pathname.includes('onboarding');
        if (!user) {
            if (!isOnboarding) router.replace('/login?role=driver');
            setIsLoading(false);
            return;
        }

        const sessionKey = `curocity-${partnerType === 'driver' ? 'session' : 'resq-session'}`;
        const session = localStorage.getItem(sessionKey);
        
        if (!session) {
            if (!isOnboarding) handleLogout();
            setIsLoading(false);
            return;
        }

        let unsubscribe: (() => void) | null = null;
        let isSubscribed = true;
        
        try {
            const sessionData = JSON.parse(session);
            const collectionName = partnerType === 'driver' ? 'partners' : 'mechanics';
            const partnerDocRef = doc(db, collectionName, sessionData.partnerId);

            unsubscribe = onSnapshot(partnerDocRef, (docSnap) => {
                if (!isSubscribed) return;
                if (docSnap.exists()) {
                    setPartnerData({ id: docSnap.id, ...docSnap.data() });
                } else {
                    if (!isOnboarding) handleLogout();
                }
                setIsLoading(false);
            }, (error) => {
                console.error("Snapshot error:", error);
                if (!isOnboarding) handleLogout();
                setIsLoading(false);
            });
        } catch (e) {
            if (!isOnboarding) handleLogout();
            setIsLoading(false);
        }
        
        return () => {
            isSubscribed = false;
            if (unsubscribe) unsubscribe();
        };

    }, [isUserLoading, user, db, handleLogout, pathname, router, partnerType]);

    return (
        <PartnerDataContext.Provider value={{ partnerData, isLoading }}>
            {children}
        </PartnerDataContext.Provider>
    );
}


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

function MechanicLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { auth } = useFirebase();
  const { partnerData, isLoading: isSessionLoading } = usePartnerData();

  const handleLogout = useCallback(() => {
    if (auth) auth.signOut();
    localStorage.removeItem('curocity-resq-session');
    localStorage.removeItem('curocity-session');
    toast({
        title: 'Logged Out',
        description: 'You have been successfully logged out.'
    });
    router.push('/');
  }, [auth, router, toast]);

  if (pathname.includes('/onboarding')) {
    return <>{children}<Toaster /></>;
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
           <Link href="/" className="flex items-center gap-2 text-lg font-semibold md:text-base">
                <BrandLogo />
                <span className="ml-2 text-xs font-semibold px-2 py-1 rounded-full bg-orange-500/20 text-orange-600">ResQ</span>
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
                   <AvatarImage src="https://i.pravatar.cc/40?u=mechanic" alt={partnerData?.name} data-ai-hint="mechanic portrait" />
                   <AvatarFallback>{getInitials(partnerData?.name).toUpperCase()}</AvatarFallback>
                 </Avatar>
                 <span className="sr-only">Toggle user menu</span>
               </Button>
             </DropdownMenuTrigger>
             <DropdownMenuContent align="end">
               <DropdownMenuLabel>My Account</DropdownMenuLabel>
               <DropdownMenuSeparator />
               <DropdownMenuItem onSelect={() => router.push('/mechanic/profile')}>Profile</DropdownMenuItem>
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

export default function MechanicLayout({ children }: { children: React.ReactNode }) {
    return (
        <PartnerProvider partnerType="mechanic">
            <MechanicLayoutContent>
                {children}
            </MechanicLayoutContent>
        </PartnerProvider>
    )
}
