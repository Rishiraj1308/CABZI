
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Car, FilePieChart, Landmark, UserCog, NotebookText, Users, Map, Handshake, MessageSquare, Settings, LayoutDashboard, Gem, Ambulance, Wrench, CalendarCheck } from 'lucide-react'
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
        { title: "Customers", href: "/admin/customers", description: "View the list of all registered riders.", icon: Users },
        { title: "Rides Log", href: "/admin/rides", description: "An audit trail of all rides on the platform.", icon: Car },
        { title: "Cure Cases", href: "/admin/cure-cases", description: "An audit trail of all emergency cases.", icon: Ambulance },
        { title: "ResQ Jobs", href: "/admin/resq-cases", description: "An audit trail of all service requests.", icon: Wrench },
        { title: "Appointments Log", href: "/admin/appointments", description: "Track all booked doctor appointments.", icon: CalendarCheck },
    ],
    financial: [
        { title: "Cabzi Bank", href: "/admin/bank", description: "Monitor the core financial engine and partner loans.", icon: Landmark },
        { title: "Accounts", href: "/admin/accounts", description: "Manage company expenses and ledger.", icon: NotebookText },
        { title: "Audit Report", href: "/admin/audit", description: "View the complete Profit & Loss statement.", icon: FilePieChart },
        { title: "Subscriptions", href: "/admin/subscriptions", description: "Manage and activate partner subscriptions.", icon: Gem },
    ],
    growth: [
        { title: "Team Management", href: "/admin/team", description: "Manage your admin team and their roles.", icon: UserCog },
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
            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
            className
          )}
          {...props}
        >
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            <div className="text-sm font-medium leading-none">{title}</div>
          </div>
          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
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
  const handleLinkClick = (href: string) => {
    // router.push(href);
    setOpen?.(false);
  };
  return (
     <div className="flex-1 overflow-auto py-2">
      <div className="grid items-start gap-4 px-4">
        <Link
           href="/admin"
            onClick={() => setOpen?.(false)}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
              pathname === '/admin' && 'bg-muted text-primary'
            )}
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
        </Link>
        <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="operations">
                <AccordionTrigger className="text-base">Operations</AccordionTrigger>
                <AccordionContent className="pl-4">
                    {navItems.operations.map((item) => (
                      <Link
                        href={item.href}
                        key={item.title}
                        onClick={() => setOpen?.(false)}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary text-sm',
                          pathname === item.href && 'text-primary'
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.title}
                      </Link>
                    ))}
                </AccordionContent>
            </AccordionItem>
             <AccordionItem value="management">
                <AccordionTrigger className="text-base">Management</AccordionTrigger>
                <AccordionContent className="pl-4">
                    {navItems.management.map((item) => (
                      <Link
                           href={item.href}
                           key={item.title}
                           onClick={() => setOpen?.(false)}
                           className={cn(
                             'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary text-sm',
                             pathname === item.href && 'text-primary'
                           )}
                         >
                           <item.icon className="h-4 w-4" />
                           {item.title}
                      </Link>
                    ))}
                </AccordionContent>
            </AccordionItem>
            <AccordionItem value="financial">
                <AccordionTrigger className="text-base">Financial</AccordionTrigger>
                <AccordionContent className="pl-4">
                    {navItems.financial.map((item) => (
                      <Link
                          href={item.href}
                          key={item.title}
                          onClick={() => setOpen?.(false)}
                          className={cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary text-sm',
                            pathname === item.href && 'text-primary'
                          )}
                        >
                          <item.icon className="h-4 w-4" />
                          {item.title}
                      </Link>
                    ))}
                </AccordionContent>
            </AccordionItem>
            <AccordionItem value="growth">
                <AccordionTrigger className="text-base">Growth & Settings</AccordionTrigger>
                <AccordionContent className="pl-4">
                    {navItems.growth.map((item) => (
                      <Link
                          href={item.href}
                          key={item.title}
                          onClick={() => setOpen?.(false)}
                          className={cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary text-sm',
                            pathname === item.href && 'text-primary'
                          )}
                        >
                          <item.icon className="h-4 w-4" />
                          {item.title}
                      </Link>
                    ))}
                </AccordionContent>
            </AccordionItem>
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
              <NavigationMenuItem>
                  <Link href="/admin" legacyBehavior passHref>
                      <NavigationMenuLink active={pathname === '/admin' || pathname === '/admin/dashboard'} className={navigationMenuTriggerStyle()}>
                          Dashboard
                      </NavigationMenuLink>
                  </Link>
              </NavigationMenuItem>
              
              <NavigationMenuItem>
                  <NavigationMenuTrigger>Operations</NavigationMenuTrigger>
                  <NavigationMenuContent>
                       <ul className="grid gap-3 p-6 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]">
                          <li className="row-span-3">
                              <NavigationMenuLink asChild>
                              <a
                                  className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-6 no-underline outline-none focus:shadow-md"
                                  href="/admin"
                              >
                                  <Map className="h-6 w-6" />
                                  <div className="mb-2 mt-4 text-lg font-medium">
                                  Live Operations
                                  </div>
                                  <p className="text-sm leading-tight text-muted-foreground">
                                    Monitor all real-time activities across the CPR ecosystem on a unified map.
                                  </p>
                              </a>
                              </NavigationMenuLink>
                          </li>
                          {navItems.operations.slice(1).map((item) => (
                             <ListItem key={item.title} title={item.title} href={item.href} icon={item.icon}>
                               {item.description}
                             </ListItem>
                          ))}
                      </ul>
                  </NavigationMenuContent>
              </NavigationMenuItem>

               <NavigationMenuItem>
                  <NavigationMenuTrigger>Management</NavigationMenuTrigger>
                  <NavigationMenuContent>
                       <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px] ">
                          {navItems.management.map((item) => (
                             <ListItem key={item.title} title={item.title} href={item.href} icon={item.icon}>
                               {item.description}
                             </ListItem>
                          ))}
                      </ul>
                  </NavigationMenuContent>
              </NavigationMenuItem>
              
              <NavigationMenuItem>
                  <NavigationMenuTrigger>Financial</NavigationMenuTrigger>
                  <NavigationMenuContent>
                       <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px] ">
                          {navItems.financial.map((item) => (
                             <ListItem key={item.title} title={item.title} href={item.href} icon={item.icon}>
                               {item.description}
                             </ListItem>
                          ))}
                      </ul>
                  </NavigationMenuContent>
              </NavigationMenuItem>

              <NavigationMenuItem>
                  <NavigationMenuTrigger>Growth &amp; Settings</NavigationMenuTrigger>
                  <NavigationMenuContent>
                       <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px] ">
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

    