'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import BrandLogo from '@/components/brand-logo'
import { ArrowRight, Car, Wrench, Ambulance, Shield, IndianRupee, TrendingUp, UserCheck, Zap, Percent, MapPin, Wallet, Star, Landmark, Bike } from 'lucide-react'
import { MotionDiv, AnimatePresence } from '@/components/ui/motion-div'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel"
import Autoplay from "embla-carousel-autoplay"


const riderAdvantages = [
    {
        icon: IndianRupee,
        title: 'Fair & Transparent Fares',
        description: 'Happy drivers mean fair pricing for you. No hidden costs, just honest fares.'
    },
    {
        icon: Zap,
        title: 'No Random Surge Pricing',
        description: 'Say goodbye to unpredictable price hikes during peak hours. Our fares are consistent.'
    },
    {
        icon: UserCheck,
        title: 'Fewer Cancellations',
        description: 'Empowered and respected partners are less likely to cancel, giving you a reliable service.'
    },
    {
        icon: Shield,
        title: 'Integrated Safety Net',
        description: 'Every ride is protected by our ResQ and Cure network for on-road and medical emergencies.'
    }
]

const partnerAdvantages = [
    {
        icon: Percent,
        title: '0% Commission',
        description: 'Keep 100% of what you earn on every ride. No more losing a huge chunk of your income.'
    },
    {
        icon: TrendingUp,
        title: 'Maximize Your Earnings',
        description: 'With a simple subscription, your earning potential is higher and more predictable.'
    },
    {
        icon: Wallet,
        title: 'Cabzi Bank FinTech Suite',
        description: 'Access instant loans for repairs, earn interest on your wallet balance, and manage your finances.'
    },
    {
        icon: Wrench,
        title: 'Partner Support System',
        description: 'Get on-spot assistance from our ResQ network if your vehicle breaks down, so you lose less time.'
    }
]

const howItWorksSteps = [
    {
        step: 1,
        icon: MapPin,
        title: "Book in Seconds",
        description: "Enter your destination and choose your preferred ride. With fair, transparent pricing, you'll see your fare upfront. No surprises.",
    },
    {
        step: 2,
        icon: Car,
        title: "Ride with Confidence",
        description: "A professional, verified partner accepts your ride. Track them in real-time and enjoy a smooth, reliable journey to your destination.",
    },
    {
        step: 3,
        icon: Star,
        title: "Arrive Safe & Rate",
        description: "Reach your destination safely. Pay with cash or wallet, and rate your partner to help us maintain the highest quality standards.",
    }
]

const protectionLayers = [
    {
        value: 'path',
        icon: Car,
        title: 'Reliable PATH',
        subtitle: 'The Foundation',
        description: 'Fair & dependable mobility for your daily travel.',
        glowClassName: 'shadow-primary/30',
        iconClassName: 'text-primary'
    },
    {
        value: 'resq',
        icon: Wrench,
        title: 'On-Spot ResQ',
        subtitle: 'The Support',
        description: 'Instant roadside assistance for our partners, ensuring reliability.',
        glowClassName: 'shadow-amber-500/30',
        iconClassName: 'text-amber-500'
    },
     {
        value: 'bank',
        icon: Landmark,
        title: 'Cabzi Bank',
        subtitle: 'The FinTech Engine',
        description: 'A complete financial ecosystem for our partners with savings, loans, and payments.',
        glowClassName: 'shadow-green-600/30',
        iconClassName: 'text-green-600'
    },
    {
        value: 'cure',
        icon: Ambulance,
        title: 'Emergency CURE',
        subtitle: 'The Lifeline',
        description: 'An integrated ambulance network for critical situations.',
        glowClassName: 'shadow-red-600/30',
        iconClassName: 'text-red-600'
    },
];

const AppDemoScreen = () => {
    return (
        <Carousel 
            className="w-full h-full"
            plugins={[ Autoplay({ delay: 3000, stopOnInteraction: true }) ]}
            opts={{ loop: true }}
        >
            <CarouselContent>
                <CarouselItem>
                    <div className="p-4 bg-muted/20 h-full flex flex-col justify-end">
                        <Card>
                             <CardHeader><CardTitle>1. Choose Your Ride</CardTitle></CardHeader>
                             <CardContent className="space-y-2">
                                 <div className="p-2 rounded-lg border bg-background flex items-center justify-between"><span>Bike</span><span className="font-bold">₹85</span></div>
                                 <div className="p-2 rounded-lg border-2 border-primary bg-primary/10 flex items-center justify-between"><span>Auto</span><span className="font-bold">₹120</span></div>
                                 <div className="p-2 rounded-lg border bg-background flex items-center justify-between"><span>Cab</span><span className="font-bold">₹210</span></div>
                             </CardContent>
                              <CardFooter>
                                 <Button className="w-full">Confirm Ride</Button>
                              </CardFooter>
                        </Card>
                    </div>
                </CarouselItem>
                 <CarouselItem>
                    <div className="p-4 bg-muted/20 h-full flex flex-col justify-center items-center text-center">
                         <Card className="w-full">
                            <CardHeader>
                                <CardTitle>2. Partner is On The Way</CardTitle>
                                <CardDescription>Arriving in 5 mins</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center gap-3 bg-muted p-3 rounded-lg">
                                    <Avatar className="w-12 h-12"><AvatarImage src="https://i.pravatar.cc/150?u=driver" alt="Driver"/><AvatarFallback>RK</AvatarFallback></Avatar>
                                    <div className="text-left">
                                        <p className="font-bold">Ramesh Kumar</p>
                                        <p className="text-sm text-muted-foreground">Maruti Swift - DL 01 AB 1234</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-lg flex items-center">4.9 <Star className="w-4 h-4 ml-1 text-yellow-400"/></p>
                                    </div>
                                </div>
                                <div className="text-center p-4 rounded-lg bg-accent/20">
                                    <p className="text-sm text-muted-foreground">Your OTP is</p>
                                    <p className="text-4xl font-bold tracking-[0.5em] text-accent-foreground">1234</p>
                                </div>
                            </CardContent>
                         </Card>
                    </div>
                </CarouselItem>
                 <CarouselItem>
                    <div className="p-4 bg-muted/20 h-full flex flex-col justify-center items-center text-center">
                        <Card className="w-full">
                             <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Wallet className="text-primary"/> Cabzi Bank</CardTitle>
                                <CardDescription>Your Partner Financial Hub</CardDescription>
                             </CardHeader>
                             <CardContent className="space-y-4">
                                 <Card className="bg-primary text-primary-foreground">
                                    <CardContent className="p-4">
                                        <p className="text-sm text-primary-foreground/80">Wallet Balance</p>
                                        <p className="text-3xl font-bold">₹12,540.00</p>
                                    </CardContent>
                                 </Card>
                                 <Card className="bg-green-600/20 border-green-500">
                                    <CardContent className="p-3 text-center">
                                        <p className="font-semibold text-green-700 dark:text-green-300">Instant Loan up to ₹15,000</p>
                                    </CardContent>
                                 </Card>
                             </CardContent>
                        </Card>
                    </div>
                </CarouselItem>
                <CarouselItem>
                    <div className="p-4 bg-muted/20 h-full flex flex-col justify-center items-center text-center">
                        <Card className="w-full">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Car className="text-primary"/> Vehicle Finance</CardTitle>
                                <CardDescription>Own Your Ride with Cabzi</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                               <div className="p-4 rounded-lg bg-muted flex items-center justify-center gap-4">
                                   <Bike className="w-10 h-10 text-muted-foreground" />
                                   <Car className="w-12 h-12 text-muted-foreground" />
                               </div>
                                <p className="text-sm text-muted-foreground">Get easy EMI options for new Bikes and Cars through our trusted dealer network.</p>
                                <Button variant="outline">Explore Finance Options</Button>
                            </CardContent>
                        </Card>
                    </div>
                </CarouselItem>
                <CarouselItem>
                    <div className="p-4 bg-muted/20 h-full flex flex-col justify-center items-center text-center">
                        <Card className="w-full border-red-500/50 bg-red-500/5">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-red-600"><Ambulance /> Emergency CURE</CardTitle>
                                <CardDescription>24/7 Life-Saving Support</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2 text-center">
                                <p className="text-sm text-muted-foreground">Request a verified ambulance from our network of partner hospitals in any emergency.</p>
                                <Button variant="destructive" className="w-full">Request Ambulance</Button>
                            </CardContent>
                        </Card>
                    </div>
                </CarouselItem>
                <CarouselItem>
                    <div className="p-4 bg-muted/20 h-full flex flex-col justify-center items-center text-center">
                        <Card className="w-full border-amber-500/50 bg-amber-500/5">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-amber-600"><Wrench /> On-Spot ResQ</CardTitle>
                                <CardDescription>Roadside Assistance for Partners</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2 text-center">
                                <p className="text-sm text-muted-foreground">Vehicle breakdown? Get instant help from a nearby verified mechanic from our ResQ network.</p>
                                <Button variant="outline" className="w-full border-amber-500 text-amber-600 hover:bg-amber-500/10">Find Mechanic</Button>
                            </CardContent>
                        </Card>
                    </div>
                </CarouselItem>
            </CarouselContent>
        </Carousel>
    )
}

export default function HomePage() {
  const [activeIndex, setActiveIndex] = useState(0);
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 12,
      },
    },
  };
  
    const cycle = () => {
        setActiveIndex(prev => (prev + 1) % protectionLayers.length);
    };
  
    useEffect(() => {
        const interval = setInterval(cycle, 3000);
        return () => clearInterval(interval);
    }, []);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-sm">
        <div className="container flex h-14 items-center">
            <Link href="/" className="mr-6 flex items-center gap-2">
                <BrandLogo hideText={true} iconClassName="w-8 h-8" />
                <span className="text-xl font-bold">Cabzi</span>
            </Link>
          <div className="flex flex-1 items-center justify-end gap-4">
             <Link href="/login?role=driver" className="hidden sm:inline-flex">
              <Button variant="ghost">Partner Login</Button>
            </Link>
             <Link href="/login?role=rider">
              <Button>Book a Ride</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 md:py-28 overflow-hidden">
             <div className="absolute inset-0 -z-20">
                <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background"></div>
             </div>
             <div className="absolute -top-1/4 -right-1/4 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl -z-10" />
             <div className="absolute -bottom-1/4 -left-1/4 w-[800px] h-[800px] bg-accent/5 rounded-full blur-3xl -z-10" />
            <div className="container grid md:grid-cols-2 gap-12 items-center">
                 <MotionDiv
                    initial="hidden"
                    animate="visible"
                    variants={containerVariants}
                    className="text-center md:text-left"
                >
                    <MotionDiv variants={itemVariants}>
                         <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70">
                           The Safest Ride. Fair for Everyone.
                        </h1>
                    </MotionDiv>
                    <MotionDiv variants={itemVariants}>
                        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
                            Cabzi is more than a ride. It's a promise of fair fares, reliable drivers, and an integrated safety network that looks out for you on every trip.
                        </p>
                    </MotionDiv>
                    <MotionDiv variants={itemVariants} className="mt-8 flex justify-center md:justify-start gap-4">
                        <Link href="/login?role=rider">
                            <Button size="lg" className="btn-glow">
                               Get a Safe Ride <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </Link>
                         <Link href="/partner-hub">
                            <Button size="lg" variant="outline">
                                Become a Partner
                            </Button>
                        </Link>
                    </MotionDiv>
                </MotionDiv>
                
                 <MotionDiv variants={itemVariants} className="relative w-72 mx-auto h-[550px] bg-background/50 dark:bg-background/30 rounded-[3rem] border-4 border-neutral-500/50 shadow-xl overflow-hidden ring-4 ring-background/10">
                    <div className="absolute inset-x-0 top-4 h-6 z-10 flex items-center justify-center">
                        <div className="w-28 h-5 bg-black rounded-full"></div>
                    </div>
                    <div className="relative w-full h-full rounded-[2.5rem] overflow-hidden">
                       <AppDemoScreen />
                    </div>
                </MotionDiv>
            </div>
        </section>
        
        {/* Interactive "CPR Ecosystem" Section */}
         <section className="py-20 md:py-24 bg-background">
            <div className="container">
                <div className="mx-auto max-w-3xl text-center">
                    <h2 className="text-3xl font-bold tracking-tight sm:text-4xl flex items-center justify-center gap-3">
                        Your City's Shield: The CPR Ecosystem
                    </h2>
                    <p className="mt-4 text-lg text-muted-foreground">
                       Discover the integrated layers that make Cabzi more than just a ride.
                    </p>
                </div>
                 <div className="relative mt-8 w-full h-[500px] flex items-center justify-center cursor-pointer" onClick={cycle}>
                     <AnimatePresence>
                         {protectionLayers.map((card, index) => {
                            const position = (index - activeIndex + protectionLayers.length) % protectionLayers.length;
                            const isCenter = position === 1;
                            const zIndex = isCenter ? 30 : (position === 0 || position === 2 ? 20 : 10);
                            const scale = isCenter ? 1 : 0.8;
                            let x = '0%';
                            if (position === 0) x = '-50%';
                            if (position === 2) x = '50%';
                            if (position === 3) x = '100%';


                            const opacity = isCenter ? 1 : (position === 0 || position === 2 ? 0.6 : 0);

                            return (
                                <MotionDiv
                                    key={card.value}
                                    initial={{ x: x, scale: scale, opacity: 0, zIndex: zIndex }}
                                    animate={{ x: x, scale: scale, opacity: opacity, zIndex: zIndex }}
                                    exit={{ opacity: 0, scale: 0.5, x: x === '50%' ? '100%' : (x === '-50%' ? '-100%' : x) }}
                                    transition={{ type: 'spring', stiffness: 260, damping: 30 }}
                                    className="absolute w-[320px] h-[420px]"
                                >
                                     <Card className={cn(
                                        "w-full h-full flex flex-col p-6 rounded-2xl transition-all duration-300",
                                        "bg-background/30 backdrop-blur-md border",
                                        isCenter ? `shadow-2xl ${card.glowClassName}` : 'shadow-lg'
                                      )}>
                                        <CardHeader className="items-center p-0">
                                             <div className="p-4 rounded-full mb-4 bg-background">
                                                <card.icon className={cn("w-12 h-12", card.iconClassName)} />
                                            </div>
                                            <CardTitle className="text-2xl">{card.title}</CardTitle>
                                            <CardDescription className="font-semibold text-foreground/80">{card.subtitle}</CardDescription>
                                        </CardHeader>
                                        <CardContent className="p-0 text-center mt-4 flex-1">
                                             <p className="text-muted-foreground">{card.description}</p>
                                        </CardContent>
                                    </Card>
                                </MotionDiv>
                            );
                        })}
                    </AnimatePresence>
                </div>
            </div>
        </section>

        {/* How it works section */}
        <section className="py-20 md:py-24 bg-muted/40">
            <div className="container">
                 <div className="mx-auto max-w-3xl text-center">
                    <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                        Effortless, From Start to Finish
                    </h2>
                    <p className="mt-4 text-lg text-muted-foreground">
                        Your next safe and reliable ride is just a few taps away. Here’s how simple it is.
                    </p>
                </div>
                <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
                    {howItWorksSteps.map((step, index) => (
                        <MotionDiv 
                            key={step.step}
                             initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, amount: 0.5 }}
                            variants={itemVariants}
                            transition={{delay: index * 0.1}}
                        >
                            <Card className="text-center p-6 h-full">
                                <CardHeader className="p-0">
                                    <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center ring-8 ring-background">
                                       <step.icon className="h-8 w-8 text-primary" />
                                    </div>
                                    <CardTitle className="pt-4 text-2xl">{step.title}</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0 mt-2">
                                     <p className="text-muted-foreground">{step.description}</p>
                                </CardContent>
                            </Card>
                        </MotionDiv>
                    ))}
                </div>
            </div>
        </section>

        {/* The Cabzi Advantage Section */}
        <section className="py-20 md:py-24 bg-background">
             <div className="container">
                <div className="mx-auto max-w-3xl text-center">
                    <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                        The Cabzi Advantage
                    </h2>
                    <p className="mt-4 text-lg text-muted-foreground">
                       A fair ecosystem designed to benefit everyone. See why choosing Cabzi is a smarter decision for both riders and partners.
                    </p>
                </div>

                <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                    <Card className="p-6">
                        <CardHeader className="p-0 text-center">
                            <CardTitle className="text-2xl font-bold">For Riders</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 mt-6 space-y-6">
                            {riderAdvantages.map((advantage, index) => (
                                <div key={index} className="flex items-start gap-4">
                                    <div className="flex-shrink-0">
                                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                            <advantage.icon className="w-6 h-6 text-primary" />
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold">{advantage.title}</h4>
                                        <p className="text-sm text-muted-foreground">{advantage.description}</p>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card className="p-6">
                        <CardHeader className="p-0 text-center">
                            <CardTitle className="text-2xl font-bold">For Partners</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 mt-6 space-y-6">
                            {partnerAdvantages.map((advantage, index) => (
                                <div key={index} className="flex items-start gap-4">
                                    <div className="flex-shrink-0">
                                        <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                                            <advantage.icon className="w-6 h-6 text-accent-foreground" />
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold">{advantage.title}</h4>
                                        <p className="text-sm text-muted-foreground">{advantage.description}</p>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
             </div>
        </section>

      </main>

      <footer className="py-6 md:px-8 md:py-0 bg-background border-t">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            Built by Team Cabzi.
          </p>
           <div className="flex items-center gap-4 text-sm text-muted-foreground">
             <Link href="/terms" className="hover:text-primary">Terms of Service</Link>
             <Link href="/privacy" className="hover:text-primary">Privacy Policy</Link>
           </div>
        </div>
      </footer>
    </div>
  )
}
