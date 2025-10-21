'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut, Sun, Moon, LayoutDashboard, Calendar, User, PanelLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/toaster'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { useToast } from '@/hooks/use-toast'
import BrandLogo from '@/components/brand-logo'
import { useTheme } from 'next-themes'
import { useFirebase } from '@/firebase/client-provider'
import { MotionDiv } from '@/components/ui/motion-div'

const navItems = [
  { href: '/doctor', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/doctor/appointments', label: 'My Appointments', icon: Calendar },
  { href: '/doctor/profile', label: 'My Profile', icon: User },
]

function DoctorNav() {
  const pathname = usePathname()
  return (
    <nav className="grid items-start gap-1 px-4 text-sm font-medium md:flex md:flex-row md:items-center md:gap-5 md:px-0">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary md:p-0',
            pathname === item.href && 'text-primary'
          )}
          legacyBehavior>
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

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { toast } = useToast();
  const [userName, setUserName] = useState('');
  const { auth } = useFirebase();
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
        const sessionString = localStorage.getItem('cabzi-doctor-session');
        if (sessionString) {
            try {
                setUserName(JSON.parse(sessionString).name);
            } catch (error) {
                console.error("Failed to parse session, redirecting", error);
                localStorage.removeItem('cabzi-doctor-session');
                router.push('/login?role=doctor');
            }
        } else {
            router.push('/login?role=doctor');
        }
    }
  }, [router]);

  const handleLogout = async () => {
    if (auth) auth.signOut();
    localStorage.removeItem('cabzi-doctor-session');
    toast({
        title: 'Logged Out',
        description: 'You have been successfully logged out.'
    });
    router.push('/');
  }

  const getInitials = (name: string) => {
    if (!name) return 'Dr';
    const names = name.split(' ');
    if (names.length > 1) {
      return `Dr. ${names[names.length-1][0]}`;
    }
    return `Dr. ${name.substring(0, 1)}`;
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-4 md:px-6 z-50">
         <nav className="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 lg:gap-6">
           <Link
             href="#"
             className="flex items-center gap-2 text-lg font-semibold md:text-base"
             legacyBehavior>
             <BrandLogo />
             <span className="ml-2 text-xs font-semibold px-2 py-1 rounded-full bg-blue-500/20 text-blue-600">Doctor</span>
           </Link>
            <div className="w-px bg-border h-6 mx-2"></div>
            <DoctorNav />
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
                 <Link href="/" className="flex items-center gap-2 font-semibold" legacyBehavior>
                   <BrandLogo />
                   <span className="ml-2 text-xs font-semibold px-2 py-1 rounded-full bg-blue-500/20 text-blue-600">Doctor</span>
                 </Link>
              </div>
              <DoctorNav />
           </SheetContent>
         </Sheet>
         <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
            <div className="ml-auto flex-1 sm:flex-initial"></div>
            <ThemeToggle/>
           <DropdownMenu>
             <DropdownMenuTrigger asChild>
               <Button variant="secondary" size="icon" className="rounded-full">
                 <Avatar className="h-8 w-8">
                   <AvatarImage src="https://i.pravatar.cc/40?u=doctor" alt={userName} data-ai-hint="doctor portrait" />
                   <AvatarFallback>{getInitials(userName).toUpperCase()}</AvatarFallback>
                 </Avatar>
                 <span className="sr-only">Toggle user menu</span>
               </Button>
             </DropdownMenuTrigger>
             <DropdownMenuContent align="end">
               <DropdownMenuLabel>Dr. {userName}</DropdownMenuLabel>
               <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => router.push('/doctor/profile')}>My Profile</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => router.push('/doctor/support')}>Support</DropdownMenuItem>
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
            key={usePathname()}
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
