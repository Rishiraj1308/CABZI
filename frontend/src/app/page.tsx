
'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import AOS from 'aos';
import 'aos/dist/aos.css';
import { Button } from '@/components/ui/button'
import BrandLogo, { NewLogoIcon } from '@/components/shared/brand-logo'
import { ArrowRight, Car, Wrench, Ambulance, Landmark, Shield, IndianRupee, Sun, Moon, Globe, LogIn, Star, MapPin, Clock, Bike, Phone, MessageSquare, Calendar, Video, FlaskConical, Hand, Siren, HeartHandshake, Menu, XCircle, CheckCircle, BrainCircuit, Home, Construction, Users, Briefcase, Zap, Move, ShoppingCart, MessageCircle, DollarSign, UserCheck, Map as MapIcon } from 'lucide-react'
import { motion, useScroll, useSpring } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { useTheme } from 'next-themes'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import CuroMindReveal from '@/components/CuroMindReveal'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const dayTimelineItems = [
    { time: "8 AM", title: "The Morning Rush", description: "Start your day stress-free. With Curocity's PATH service, you get a reliable ride with a happy driver. That means fair, consistent fares and no surprise surge pricing.", icon: Car },
    { time: "1 PM", title: "Roadside ResQ", description: "Car trouble? Don't get stranded. One tap brings a verified ResQ mechanic to your location for on-the-spot repairs, from a flat tyre to a battery jump-start.", icon: Wrench },
    { time: "4 PM", title: "Home Services", description: "Need a plumber, electrician, or salon service at home? Curocity connects you with trusted local professionals for all your home needs.", icon: Home },
    { time: "6 PM", title: "Later That Day", description: "Feeling unwell? Skip the waiting room. Instantly book an in-clinic or video appointment with a specialist from our network of CURE partners.", icon: Calendar },
    { time: "8 PM", title: "Lab Tests at Home", description: "Doctor recommended a test? Book it through Curocity. A certified phlebotomist will collect your sample from the comfort of your home.", icon: FlaskConical },
    { time: "Anytime", title: "The Safety Net", description: "Health emergency? Don't panic. CURE connects you to the nearest ambulance and clinic in seconds. Because every minute counts.", icon: Siren },
];

const whyCurocityItems = [
    { icon: CheckCircle, title: "One app. All essentials." },
    { icon: Users, title: "Verified neighbourhood pros." },
    { icon: IndianRupee, title: "Transparent pricing — no hidden surprises." },
    { icon: Clock, title: "A brand that respects your time, not just your wallet." }
];

const whatWeSolveItems = [ "Last‑minute repairs", "Quick home help", "Small and big moves", "Delivery runs", "Local errands", "Neighborhood services" ];

const howItWorksSteps = [
    { number: 1, title: "Tell us what you need.", description: "Clear prompts, no jargon.", href: "/user/ride-booking" },
    { number: 2, title: "Choose your pro.", description: "Clean profiles, real reviews, honest pricing.", href: "#" },
    { number: 3, title: "Track and relax.", description: "Real-time updates, smooth payments, zero friction.", href: "#" }
];

const featureItems = [
    { icon: Zap, title: "Instant Availability", description: "See who’s free right now." },
    { icon: MapPin, title: "Neighbourhood-first Grid", description: "Powered by hyperlocal trust." },
    { icon: DollarSign, title: "Crystal Pricing", description: "If it’s not clear, it’s not Curocity." },
    { icon: Car, title: "Live Tracking", description: "Transparency built into the experience." },
    { icon: MessageCircle, title: "Protected Chat", description: "Talk safely without sharing your number." },
    { icon: Shield, title: "Failsafe Payments", description: "Clean, fast, built for busy people." }
];

const scenarioItems = [
    { title: "A leak before guests arrive?", description: "We got it.", icon: Wrench },
    { title: "Need something moved today?", description: "Easy.", icon: Move },
    { title: "Find a pro who actually shows up?", description: "Standard.", icon: UserCheck },
    { title: "Group errands for the building?", description: "Unified, organised.", icon: ShoppingCart }
];

const testimonials = [
    { quote: "Curocity feels like that one friend who always knows a guy.", author: "Asha, Delhi" },
    { quote: "Finally, an app that doesn’t overpromise.", author: "Rohit, Mumbai" }
];

const pricingData = [
  { factor: 'Base Service Fee', curocity: '✔️ Fixed & clear', otherApps: '❌ Fluctuates', localVendors: '❌ Negotiation required', deliveryApps: '❌ Hidden fees' },
  { factor: 'Surge Pricing', curocity: '❌ Never', otherApps: '⚠️ Usually', localVendors: '❌ None but unreliable', deliveryApps: '✔️ Common' },
  { factor: 'Commission Cut', curocity: 'Low, transparent', otherApps: 'High', localVendors: 'None', deliveryApps: 'High' },
  { factor: 'Final Bill Transparency', curocity: '✔️ Full breakdown', otherApps: '❌ Often confusing', localVendors: '❌ No receipts', deliveryApps: '⚠️ Partial' },
  { factor: 'Upfront Estimate Provided', curocity: '✔️ Yes', otherApps: '⚠️ Sometimes', localVendors: '❌ No', deliveryApps: '✔️ Yes' },
  { factor: 'Cancellation Fees', curocity: 'Low + fair', otherApps: 'High', localVendors: 'Random', deliveryApps: 'High' },
];

const comparisonData = [
  { feature: 'All services in one app', curocity: '✔️ Full super-app (repairs, moving, errands, help, pros)', otherApps: '❌ Only 1–2 categories', localVendors: '❌ Scattered, unorganized', bigDeliveryApps: '❌ Only food & parcels' },
  { feature: 'Instant local pros', curocity: '✔️ Verified, nearby', otherApps: '⚠️ Sometimes local', localVendors: '✔️ Local but unreliable', bigDeliveryApps: '❌ Not available' },
  { feature: 'Transparent pricing', curocity: '✔️ Clear, fixed, upfront', otherApps: '❌ Hidden fees, surge', localVendors: '❌ Negotiation chaos', bigDeliveryApps: '❌ Surge-pricing always' },
  { feature: 'Live tracking', curocity: '✔️ Built in', otherApps: '⚠️ Limited', localVendors: '❌ No tracking', bigDeliveryApps: '✔️ But only for deliveries' },
  { feature: 'In-app secure chat', curocity: '✔️ Yes, protected', otherApps: '⚠️ Partial', localVendors: '❌ Phone calls only', bigDeliveryApps: '✔️ Yes' },
  { feature: 'Quality control', curocity: '✔️ Verified pros + ratings', otherApps: '❌ Inconsistent', localVendors: '❌ No verification', bigDeliveryApps: '✔️ But for delivery only' },
  { feature: 'Task variety', curocity: '✔️ Repairs, errands, moves, help, everything', otherApps: '❌ Very limited', localVendors: '⚠️ Depends on person', bigDeliveryApps: '❌ Only deliveries' },
  { feature: 'Payment safety', curocity: '✔️ Secure, fast payouts', otherApps: '⚠️ Mixed', localVendors: '❌ Cash-only', bigDeliveryApps: '✔️ Strong' },
  { feature: 'Customer support', curocity: '✔️ Real, fast', otherApps: '⚠️ Slow', localVendors: '❌ None', bigDeliveryApps: '⚠️ Mostly automated' },
  { feature: 'Partner benefits', curocity: '✔️ Better earnings + no drama', otherApps: '❌ Heavy commissions', localVendors: '❌ No stability', bigDeliveryApps: '❌ Not for service pros' },
];

const faqItems = [
    { question: "Is my area supported?", answer: "Check with your pincode. We are launching hyper-locally." },
    { question: "Are pros verified?", answer: "Always — ID, skill, and behaviour." },
    { question: "What if service goes wrong?", answer: "We sort it quickly and fairly." },
];

const partnerFeatures = [
    "More jobs, less chasing.", "Clear, honest payouts.", "Premium brand trust.", "Your schedule, your control.",
    "Protected chat + verified customers.", "Growth tools built-in.", "You look professional."
];

const ecosystemServices = [
    {
      icon: Car,
      title: "Path (Ride-Hailing)",
      description: "Fair fares with our core 0% commission ride-hailing service.",
      href: "/user/ride-booking",
    },
     {
      icon: Ambulance,
      title: "Cure (Emergency Response)",
      description: "Integrated ambulance dispatch and doctor appointment system.",
      href: "/user/cure",
    },
    {
      icon: Wrench,
      title: "ResQ (Roadside Assistance)",
      description: "On-demand assistance from our network of verified mechanics.",
      href: "/user/resq",
    },
    {
      icon: Landmark,
      title: "Bank (Partner FinTech)",
      description: "Empowering our partners with instant loans, savings, and financial security.",
      href: "/driver/wallet",
    },
    {
      icon: Calendar,
      title: "Appointments",
      description: "Book verified doctors and specialists in minutes.",
      href: "/user/appointments",
    },
    {
      icon: MapIcon,
      title: "Curocity World",
      description: "Explore all our services on a single interactive map.",
      href: "/user/map",
    },
]


function LanguageToggle() {
    const { setLanguage } = useLanguage()
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                    <Globe className="h-5 w-5" />
                    <span className="sr-only">Toggle language</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setLanguage('en')}>English</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage('hi')}>हिन्दी</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

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

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    AOS.init({
      duration: 800,
      once: true,
      offset: 100,
    });
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } },
  };
  
  return (
      <div className={cn("flex flex-col min-h-screen bg-background aurora-background")}>
          <header id="navbar" className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-sm transition-shadow duration-300">
            <div className="container flex h-14 items-center justify-between">
                <Link href="/" className="flex items-center gap-2">
                    <BrandLogo hideText={false} iconClassName="w-8 h-8" />
                </Link>
                <div className="flex items-center gap-1 sm:gap-2">
                    <LanguageToggle />
                    <ThemeToggle />
                    <Sheet>
                        <SheetTrigger asChild>
                           <Button variant="outline" size="sm" className="h-9">
                                <Menu className="w-4 h-4 sm:hidden"/>
                                <span className="hidden sm:inline">Login / Signup</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent>
                            <SheetHeader>
                                <SheetTitle className="text-left"><BrandLogo/></SheetTitle>
                            </SheetHeader>
                            <div className="grid gap-4 py-4">
                                <Button asChild variant="secondary"><Link href="/login?role=user">Login as User</Link></Button>
                                <Button asChild variant="outline"><Link href="/partner-hub">Become a Partner</Link></Button>
                                <Separator className="my-2"/>
                                <Button asChild variant="ghost" className="text-xs text-muted-foreground"><Link href="/login?role=admin">Admin Panel</Link></Button>
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
          </header>
          <main className="flex-1">
            {/* Hero Section */}
            <section className="relative py-20 md:py-28 lg:py-32 overflow-hidden">
                <div className="absolute inset-0 -z-10 animate-text-gradient bg-gradient-to-br from-primary/10 via-red-500/10 to-amber-500/10"></div>
                <div className="container text-center">
                    <motion.div className="text-center" variants={containerVariants} initial="hidden" animate="visible">
                        <motion.h1 variants={itemVariants} className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70 font-headline">
                           Move. Heal. Fix. <br/> One App for Your Urban Life.
                        </motion.h1>
                         <motion.p variants={itemVariants} className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-muted-foreground">
                            Mobility, safety, health, home, help — everything you deal with in a city, now controlled from one clean, powerful platform.
                        </motion.p>
                        <motion.p variants={itemVariants} className="mt-4 text-sm font-semibold text-muted-foreground">
                           Built for India’s hustle. Designed for people who don’t have time for chaos.
                        </motion.p>
                        <motion.div variants={itemVariants} className="mt-8 flex justify-center gap-4">
                             <Button size="lg" className="btn-glow bg-accent text-accent-foreground hover:bg-accent/90" asChild>
                                <Link href="/login?role=user">Get Started</Link>
                            </Button>
                            <Button size="lg" variant="outline" asChild>
                               <a href="#why-curocity">Explore the Ecosystem</a>
                           </Button>
                        </motion.div>
                    </motion.div>
                </div>
            </section>
             
            <section id="ecosystem" className="py-20 md:py-24 bg-background">
              <div className="container">
                <div className="text-center max-w-3xl mx-auto mb-16" data-aos="fade-up">
                    <h2 className="text-3xl font-bold tracking-tight sm:text-4xl font-headline">One App for Your Entire Day</h2>
                    <p className="mt-4 text-lg text-muted-foreground">
                        Curocity integrates mobility, health, and assistance services into one seamless Super App, creating a safety net for your everyday life.
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {ecosystemServices.map((service, index) => (
                    <Card key={service.title} data-aos="fade-up" data-aos-delay={index * 100} className="hover:shadow-md transition-shadow">
                        <CardHeader>
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-full bg-primary/10">
                                    <service.icon className="w-6 h-6 text-primary"/>
                                </div>
                                <CardTitle>{service.title}</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">{service.description}</p>
                        </CardContent>
                        <CardFooter>
                           <Button variant="link" asChild className="p-0"><Link href={service.href}>Explore <ArrowRight className="ml-2 w-4 h-4"/></Link></Button>
                        </CardFooter>
                    </Card>
                  ))}
                </div>
              </div>
            </section>
            
            <section id="why-curocity" className="py-20 md:py-24 bg-muted/40">
                <div className="container">
                    <div className="text-center max-w-3xl mx-auto mb-16" data-aos="fade-up">
                        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl font-headline">Why Curocity Is Different</h2>
                        <p className="mt-4 text-lg text-muted-foreground">
                           We're rebuilding urban services from the ground up to be fair, safe, and reliable for everyone involved.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                       <Card className="p-6 md:p-8" data-aos="fade-right">
                           <CardHeader className="p-0">
                               <div className="flex items-center gap-3 mb-2">
                                  <XCircle className="w-8 h-8 text-destructive"/>
                                  <CardTitle className="text-2xl">The Old Way: A Partner's Struggle</CardTitle>
                               </div>
                               <CardDescription>A system that profits from a partner's hard work, offering little in return.</CardDescription>
                           </CardHeader>
                           <CardContent className="p-0 pt-6 space-y-3 text-sm">
                               <p>• Lose 30% of your earnings on every single ride to high commissions.</p>
                               <p>• Unpredictable income due to fluctuating demand and unfair penalties.</p>
                               <p>• No financial safety net for vehicle repairs or personal emergencies.</p>
                           </CardContent>
                       </Card>
                       <Card className="p-6 md:p-8 border-primary ring-2 ring-primary/50 shadow-lg shadow-primary/10" data-aos="fade-left">
                           <CardHeader className="p-0">
                                <div className="flex items-center gap-3 mb-2">
                                  <CheckCircle className="w-8 h-8 text-primary"/>
                                  <CardTitle className="text-2xl">The Curocity Way: A True Partnership</CardTitle>
                               </div>
                               <CardDescription>An ecosystem designed to empower partners, not just use them.</CardDescription>
                           </CardHeader>
                           <CardContent className="p-0 pt-6 space-y-3 text-sm">
                               <p>• <span className="font-bold">0% commission.</span> You keep 100% of the fare on every trip.</p>
                               <p>• Access to <span className="font-bold">instant loans and high-interest savings</span> with Curocity Bank.</p>
                               <p>• A dedicated <span className="font-bold">ResQ network</span> to help you get back on the road faster.</p>
                               <p>• Fair, transparent policies that respect you as a business owner.</p>
                           </CardContent>
                       </Card>
                    </div>
                </div>
            </section>
            <section id="a-day-with-curocity" className="py-20 md:py-24 bg-background">
  <div className="container">
    <div className="text-center max-w-3xl mx-auto mb-16" data-aos="fade-up">
      <h2 className="text-3xl font-bold tracking-tight sm:text-4xl font-headline">A Day with Curocity</h2>
      <p className="mt-4 text-lg text-muted-foreground">
        One app for your entire day, from your morning commute to unexpected emergencies.
      </p>
    </div>

    <div className="relative">
      <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-1 bg-border -translate-x-1/2"></div>

      <div className="space-y-12">
        {dayTimelineItems.map((item, index) => (
          <div
            key={index}
            className="md:grid md:grid-cols-2 md:gap-8 items-center relative"
            data-aos="fade-up"
          >
            <div className={cn("md:text-right", index % 2 === 0 ? "md:order-1" : "md:order-2")}>
              <div className={cn("p-4 rounded-lg bg-muted/50 shadow-sm",
                index % 2 === 0 ? "md:mr-8" : "md:ml-8")}>
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-primary/10 hidden md:flex items-center justify-center">
                    <item.icon className="w-6 h-6 text-primary" />
                  </div>

                  <div className="flex-1">
                    <p className="font-bold">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className={cn(
              "flex items-center",
              index % 2 === 0 ? "md:order-2" : "md:order-1",
              "justify-end"
            )}>
              <div className="hidden md:block w-4 h-4 bg-primary rounded-full border-4 border-background absolute left-1/2 -translate-x-1/2"></div>
              <time className="font-semibold text-primary text-sm p-2 bg-background border rounded-lg md:border-0 md:bg-transparent">
                {item.time}
              </time>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
</section>            
            <section id="what-we-solve" className="py-20 md:py-24 bg-muted/40">
                <div className="container">
                     <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl font-headline">What We Solve</h2>
                        <p className="mt-4 text-lg text-muted-foreground">
                            Everything handled with speed, structure, and a signature Curocity calm.
                        </p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-3">
                        {whatWeSolveItems.map((item, index) => (
                           <motion.div key={item} variants={itemVariants}>
                                <div className="py-2 px-4 rounded-full bg-background font-medium" data-aos="fade-up" data-aos-delay={index * 50}>
                                    {item}
                                </div>
                           </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            <section id="how-it-works" className="py-20 md:py-24 bg-background">
                <div className="container">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl font-headline">How Curocity Works</h2>
                        <p className="mt-4 text-lg text-muted-foreground">City tasks should feel this simple.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {howItWorksSteps.map((step, index) => (
                            <Link href={step.href} key={index}>
                                <Card className="text-center p-6 h-full hover:bg-card hover:shadow-lg transition-all" data-aos="fade-up" data-aos-delay={index * 100}>
                                    <CardHeader>
                                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 border-2 border-primary/20">
                                            <span className="text-2xl font-bold text-primary">{step.number}</span>
                                        </div>
                                        <CardTitle className="mt-4 text-xl font-semibold">{step.title}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="mt-1 text-muted-foreground">{step.description}</p>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

             <section id="features" className="py-20 md:py-24 bg-muted/40">
                <div className="container">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl font-headline">Features With a Brand Personality</h2>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                        {featureItems.map((feature, index) => (
                            <Card key={index} className="p-6 text-center" data-aos="zoom-in" data-aos-delay={index * 50}>
                                <div className="mx-auto w-12 h-12 rounded-lg flex items-center justify-center bg-accent/10 mb-4">
                                    <feature.icon className="w-6 h-6 text-accent-foreground" />
                                </div>
                                <h3 className="font-semibold">{feature.title}</h3>
                                <p className="text-xs text-muted-foreground mt-1">{feature.description}</p>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>
            
            <section id="scenarios" className="py-20 md:py-24 bg-background">
                <div className="container">
                     <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl font-headline">Real-World Scenarios</h2>
                         <p className="mt-4 text-lg text-muted-foreground">Curocity doesn’t just solve problems — it anticipates them.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {scenarioItems.map((scenario, index) => (
                            <Card key={index} className="p-6" data-aos="fade-up" data-aos-delay={index * 100}>
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-full bg-primary/10">
                                        <scenario.icon className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">{scenario.title}</h3>
                                        <p className="text-sm text-muted-foreground">{scenario.description}</p>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

             <section id="pricing" className="py-20 md:py-24 bg-muted/40">
                <div className="container">
                     <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl font-headline">Pricing — Clean, Simple, Built for Trust</h2>
                        <p className="mt-4 text-lg text-muted-foreground">
                           Curocity's pricing model is clear, predictable, and made for real people, not for squeezing extra money. No hidden fees, no surge pricing—what you see is what you pay.
                        </p>
                    </div>
                    <Card data-aos="fade-up">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-1/4">Pricing Factor</TableHead>
                                        <TableHead className="text-center">Curocity</TableHead>
                                        <TableHead className="text-center">Other Service Apps</TableHead>
                                        <TableHead className="text-center">Local Vendors</TableHead>
                                        <TableHead className="text-center">Delivery/Task Apps</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pricingData.map((row) => (
                                        <TableRow key={row.factor}>
                                            <TableCell className="font-semibold">{row.factor}</TableCell>
                                            <TableCell className="text-center font-medium">{row.curocity}</TableCell>
                                            <TableCell className="text-center">{row.otherApps}</TableCell>
                                            <TableCell className="text-center">{row.localVendors}</TableCell>
                                            <TableCell className="text-center">{row.deliveryApps}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </section>
            
            <section id="testimonials" className="py-20 md:py-24 bg-background">
                <div className="container text-center">
                    <h2 className="text-3xl font-bold tracking-tight sm:text-4xl font-headline">Voices From the City</h2>
                    <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
                        {testimonials.map((testimonial, index) => (
                            <blockquote key={index} className="p-6 bg-muted/50 rounded-lg" data-aos="fade-up" data-aos-delay={index * 100}>
                                <p className="text-lg italic">"{testimonial.quote}"</p>
                                <footer className="mt-4 text-sm font-semibold">— {testimonial.author}</footer>
                            </blockquote>
                        ))}
                    </div>
                </div>
            </section>

             <section id="for-partners" className="py-20 md:py-24 bg-muted/40">
                <div className="container">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl font-headline">For Local Pros — Partner With Curocity</h2>
                         <p className="mt-4 text-lg text-muted-foreground">
                            You’re not just joining an app. You’re joining a system built to make your work smoother, your earnings higher, and your time respected.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {partnerFeatures.map(item => (
                            <Card key={item} className="p-4" data-aos="zoom-in">
                                <CardContent className="p-2 text-center">
                                    <p className="font-semibold text-sm">{item}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                     <div className="text-center mt-8">
                         <Button asChild>
                            <Link href="/partner-hub">Join as a Pro <Hand className="ml-2 h-4 w-4"/></Link>
                        </Button>
                    </div>
                </div>
            </section>
            
            <section id="comparison" className="py-20 md:py-24 bg-background">
                <div className="container">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl font-headline">Comparison — Why Curocity Wins</h2>
                         <p className="mt-4 text-lg text-muted-foreground">
                            Other apps solve one problem. Curocity solves YOUR whole day. No clutter. No chaos. One app that actually respects your time.
                        </p>
                    </div>
                     <Card data-aos="fade-up">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[20%]">Feature / Benefit</TableHead>
                                        <TableHead className="text-center">Curocity (Us)</TableHead>
                                        <TableHead className="text-center">Other Service Apps</TableHead>
                                        <TableHead className="text-center">Local Vendors</TableHead>
                                        <TableHead className="text-center">Big Delivery Apps</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {comparisonData.map((row) => (
                                        <TableRow key={row.feature}>
                                            <TableCell className="font-semibold text-xs">{row.feature}</TableCell>
                                            <TableCell className="text-center font-medium text-xs">{row.curocity}</TableCell>
                                            <TableCell className="text-center text-xs">{row.otherApps}</TableCell>
                                            <TableCell className="text-center text-xs">{row.localVendors}</TableCell>
                                            <TableCell className="text-center text-xs">{row.bigDeliveryApps}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </section>

             <section id="faq" className="py-20 md:py-24 bg-muted/40">
                <div className="container max-w-3xl mx-auto text-center">
                    <h2 className="text-2xl font-bold tracking-tight sm:text-3xl font-headline">Frequently Asked Questions</h2>
                    <div className="mt-8 space-y-4 text-left">
                        {faqItems.map((faq, index) => (
                            <Card key={index} data-aos="fade-up" data-aos-delay={index * 50}>
                                <CardHeader className="p-4">
                                    <CardTitle className="text-base">{faq.question}</CardTitle>
                                    <CardDescription className="pt-2">{faq.answer}</CardDescription>
                                </CardHeader>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            <section className="bg-primary text-primary-foreground py-20 md:py-24">
                <div className="container text-center">
                    <h2 className="text-3xl font-bold tracking-tight sm:text-4xl font-headline">The city isn’t slowing down. Good thing you don’t have to either.</h2>
                    <p className="mt-4 text-lg text-primary-foreground/80 max-w-2xl mx-auto">
                        Download Curocity and move smarter.
                    </p>
                    <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Button size="lg" variant="secondary" asChild className="w-full sm:w-auto">
                            <Link href="/login?role=user">
                                Get the App <ArrowRight className="ml-2 h-5 w-5" />
                            </Link>
                        </Button>
                        <Button size="lg" variant="outline" asChild  className="w-full sm:w-auto bg-primary/20 border-primary-foreground/50 hover:bg-primary/40">
                            <Link href="/partner-hub">
                                Become a Pro <Hand className="ml-2 h-5 w-5" />
                            </Link>
                        </Button>
                    </div>
                </div>
            </section>

          </main>
          <footer className="py-6 md:px-8 md:py-0 bg-background border-t">
            <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
              <div className="flex items-center gap-2">
                 <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
                    Built by Team Curocity. All rights reserved. &copy; {new Date().getFullYear()}
                  </p>
                  <Link href="/login?role=admin" legacyBehavior>
                    <a className="text-muted-foreground hover:text-primary transition-colors">
                      <Shield size={16} />
                      <span className="sr-only">Admin Login</span>
                    </a>
                  </Link>
              </div>
               <div className="flex items-center gap-4 text-sm text-muted-foreground">
                 <Link href="/terms" className="hover:text-primary">Terms of Service</Link>
                 <Link href="/privacy" className="hover:text-primary">Privacy Policy</Link>
               </div>
            </div>
          </footer>
      </div>
  )
}
