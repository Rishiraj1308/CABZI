
      'use client'
      
      import { type ReactNode, useState, useEffect } from 'react'
      import Link from 'next/link'
      import { useRouter } from 'next/navigation'
      
      import { Button } from '@/components/ui/button'
      import AdminNav, { AdminMobileNav } from './components/admin-nav'
      import { PanelLeft } from 'lucide-react'
      import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
      import BrandLogo from '@/components/shared/brand-logo'
      import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
      import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
      import { ThemeToggle } from './components/theme-toggle'
      import { LogoutButton } from './components/logout-button'
      import { Skeleton } from '@/components/ui/skeleton'
      
      interface AdminSession {
        name: string;
        adminRole: string;
      }

      export default function AdminLayout({ children }: { children: ReactNode }) {
        const router = useRouter();
        const [session, setSession] = useState<AdminSession | null>(null);
        const [isLoading, setIsLoading] = useState(true);
      
        useEffect(() => {
          let sessionData: string | null = null;
          try {
             sessionData = localStorage.getItem('curocity-admin-session');
          } catch (e) {
            // localStorage not available
          }
          
          if (sessionData) {
            const parsedSession = JSON.parse(sessionData);
            if (parsedSession.isLoggedIn) {
              setSession(parsedSession);
            } else {
              router.replace('/login?role=admin');
            }
          } else {
            router.replace('/login?role=admin');
          }

          setIsLoading(false);
        }, [router]);
        
        const getInitials = (name: string) => {
          if (!name) return 'A';
          const names = name.split(' ');
          if (names.length > 1) {
            return names[0][0] + names[names.length - 1][0];
          }
          return name.substring(0, 2);
        }
      
        if (isLoading || !session) {
            return (
                <div className="flex h-screen w-full flex-col">
                    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4 sm:px-6">
                        <Skeleton className="h-10 w-10 md:hidden" />
                        <Skeleton className="h-8 w-48 hidden md:block" />
                        <div className="ml-auto flex items-center gap-4">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <Skeleton className="h-10 w-10 rounded-full" />
                        </div>
                    </header>
                    <main className="flex-1 p-4 md:p-8">
                        <Skeleton className="h-full w-full" />
                    </main>
                </div>
            )
        }
      
        return (
          <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4 sm:px-6">
             <div className="flex items-center gap-2">
               <Sheet>
                   <SheetTrigger asChild>
                       <Button variant="outline" size="icon" className="shrink-0 md:hidden">
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
                        <AdminMobileNav />
                   </SheetContent>
               </Sheet>
               <div className="hidden md:block">
                  <AdminNav />
               </div>
             </div>
      
             <div className="ml-auto flex items-center gap-4">
                 <ThemeToggle />
                 <DropdownMenu>
                 <DropdownMenuTrigger asChild>
                   <Button variant="secondary" size="icon" className="rounded-full">
                     <Avatar className="h-8 w-8">
                       <AvatarImage src={`https://i.pravatar.cc/40?u=${session.name}`} alt={session.name} data-ai-hint="administrator portrait" />
                       <AvatarFallback>{getInitials(session.name).toUpperCase()}</AvatarFallback>
                     </Avatar>
                     <span className="sr-only">Toggle user menu</span>
                   </Button>
                 </DropdownMenuTrigger>
                 <DropdownMenuContent align="end">
                   <DropdownMenuLabel>{session.name} ({session.adminRole})</DropdownMenuLabel>
                   <DropdownMenuSeparator />
                   <DropdownMenuItem asChild>
                      <Link href="/admin/settings">Settings</Link>
                   </DropdownMenuItem>
                   <DropdownMenuItem asChild>
                      <Link href="/admin/support">Support</Link>
                   </DropdownMenuItem>
                   <DropdownMenuSeparator />
                   <LogoutButton />
                 </DropdownMenuContent>
               </DropdownMenu>
             </div>
            </header>
      
            <main className="flex flex-1 flex-col p-4 md:p-8 gap-4 md:gap-8">
              {children}
            </main>
          </div>
        );
      }
      
