
'use client'

import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { collection, doc, onSnapshot, query, updateDoc, where, serverTimestamp } from "firebase/firestore";
import { LayoutDashboard, History, User, Landmark, PanelLeft, Sun, Moon, LogOut } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Toaster } from "@/components/ui/toaster";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { MotionDiv } from "@/components/ui/motion-div";
import { Skeleton } from "@/components/ui/skeleton";

import BrandLogo from "@/components/brand-logo";
import { cn } from "@/lib/utils";
import { useFirebase } from "@/firebase/client-provider";
import { useToast } from "@/hooks/use-toast";


// ----------------------------------------------------------------
// ✅ 1. PARTNER CONTEXT
// ----------------------------------------------------------------
interface MechanicData {
  id: string;
  name: string;
  isOnline: boolean;
  // Add other fields you expect to receive from Firestore
  [key: string]: any; 
}

interface MechanicContextType {
  partner: MechanicData | null;
  isLoading: boolean;
  requests: any[];
  handleAvailabilityChange: (checked: boolean) => void;
}


const MechanicContext = createContext<MechanicContextType | null>(null);

export const usePartnerData = () => {
  const ctx = useContext(MechanicContext);
  if (!ctx) throw new Error("usePartnerData must be inside provider");
  return ctx;
};


// ----------------------------------------------------------------
// ✅ 2. PROVIDER (REAL-TIME LISTENERS FIXED)
// ----------------------------------------------------------------
function MechanicProvider({ children }: { children: React.ReactNode }) {
  const { db, user, isUserLoading } = useFirebase();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const [partner, setPartner] = useState<MechanicData | null>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ✅ Logout handler
  const logout = useCallback(() => {
    localStorage.removeItem("curocity-resq-session");
    router.push("/login?role=mechanic");
  }, [router]);

  const handleAvailabilityChange = async (checked: boolean) => {
    if (!partner || !db) return;
    const mechanicRef = doc(db, 'mechanics', partner.id);
    try {
      await updateDoc(mechanicRef, { isOnline: checked, status: checked ? 'online' : 'offline' });
      toast({
        title: checked ? "You are now ONLINE" : "You are OFFLINE",
        description: checked ? "You will start receiving job requests." : "You won't receive new requests.",
      });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update your status.' });
    }
  };

  useEffect(() => {
    if (isUserLoading || !db) return;

    const session = localStorage.getItem("curocity-resq-session");
    if (!session) {
      logout();
      return;
    }

    const { partnerId } = JSON.parse(session);
    const mechRef = doc(db, "mechanics", partnerId);

    let unsubMech = () => {};
    let unsubReq = () => {};

    // ✅ Mechanic real-time listener
    unsubMech = onSnapshot(mechRef, (snap) => {
      if (!snap.exists()) {
        logout();
        return;
      }

      const data = { id: snap.id, ...snap.data() } as MechanicData;
      setPartner(data);

      // ✅ Listen to pending requests ONLY WHEN ONLINE
      if (data.isOnline === true) {
        const q = query(
          collection(db, "garageRequests"),
          where("status", "==", "pending")
        );

        unsubReq = onSnapshot(q, (reqSnap) => {
          const list = reqSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
            .filter(job => !job.rejectedBy || !job.rejectedBy.includes(partnerId));
          setRequests(list);
        });
      } else {
        setRequests([]);
        if (unsubReq) unsubReq();
      }

      setIsLoading(false);
    });

    return () => {
      unsubMech();
      if (unsubReq) unsubReq();
    };
  }, [isUserLoading, db, logout]);


  const value = useMemo(() => ({
    partner,
    isLoading,
    requests,
    handleAvailabilityChange
  }), [partner, isLoading, requests, handleAvailabilityChange]);

  return (
    <MechanicContext.Provider value={value}>
      {children}
    </MechanicContext.Provider>
  );
}


// ----------------------------------------------------------------
// ✅ 3. NAV ITEMS
// ----------------------------------------------------------------
const navItems = [
  { label: "Dashboard", href: "/mechanic", icon: LayoutDashboard },
  { label: "My Jobs", href: "/mechanic/jobs", icon: History },
  { label: "Curocity Bank", href: "/mechanic/wallet", icon: Landmark },
  { label: "Profile", href: "/mechanic/profile", icon: User },
];

function MechanicNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-2 md:flex-row md:gap-6">
      {navItems.map((item) => (
        <Link key={item.href} href={item.href}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-primary transition",
            pathname === item.href && "font-semibold text-primary"
          )}>
          <item.icon className="h-4 w-4" />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}


// ----------------------------------------------------------------
// ✅ 4. THEME TOGGLE
// ----------------------------------------------------------------
function ThemeToggle() {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Sun className="h-4 w-4 rotate-0 dark:-rotate-90" />
          <Moon className="h-4 w-4 absolute rotate-90 dark:rotate-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>Light</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>Dark</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>System</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


// ----------------------------------------------------------------
// ✅ 5. LAYOUT CONTENT
// ----------------------------------------------------------------
function MechanicLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { partner, isLoading } = usePartnerData();
  const { toast } = useToast();

  const doLogout = () => {
    localStorage.removeItem("curocity-resq-session");
    toast({ title: "Logged out" });
    router.push("/");
  };

  if (isLoading) {
    return (
      <div className="p-10">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-96 w-full mt-4" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">

      {/* HEADER */}
      <header className="flex items-center justify-between px-4 h-16 border-b bg-background/90 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <BrandLogo />
            <span className="text-xs bg-orange-500/20 px-2 py-1 rounded text-orange-600">ResQ</span>
          </Link>
          <MechanicNav />
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />

          {/* User Avatar */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="secondary" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="https://i.pravatar.cc/150?u=mech" />
                  <AvatarFallback>M</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/mechanic/profile")}>Profile</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-500" onClick={doLogout}>
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* CONTENT */}
      <main className="p-6 flex-1">
        <MotionDiv initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          {children}
        </MotionDiv>
      </main>

      <Toaster />
    </div>
  );
}


// ----------------------------------------------------------------
// ✅ 6. EXPORT DEFAULT LAYOUT
// ----------------------------------------------------------------
export default function MechanicLayout({ children }: { children: React.ReactNode }) {
  return (
    <MechanicProvider>
      <MechanicLayoutContent>
        {children}
      </MechanicLayoutContent>
    </MechanicProvider>
  );
}
