
'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import BrandLogo, { NewLogoIcon } from '@/components/brand-logo'
import { ArrowRight, Car, Wrench, Ambulance, Landmark, CheckCircle, Shield, IndianRupee, Signal, Wifi, Battery, Sun, Moon, Globe, User, LogIn, Star, MapPin, Clock, Bike, Phone, Share2, Siren, Send, ScanLine, NotebookText, Banknote, Sparkles, PiggyBank, HeartHandshake, CircleHelp, Hand, Briefcase, Home, MessageSquare, Calendar, Building, BrainCircuit } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/hooks/use-language'
import { useTheme } from 'next-themes'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from '@/components/ui/carousel'
import Autoplay from "embla-carousel-autoplay"
import { BikeIcon, AutoIcon, CabIcon } from '@/components/icons'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import dynamic from 'next/dynamic'
import { Progress } from '@/components/ui/progress'


const LiveMap = dynamic(() => import('@/components/live-map'), {
    ssr: false,
    loading: () => <div className="w-full h-full bg-muted flex items-center justify-center"><p>Loading Map...</p></div>
});


const cprData = [
  {
    value: 'path',
    icon: Car,
    title: 'Fair Fares with PATH',
    description: "Our core 0% commission ride-hailing service ensures drivers earn more and riders pay fair, consistent fares. No surge, no surprises.",
    color: 'bg-primary/10',
    textColor: 'text-primary'
  },
  {
    value: 'resq',
    icon: Wrench,
    title: 'Reliability with ResQ',
    description: "Our network of verified mechanics provides instant on-road assistance to our partners, minimizing downtime and ensuring a reliable service for you.",
    color: 'bg-amber-500/10',
    textColor: 'text-amber-600'
  },
   {
    value: 'cure',
    icon: Ambulance,
    title: 'Safety with CURE',
    description: "In an emergency, every second counts. Our integrated ambulance dispatch and doctor appointment system connects you to the nearest partner hospital.",
    color: 'bg-red-500/10',
    textColor: 'text-red-600'
  },
  {
    value: 'bank',
    icon: Landmark,
    title: 'Empowerment with Bank',
    description: "We are a FinTech company at heart. Our 'Cabzi Bank' offers partners instant loans, savings, and financial security, creating a loyal and happy fleet.",
    color: 'bg-green-500/10',
    textColor: 'text-green-600'
  },
];


const journeySteps = [
    {
        icon: MapPin,
        title: "1. Instant Booking",
        description: "Enter your destination and get a fair, transparent fare instantly. No hidden costs, no surprise surge pricing."
    },
    {
        icon: User,
        title: "2. Partner on the Way",
        description: "A professional, verified partner accepts your ride. Track their arrival in real-time on the map."
    },
    {
        icon: Shield,
        title: "3. Safety During Ride",
        description: "Feel secure with our in-app SOS, ride-sharing feature, and the backing of our CURE emergency network."
    },
    {
        icon: IndianRupee,
        title: "4. Seamless Payment",
        description: "Pay with ease using UPI, cash, or the integrated Cabzi Wallet at the end of your trip."
    }
]

function LanguageToggle() {
    const { setLanguage, t } = useLanguage()
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
  const [activeTab, setActiveTab] = useState(cprData[0].value);
  const activeTabData = cprData.find(tab => tab.value === activeTab)!;
  const [carouselApi, setCarouselApi] = useState<CarouselApi>()
  const [currentSlide, setCurrentSlide] = useState(0)

  useEffect(() => {
    if (!carouselApi) return

    setCurrentSlide(carouselApi.selectedScrollSnap());
    carouselApi.on("select", () => {
      setCurrentSlide(carouselApi.selectedScrollSnap());
    })
  }, [carouselApi])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
        y: 0, 
        opacity: 1,
        transition: { type: 'spring', stiffness: 100 }
    },
  };
  
  const carouselSlides = [
    // Slide 1: Path (Ride Booking)
    {
      type: 'path',
      content: (
        <div className="p-4 h-full flex flex-col">
            <h3 className="font-bold text-xl mb-3">Choose Your Ride</h3>
            <div className="space-y-2">
                <Card className="flex items-center p-2 gap-3 bg-muted">
                    <BikeIcon className="w-8 h-8 text-foreground"/>
                    <div className="flex-1"><p className="font-semibold">Bike</p><p className="text-xs text-muted-foreground">Quick & affordable</p></div>
                    <div className="text-right"><p className="font-bold">₹85</p><p className="text-xs flex items-center gap-1"><Clock className="w-3 h-3"/> 3 min</p></div>
                </Card>
                 <Card className="flex items-center p-2 gap-3 bg-pink-100/50 dark:bg-pink-900/20 border-pink-500/50 ring-2 ring-pink-500">
                    <HeartHandshake className="w-8 h-8 text-pink-500"/>
                    <div className="flex-1"><p className="font-semibold">Cabzi Pink</p><p className="text-xs text-pink-600/80 dark:text-pink-400/80">For women, by women</p></div>
                    <div className="text-right"><p className="font-bold">₹215</p><p className="text-xs flex items-center gap-1"><Clock className="w-3 h-3"/> 5 min</p></div>
                </Card>
                <Card className="flex items-center p-2 gap-3 bg-muted">
                    <CabIcon className="w-8 h-8 text-foreground" />
                    <div className="flex-1"><p className="font-semibold">Cab XL</p><p className="text-xs text-muted-foreground">SUVs for 6 or more</p></div>
                    <div className="text-right"><p className="font-bold">₹320</p><p className="text-xs flex items-center gap-1"><Clock className="w-3 h-3"/> 6 min</p></div>
                </Card>
            </div>
        </div>
      ),
    },
     // Slide 2: Partner En-Route
    {
      type: 'path_enroute',
      content: (
        <div className="p-4 h-full flex flex-col">
            <h3 className="font-bold text-xl mb-2 text-primary flex items-center gap-2">Partner on the way</h3>
            <div className="relative flex-1 bg-muted rounded-xl overflow-hidden">
                <LiveMap 
                    riderLocation={{ lat: 28.4595, lon: 77.0266 }}
                    driverLocation={{ lat: 28.4620, lon: 77.0300 }}
                    routeGeometry={{ type: "LineString", coordinates: [[77.0300, 28.4620], [77.0280, 28.4610], [77.0266, 28.4595]] }}
                />
            </div>
            <Card className="mt-2">
                <CardContent className="p-3 flex items-center gap-3">
                    <Avatar><AvatarImage src="https://i.pravatar.cc/40?u=driver1" data-ai-hint="driver portrait" /><AvatarFallback>RK</AvatarFallback></Avatar>
                    <div className="flex-1">
                      <p className="font-semibold">Ramesh Kumar</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">DL01AB1234 • <Star className="w-3 h-3 text-amber-400 fill-amber-400"/> 4.9</p>
                    </div>
                    <Button variant="ghost" size="icon"><MessageSquare className="w-5 h-5 text-muted-foreground"/></Button>
                    <Button variant="ghost" size="icon"><Phone className="w-5 h-5 text-muted-foreground"/></Button>
                </CardContent>
            </Card>
        </div>
      ),
    },
    // Slide 3: CURE Emergency
    {
      type: 'cure',
      content: (
        <div className="p-4 h-full flex flex-col bg-red-500/10">
            <h3 className="font-bold text-xl mb-2 text-red-600 flex items-center gap-2"><Siren className="animate-pulse"/> CURE Emergency</h3>
            <div className="relative flex-1 bg-muted rounded-xl overflow-hidden">
                <LiveMap
                  riderLocation={{lat: 28.4500, lon: 77.0300}}
                  activePartners={[{id: 'a1', name: 'Amb', type: 'ambulance', location: {lat: 28.4550, lon: 77.0350}}]}
                  routeGeometry={{ type: "LineString", coordinates: [[77.0350, 28.4550], [77.0320, 28.4520], [77.0300, 28.4500]] }}
                />
            </div>
            <Card className="mt-2 bg-background">
                <CardHeader className="p-2 text-center">
                  <p className="font-semibold text-sm">Ambulance UK07-1234</p>
                  <p className="text-xs text-muted-foreground">Paramedic: Sunil Yadav • To: Max Hospital</p>
                </CardHeader>
                <CardContent className="p-2 grid grid-cols-2 gap-2 text-center">
                    <div className="bg-muted p-2 rounded-md">
                        <p className="text-xs">ETA to Patient</p>
                        <p className="font-bold text-lg">2 min</p>
                    </div>
                     <div className="bg-muted p-2 rounded-md">
                        <p className="text-xs">ETA to Hospital</p>
                        <p className="font-bold text-lg">12 min</p>
                    </div>
                </CardContent>
            </Card>
        </div>
      ),
    },
    // Slide 4: Doctor Appointment
    {
      type: 'doctor',
      content: (
        <div className="p-4 h-full flex flex-col">
            <h3 className="font-bold text-xl mb-3 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-500" /> Book an Appointment
            </h3>
            <div className="space-y-2">
                <Card className="flex items-center p-2 gap-3 bg-muted">
                    <Avatar className="w-10 h-10"><AvatarImage src="https://i.pravatar.cc/40?u=doc1" /><AvatarFallback>RS</AvatarFallback></Avatar>
                    <div className="flex-1">
                        <p className="font-semibold text-sm">Dr. Ramesh Sharma</p>
                        <p className="text-xs text-muted-foreground">Cardiology</p>
                    </div>
                    <p className="font-bold text-sm">₹1200</p>
                </Card>
                <Card className="flex items-center p-2 gap-3 bg-muted ring-2 ring-primary">
                    <Avatar className="w-10 h-10"><AvatarImage src="https://i.pravatar.cc/40?u=doc2" /><AvatarFallback>PG</AvatarFallback></Avatar>
                    <div className="flex-1">
                        <p className="font-semibold text-sm">Dr. Priya Gupta</p>
                        <p className="text-xs text-muted-foreground">Orthopedics</p>
                    </div>
                    <p className="font-bold text-sm">₹1000</p>
                </Card>
                <Card className="flex items-center p-2 gap-3 bg-muted">
                    <Avatar className="w-10 h-10"><AvatarImage src="https://i.pravatar.cc/40?u=doc3" /><AvatarFallback>AV</AvatarFallback></Avatar>
                    <div className="flex-1">
                        <p className="font-semibold text-sm">Dr. Alok Verma</p>
                        <p className="text-xs text-muted-foreground">General Physician</p>
                    </div>
                    <p className="font-bold text-sm">₹800</p>
                </Card>
            </div>
        </div>
      ),
    },
  ];

  return (
      <div className="flex flex-col min-h-screen bg-background">
          <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-sm">
            <div className="container flex h-14 items-center">
                <Link href="/" className="mr-6 flex items-center gap-2">
                    <BrandLogo hideText={false} iconClassName="w-8 h-8" />
                </Link>
              <div className="flex flex-1 items-center justify-end gap-2">
                <LanguageToggle />
                <ThemeToggle />
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline">
                            <User className="mr-2 h-4 w-4"/> Login / Signup
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild><Link href="/login?role=user">Login as User</Link></DropdownMenuItem>
                        <DropdownMenuItem asChild><Link href="/login?role=driver">Login as Partner</Link></DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild><Link href="/admin" className="text-xs">Admin Panel</Link></DropdownMenuItem>
                    </DropdownMenuContent>
                 </DropdownMenu>
              </div>
            </div>
          </header>
          <main className="flex-1">
            {/* Hero Section */}
            <section className="relative py-24 md:py-32 lg:py-32 overflow-hidden">
                <div className="absolute inset-0 -z-10 animate-text-gradient bg-gradient-to-br from-primary/10 via-red-500/10 to-amber-500/10"></div>
                <div className="container grid lg:grid-cols-2 gap-10 items-center">
                    <motion.div 
                        className="text-center lg:text-left"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        <motion.h1 
                            variants={itemVariants}
                            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70 font-headline"
                        >
                           The Safest Ride. Fair for Everyone.
                        </motion.h1>
                         <motion.p 
                            variants={itemVariants}
                            className="mt-4 text-lg font-semibold text-primary"
                        >
                           Tired of seeing your earnings vanish? So were we.
                        </motion.p>
                        <motion.p 
                            variants={itemVariants}
                            className="mx-auto lg:mx-0 mt-6 max-w-xl text-lg text-muted-foreground"
                        >
                            Cabzi is more than a ride. It's a promise of fair fares, reliable drivers, and an integrated safety network that looks out for you on every trip.
                        </motion.p>
                        <motion.div 
                            variants={itemVariants}
                            className="mt-8 flex justify-center lg:justify-start gap-4"
                        >
                             <Button size="lg" className="btn-glow bg-accent text-accent-foreground hover:bg-accent/90" asChild>
                                <Link href="/login?role=user">
                                   Get a Safe Ride <ArrowRight className="ml-2 h-5 w-5" />
                                </Link>
                            </Button>
                        </motion.div>
                    </motion.div>

                    {/* Phone Mockup with Carousel */}
                     <motion.div 
                        initial={{ opacity: 0, y: 50, rotateY: -30, rotateX: 10 }}
                        animate={{ opacity: 1, y: 0, rotateY: 15, rotateX: 5 }}
                        transition={{ duration: 0.8, ease: [0.25, 1, 0.5, 1] }}
                        className="relative w-72 h-[620px] lg:w-80 lg:h-[680px] mx-auto mt-16 lg:mt-0"
                        style={{ perspective: '1000px' }}
                    >
                        <div 
                            className="relative w-full h-full bg-background/50 backdrop-blur-md rounded-[3rem] border-[6px] border-neutral-800 dark:border-neutral-700 shadow-2xl ring-1 ring-black/10"
                        >
                            {/* Inner screen */}
                            <div className="absolute inset-2 bg-background rounded-[2.5rem] overflow-hidden flex flex-col">
                                {/* Notch */}
                                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-20"></div>

                                {/* Status Bar */}
                                <div className="relative z-10 flex justify-between items-center px-6 pt-7 text-xs font-bold text-foreground">
                                    <span>9:41</span>
                                    <div className="flex gap-1.5">
                                        <Signal size={14} />
                                        <Wifi size={14} />
                                        <Battery size={14} />
                                    </div>
                                </div>

                                {/* App Content Carousel */}
                                <div className="flex-1 mt-2">
                                    <Carousel 
                                      className="w-full h-full"
                                      plugins={[Autoplay({ delay: 5000, stopOnInteraction: false })]}
                                      opts={{ loop: true }}
                                      setApi={setCarouselApi}
                                    >
                                        <CarouselContent>
                                          {carouselSlides.map((slide, index) => (
                                              <CarouselItem key={index}>
                                                  {slide.content}
                                              </CarouselItem>
                                          ))}
                                        </CarouselContent>
                                    </Carousel>
                                     <div className="py-2 px-4">
                                         <div className="flex w-full justify-center gap-2">
                                            {carouselSlides.map((_, index) => (
                                                <div
                                                    key={index}
                                                    className={cn(
                                                        "h-1.5 w-6 rounded-full transition-all duration-500",
                                                        currentSlide === index ? "bg-primary w-8" : "bg-muted"
                                                    )}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

             <section className="py-20 md:py-24 bg-muted/40">
                <div className="container">
                    <div className="mx-auto max-w-3xl text-center">
                        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl font-headline">
                            The CPR Ecosystem: One App, Complete Peace of Mind
                        </h2>
                        <p className="mt-4 text-lg text-muted-foreground">
                           Cabzi isn't just an app; it's a unified platform for urban safety and mobility, built on four powerful pillars.
                        </p>
                    </div>
                     <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
                        {cprData.map((item, i) => (
                             <Card key={i} className={cn("text-center transition-all hover:shadow-lg", item.color)}>
                                 <CardHeader>
                                     <div className="mx-auto p-3 rounded-full bg-background border w-fit">
                                         <item.icon className={cn("w-6 h-6", item.textColor)} />
                                     </div>
                                     <CardTitle className="pt-2">{item.title}</CardTitle>
                                 </CardHeader>
                                 <CardContent>
                                     <p className="text-sm text-muted-foreground">{item.description}</p>
                                 </CardContent>
                             </Card>
                        ))}
                    </div>
                </div>
            </section>
            
             <section className="py-20 md:py-24">
                <div className="container text-center">
                    <h2 className="text-3xl font-bold tracking-tight sm:text-4xl font-headline">The Cabzi Advantage</h2>
                    <p className="mt-4 text-lg text-muted-foreground max-w-3xl mx-auto">
                        We've rebuilt the system from the ground up to create a win-win ecosystem for everyone involved.
                    </p>
                    <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><User /> For Users</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <p className="flex items-start gap-2"><CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" /> <span><span className="font-semibold">Fair & Transparent Fares:</span> No random surge pricing. Ever.</span></p>
                                <p className="flex items-start gap-2"><CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" /> <span><span className="font-semibold">Unmatched Safety:</span> An integrated CURE network for real emergencies.</span></p>
                                <p className="flex items-start gap-2"><CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" /> <span><span className="font-semibold">Professional Service:</span> Happy, respected partners provide better service and well-maintained vehicles.</span></p>
                                <p className="flex items-start gap-2"><CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" /> <span><span className="font-semibold">Reliable Rides:</span> Our driver-first model means fewer cancellations and more reliability.</span></p>
                                <p className="flex items-start gap-2"><CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" /> <span><span className="font-semibold">Cashless Insurance Feel:</span> Seamless insurance verification at partner hospitals during emergencies.</span></p>
                            </CardContent>
                        </Card>
                         <Card className="ring-2 ring-primary border-primary shadow-lg">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><HeartHandshake /> For Partners</CardTitle>
                            </CardHeader>
                             <CardContent className="space-y-3">
                                <p className="flex items-start gap-2"><CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" /> <span><span className="font-semibold">Just ONE Monthly Recharge:</span> Stop losing 20-30% on every ride. Keep 100% of your earnings.</span></p>
                                <p className="flex items-start gap-2"><CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" /> <span><span className="font-semibold">Imagine This:</span> On a ₹1000 earning, other apps take ₹300. With Cabzi, you take home the full ₹1000.</span></p>
                                <p className="flex items-start gap-2"><CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" /> <span><span className="font-semibold">True Financial Security:</span> Access instant loans and high-interest savings via Cabzi Bank.</span></p>
                                <p className="flex items-start gap-2"><CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" /> <span><span className="font-semibold">Respect & Dignity:</span> You are our partner, not just a number. We are committed to your growth.</span></p>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Building /> For the City</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <p className="flex items-start gap-2"><CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" /> <span><span className="font-semibold">Smarter Emergency Response:</span> Digitizing hospital dispatch saves critical "Golden Hour" time.</span></p>
                                <p className="flex items-start gap-2"><CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" /> <span><span className="font-semibold">Economic Empowerment:</span> More earnings for drivers means more money flowing into the local economy.</span></p>
                                <p className="flex items-start gap-2"><CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" /> <span><span className="font-semibold">Data-Driven Urban Planning:</span> Our integrated data can help city planners identify and solve mobility and safety challenges.</span></p>
                                <p className="flex items-start gap-2"><CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" /> <span><span className="font-semibold">A Safer Urban Fabric:</span> A connected, reliable network for travel and emergencies.</span></p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Your Journey Section */}
             <section className="py-20 md:py-24 bg-muted/40">
                <div className="container">
                    <div className="mx-auto max-w-3xl text-center">
                        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl font-headline">
                           Your Journey with Cabzi
                        </h2>
                        <p className="mt-4 text-lg text-muted-foreground">
                           A simple, safe, and transparent experience from start to finish.
                        </p>
                    </div>
                    <div className="relative mt-16">
                        {/* The connecting line */}
                        <div className="absolute left-1/2 top-8 hidden h-[calc(100%-4rem)] w-0.5 bg-border md:block" aria-hidden="true" />

                        <motion.div 
                            className="grid grid-cols-1 md:grid-cols-2 gap-y-16 gap-x-12"
                            variants={containerVariants}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, amount: 0.2 }}
                        >
                            {journeySteps.map((step, index) => (
                                <motion.div 
                                    key={step.title}
                                    variants={itemVariants}
                                    className={cn(
                                        "relative flex items-start gap-6",
                                        index % 2 === 1 && "md:flex-row-reverse"
                                    )}
                                >
                                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 ring-8 ring-background">
                                        <step.icon className="h-8 w-8 text-primary" />
                                    </div>
                                    <div className={cn("text-left", index % 2 === 1 && "md:text-right")}>
                                        <h3 className="text-xl font-bold">{step.title}</h3>
                                        <p className="mt-2 text-muted-foreground">{step.description}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                </div>
            </section>

             {/* Partner CTA Section */}
            <section className="py-20 md:py-24">
                <div className="container text-center">
                    <h2 className="text-3xl font-bold tracking-tight sm:text-4xl font-headline">Join Our Driver-First Revolution</h2>
                    <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                        Are you a driver, mechanic, or hospital administrator? Partner with Cabzi and be part of a fairer, more profitable ecosystem.
                    </p>
                    <div className="mt-8">
                        <Button size="lg" asChild>
                            <Link href="/partner-hub">
                                Become a Partner <ArrowRight className="ml-2 h-5 w-5" />
                            </Link>
                        </Button>
                    </div>
                </div>
            </section>

          </main>
          <footer className="py-6 md:px-8 md:py-0 bg-background border-t">
            <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
              <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
                Built by Team Cabzi. All rights reserved. &copy; {new Date().getFullYear()}
              </p>
               <div className="flex items-center gap-4 text-sm text-muted-foreground">
                 <Link href="/terms" className="hover:text-primary">Terms of Service</Link>
                 <Link href="/privacy" className="hover:text-primary">Privacy Policy</Link>
               </div>
            </div>
          </footer>
      </div>
  );
}

