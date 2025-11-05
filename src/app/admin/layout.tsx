
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import AdminNav, { AdminMobileNav } from './admin-nav'
import { PanelLeft, LogOut, Sun, Moon } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import BrandLogo from '@/components/brand-logo'
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
import { MotionDiv } from '@/components/ui/motion-div'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'


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

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter();
  const pathname = usePathname()
  const { toast } = useToast();
  const [adminName, setAdminName] = useState('Admin');
  const [adminRole, setAdminRole] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
        const session = localStorage.getItem('curocity-session');
        if (session) {
            try {
                const parsedSession = JSON.parse(session);
                if(parsedSession.role !== 'admin') {
                    router.push('/login?role=admin');
                    return;
                }
                setAdminName(parsedSession.name);
                setAdminRole(parsedSession.adminRole);
            } catch(e) {
                router.push('/login?role=admin');
            }
        } else {
            router.push('/login?role=admin');
        }
    }
  }, [router]);
  
  const getInitials = (name: string) => {
    if (!name) return 'A';
    const names = name.split(' ');
    if (names.length > 1) {
      return names[0][0] + names[names.length - 1][0];
    }
    return name.substring(0, 2);
  }

  const handleLogout = () => {
    localStorage.removeItem('curocity-session');
    toast({
        title: 'Logged Out',
        description: 'You have been successfully logged out.'
    });
    router.push('/');
  }

  if (!isMounted) return null;

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4 sm:px-6">
       <div className="flex items-center gap-2">
         <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
             <SheetTrigger asChild>
                 <Button variant="outline" size="icon" className="shrink-0">
                     <PanelLeft className="h-5 w-5" />
                     <span className="sr-only">Toggle navigation menu</span>
                 </Button>
             </SheetTrigger>
             <SheetContent side="left" className="p-0">
                  <SheetHeader className="h-16 flex flex-row items-center border-b px-6">
                      <SheetTitle className="sr-only">Main Menu</SheetTitle>
                      <SheetDescription className="sr-only">Navigation links for the admin panel.</SheetDescription>
                      <Link href="/" className="flex items-center gap-2 font-semibold">
                         <BrandLogo />
                      </Link>
                  </SheetHeader>
                  <div className="flex-1 overflow-auto py-2">
                     <AdminMobileNav setOpen={setIsMobileMenuOpen} />
                 </div>
             </SheetContent>
         </Sheet>
         <div className="hidden md:block">
            <h1 className="text-xl font-semibold">Admin Dashboard</h1>
         </div>
       </div>

       <div className="ml-auto flex items-center gap-4">
           <ThemeToggle />
           <DropdownMenu>
           <DropdownMenuTrigger asChild>
             <Button variant="secondary" size="icon" className="rounded-full">
               <Avatar className="h-8 w-8">
                 <AvatarImage src={`https://picsum.photos/40/40?random=${adminName}`} alt={adminName} data-ai-hint="administrator portrait" />
                 <AvatarFallback>{getInitials(adminName).toUpperCase()}</AvatarFallback>
               </Avatar>
               <span className="sr-only">Toggle user menu</span>
             </Button>
           </DropdownMenuTrigger>
           <DropdownMenuContent align="end">
             <DropdownMenuLabel>{adminName} ({adminRole})</DropdownMenuLabel>
             <DropdownMenuSeparator />
             <DropdownMenuItem onClick={() => router.push('/admin/settings')}>Settings</DropdownMenuItem>
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
                             You will be returned to the main login page and will need to sign in again to access the admin panel.
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

      <main className="flex flex-1 flex-col p-4 md:p-8 gap-4 md:gap-8">
        <MotionDiv
           key={pathname}
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.5, ease: 'easeInOut' }}
           className="flex-1 flex flex-col"
         >
          {children}
        </MotionDiv>
      </main>
    </div>
  );
}
