
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Car, FilePieChart, Landmark, UserCog, NotebookText, Users,
  Map, Handshake, MessageSquare, Settings, LayoutDashboard,
  Gem, Ambulance, Wrench, CalendarCheck, Banknote
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import React from 'react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const navItems = {
  operations: [
    { title: "Dashboard", href: "/admin", description: "Get a high-level overview of your platform.", icon: LayoutDashboard },
    { title: "Live Map", href: "/admin/map", description: "See all active partners and riders in real-time.", icon: Map },
    { title: "Support Center", href: "/admin/support", description: "Manage all incoming support tickets.", icon: MessageSquare },
  ],
  management: [
    { title: "Unified Partners", href: "/admin/partners", description: "Manage all Path, ResQ, and Cure partners.", icon: Handshake },
    { title: "User", href: "/admin/customers", description: "View all registered riders.", icon: Users },
    { title: "Rides Log", href: "/admin/rides", description: "Track every ride across the platform.", icon: Car },
    { title: "Cure Cases", href: "/admin/cure-cases", description: "View and manage medical emergencies.", icon: Ambulance },
    { title: "ResQ Jobs", href: "/admin/resq-cases", description: "Monitor vehicle service requests.", icon: Wrench },
    { title: "Appointments Log", href: "/admin/appointments", description: "Track booked doctor appointments.", icon: CalendarCheck },
  ],
  financial: [
    { title: "Curocity Bank", href: "/admin/bank", description: "Monitor the financial engine and loans.", icon: Landmark },
    { title: "Accounts", href: "/admin/accounts", description: "Manage expenses and ledger entries.", icon: NotebookText },
    { title: "Audit Report", href: "/admin/audit", description: "View Profit & Loss statements.", icon: FilePieChart },
    { title: "Subscriptions", href: "/admin/subscriptions", description: "Manage partner subscriptions.", icon: Gem },
    { title: "Vendors", href: "/admin/vendors", description: "Manage third-party vendor payouts.", icon: Banknote },
  ],
  growth: [
    { title: "Team Management", href: "/admin/team", description: "Manage your admin team and roles.", icon: UserCog },
    { title: "Settings", href: "/admin/settings", description: "Configure global company settings.", icon: Settings },
  ]
}

const ListItem = React.forwardRef<
  React.ElementRef<"a">,
  React.ComponentPropsWithoutRef<"a"> & { icon: React.ElementType, title: string }
>(({ className, title, children, icon: Icon, href, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <Link
          href={href || '#'}
          ref={ref}
          className={cn(
            "block select-none space-y-2 rounded-lg p-4 transition-all hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
            className
          )}
          {...props}
        >
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            <div className="text-sm font-semibold leading-none">{title}</div>
          </div>
          <p className="text-sm text-muted-foreground whitespace-normal leading-snug">
            {children}
          </p>
        </Link>
      </NavigationMenuLink>
    </li>
  );
})
ListItem.displayName = "ListItem"

export function AdminMobileNav({ setOpen }: { setOpen?: (open: boolean) => void }) {
  const pathname = usePathname();

  return (
    <div className="flex-1 overflow-auto py-3">
      <div className="grid items-start gap-4 px-4">
        <Link
          href="/admin"
          onClick={() => setOpen?.(false)}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:text-primary transition-all',
            pathname === '/admin' && 'bg-muted text-primary'
          )}
        >
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </Link>

        <Accordion type="single" collapsible className="w-full">
          {Object.entries(navItems).map(([section, items]) => (
            <AccordionItem key={section} value={section}>
              <AccordionTrigger className="text-base capitalize">
                {section === 'growth' ? 'Growth & Settings' : section}
              </AccordionTrigger>
              <AccordionContent className="pl-4">
                {items.map((item) => (
                  <Link
                    href={item.href}
                    key={item.title}
                    onClick={() => setOpen?.(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:text-primary text-sm transition-all',
                      pathname === item.href && 'text-primary'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.title}
                  </Link>
                ))}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  )
}

export default function AdminNav() {
  const pathname = usePathname()

  return (
    <NavigationMenu>
      <NavigationMenuList>

        {/* Dashboard */}
        <NavigationMenuItem>
          <Link href="/admin" legacyBehavior passHref>
            <NavigationMenuLink
              active={pathname === '/admin' || pathname === '/admin/dashboard'}
              className={navigationMenuTriggerStyle()}
            >
              Dashboard
            </NavigationMenuLink>
          </Link>
        </NavigationMenuItem>

        {/* Operations */}
        <NavigationMenuItem>
          <NavigationMenuTrigger>Operations</NavigationMenuTrigger>
          <NavigationMenuContent className="min-w-[600px] max-w-[700px] whitespace-normal rounded-xl shadow-lg bg-background">
            <ul className="grid gap-4 p-6 md:grid-cols-2">
              {navItems.operations.map((item) => (
                <ListItem key={item.title} title={item.title} href={item.href} icon={item.icon}>
                  {item.description}
                </ListItem>
              ))}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>

        {/* Management */}
        <NavigationMenuItem>
          <NavigationMenuTrigger>Management</NavigationMenuTrigger>
          <NavigationMenuContent className="min-w-[650px] max-w-[750px] whitespace-normal rounded-xl shadow-lg bg-background">
            <ul className="grid gap-4 p-6 md:grid-cols-2">
              {navItems.management.map((item) => (
                <ListItem key={item.title} title={item.title} href={item.href} icon={item.icon}>
                  {item.description}
                </ListItem>
              ))}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>

        {/* Financial */}
        <NavigationMenuItem>
          <NavigationMenuTrigger>Financial</NavigationMenuTrigger>
          <NavigationMenuContent className="min-w-[600px] max-w-[700px] whitespace-normal rounded-xl shadow-lg bg-background">
            <ul className="grid gap-4 p-6 md:grid-cols-2">
              {navItems.financial.map((item) => (
                <ListItem key={item.title} title={item.title} href={item.href} icon={item.icon}>
                  {item.description}
                </ListItem>
              ))}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>

        {/* Growth & Settings */}
        <NavigationMenuItem>
          <NavigationMenuTrigger>Growth & Settings</NavigationMenuTrigger>
          <NavigationMenuContent className="min-w-[600px] max-w-[700px] whitespace-normal rounded-xl shadow-lg bg-background">
            <ul className="grid gap-4 p-6 md:grid-cols-2">
              {navItems.growth.map((item) => (
                <ListItem key={item.title} title={item.title} href={item.href} icon={item.icon}>
                  {item.description}
                </ListItem>
              ))}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>

      </NavigationMenuList>
    </NavigationMenu>
  );
}
