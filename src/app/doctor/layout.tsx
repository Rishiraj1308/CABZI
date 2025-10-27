

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut, Sun, Moon, LayoutDashboard, Calendar, User, PanelLeft, Bell, BarChart, Settings, Power } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/toaster'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { useToast } from '@/hooks/use-toast'
import BrandLogo from '@/components/brand-logo'
import { useTheme } from 'next-themes'
import { useFirebase } from '@/firebase/client-provider'
import { MotionDiv } from '@/components/ui/motion-div'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { doc, onSnapshot, updateDoc } from 'firebase/firestore'
import { Skeleton } from '@/components/ui/skeleton'


const navItems = [
  { href: '/doctor', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/doctor/appointments', label: 'My Appointments', icon: Calendar },
  { href: '/doctor/analytics', label: 'Analytics', icon: BarChart },
  { href: '/doctor/profile', label: 'Profile & Settings', icon: User },
]

const mockNotifications = [
    { id: 1, text: 'Patient Priya Sharma has checked in for her 10:00 AM appointment.', time: '5 mins ago', read: false },
    { id: 2, text: 'Lab reports uploaded for Rohan Verma. Please review.', time: '1 hour ago', read: false },
    { id: 3, text: 'Appointment for Suresh Kumar has been cancelled by the patient.', time: '3 hours ago', read: true },
    { id: 4, text: 'New follow-up scheduled for Anjali Mehra tomorrow.', time: 'Yesterday', read: true },
];

function ThemeToggle() {
    const { setTheme } = useTheme()
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
               <Button variant="ghost" size="icon">
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

function AvailabilityToggle({ hospitalId, doctorId }: { hospitalId: string | null; doctorId: string | null }) {
    const [isAvailable, setIsAvailable] = useState(false);
    const { db } = useFirebase();
    const { toast } = useToast();

    useEffect(() => {
        if (!db || !hospitalId || !doctorId) return;
        const doctorRef = doc(db, `ambulances/${hospitalId}/doctors`, doctorId);
        const unsubscribe = onSnapshot(doctorRef, (docSnap) => {
            if (docSnap.exists()) {
                setIsAvailable(docSnap.data().isAvailable || false);
            }
        });
        return () => unsubscribe();
    }, [db, hospitalId, doctorId]);

    const handleToggle = async (checked: boolean) => {
        if (!db || !hospitalId || !doctorId) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not update availability. Session details missing.' });
            return;
        }
        const doctorRef = doc(db, `ambulances/${hospitalId}/doctors`, doctorId);
        try {
            await updateDoc(doctorRef, { isAvailable: checked });
            toast({
                title: checked ? "You're now Online" : "You're now Offline",
                description: checked ? "You will appear for new bookings." : "You won't receive new booking requests.",
            });
        } catch (error) {
            console.error("Availability toggle error:", error);
            toast({ variant: 'destructive', title: 'Update Failed' });
        }
    };

    return (
        <div className="flex items-center gap-2">
            <Switch id="availability-toggle-header" checked={isAvailable} onCheckedChange={handleToggle} />
            <Label htmlFor="availability-toggle-header" className={cn("font-medium", isAvailable ? 'text-green-600' : 'text-muted-foreground')}>
                {isAvailable ? 'Online' : 'Offline'}
            </Label>
        </div>
    );
}

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [userName, setUserName] = useState('');
  const [hospitalId, setHospitalId] = useState<string | null>(null);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const { auth, user, isUserLoading } = useFirebase();
  const unreadCount = mockNotifications.filter(n => !n.read).length;
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  
  const handleLogout = useCallback(() => {
    if (auth) auth.signOut();
    localStorage.removeItem('curocity-doctor-session');
    localStorage.removeItem('curocity-session');
    toast({
        title: 'Logged Out',
        description: 'You have been successfully logged out.'
    });
    router.push('/');
  }, [auth, router, toast]);

  useEffect(() => {
    if (isUserLoading) return;
    if (!user) {
        router.push('/login?role=doctor');
        setIsSessionLoading(false);
        return;
    }

    const sessionString = localStorage.getItem('curocity-doctor-session');
    if (!sessionString) {
        handleLogout();
        return;
    }
    try {
        const sessionData = JSON.parse(sessionString);
         if (!sessionData.role || sessionData.role !== 'doctor') {
            handleLogout();
            return;
        }
        setUserName(sessionData.name);
        setHospitalId(sessionData.hospitalId);
        setDoctorId(sessionData.id); 
    } catch (error) {
        console.error("Failed to parse session, redirecting", error);
        handleLogout();
    }
    setIsSessionLoading(false);
  }, [user, isUserLoading, router, handleLogout]);


  if (isSessionLoading) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <Skeleton className="h-screen w-full" />
        </div>
    );
  }

  const getInitials = (name: string) => {
    if (!name) return 'Dr';
    const names = name.split(' ');
    if (names.length > 1) {
      return `Dr. ${names[names.length - 1][0]}`;
    }
    return `Dr. ${name.substring(0, 1)}`;
  }

  return (
    <div className="flex min-h-screen w-full bg-muted/40">
        <aside className="hidden w-20 flex-col items-center border-r bg-background sm:flex">
            <div className="flex h-16 items-center justify-center border-b">
                 <Link href="/doctor"><BrandLogo hideText /></Link>
            </div>
            <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
              <TooltipProvider>
                {navItems.map((item) => (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8",
                          pathname === item.href && "bg-accent text-accent-foreground"
                        )}
                      >
                        <item.icon className="h-5 w-5" />
                        <span className="sr-only">{item.label}</span>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                ))}
              </TooltipProvider>
            </nav>
        </aside>

        <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14 flex-1">
            <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
                <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                    <SheetTrigger asChild>
                        <Button size="icon" variant="outline" className="sm:hidden">
                            <PanelLeft className="h-5 w-5" />
                            <span className="sr-only">Toggle Menu</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="sm:max-w-xs p-0">
                         <div className="flex h-16 items-center border-b px-6">
                             <Link href="/doctor" className="flex items-center gap-2 font-semibold">
                                <BrandLogo />
                             </Link>
                        </div>
                        <nav className="grid gap-2 text-lg font-medium p-4">
                            {navItems.map((item) => (
                                <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={cn(
                                    'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
                                    pathname === item.href && 'bg-muted text-primary'
                                )}
                                >
                                <item.icon className="h-5 w-5" />
                                {item.label}
                                </Link>
                            ))}
                        </nav>
                    </SheetContent>
                </Sheet>
                 <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4 justify-end">
                    <AvailabilityToggle hospitalId={hospitalId} doctorId={doctorId} />
                    <ThemeToggle/>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="relative">
                                <Bell className="h-5 w-5"/>
                                {unreadCount > 0 && <Badge className="absolute -top-1 -right-1 h-4 w-4 justify-center p-0">{unreadCount}</Badge>}
                                <span className="sr-only">Toggle notifications</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-80">
                            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                             {mockNotifications.map(notification => (
                                <DropdownMenuItem key={notification.id} className={cn("flex items-start gap-2 whitespace-normal", !notification.read && "font-semibold")}>
                                <div className={cn("mt-1 h-2 w-2 rounded-full", !notification.read ? "bg-primary" : "bg-transparent")}/>
                                <div className="flex-1">
                                    <p className="text-xs">{notification.text}</p>
                                    <p className="text-xs text-muted-foreground mt-1">{notification.time}</p>
                                </div>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon" className="overflow-hidden rounded-full">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src="https://i.pravatar.cc/40?u=doctor" alt={userName} data-ai-hint="doctor portrait" />
                                    <AvatarFallback>{getInitials(userName).toUpperCase()}</AvatarFallback>
                                </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Dr. {userName}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={() => router.push('/doctor/profile')}>Profile</DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => toast({title: "Coming Soon!"})}>Support</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                                    <LogOut className="mr-2 h-4 w-4"/> Logout
                                    </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle></AlertDialogHeader>
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
            <main className="flex-1 overflow-auto p-4 sm:px-6 sm:py-0">
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
        </div>
        <Toaster />
    </div>
  );
}
