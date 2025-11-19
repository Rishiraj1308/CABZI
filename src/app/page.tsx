
'use client'

import React, { useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import AOS from 'aos'
import 'aos/dist/aos.css'

import { Button } from '@/components/ui/button'
import BrandLogo from '@/components/shared/brand-logo'

import {
  ArrowRight, Car, Wrench, Ambulance, Landmark, Shield, IndianRupee, Sun, Moon, Globe,
  MapPin, Clock, Calendar, FlaskConical, Home, Siren, CheckCircle, XCircle, BrainCircuit
} from 'lucide-react'

import { motion, useInView, useScroll, useTransform } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import CuroMindReveal from '@/components/CuroMindReveal'

import dynamic from 'next/dynamic'
const ThemeToggle = dynamic(() => import('@/components/ThemeToggleClient'), { ssr: false })


function LanguageToggle() {
  const { setLanguage } = useLanguage()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Globe className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setLanguage('en')}>English</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLanguage('hi')}>हिन्दी</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const corePillars = [
    { title: "Curocity Platform", description: "The core engine for our 0% commission ride-hailing and emergency response network, ensuring fairness and reliability for everyone.", icon: Car, glowColor: "hsl(210 100% 56%)" },
    { title: "CuroBank", description: "The FinTech heart of our ecosystem. CuroBank provides partners with instant payouts, savings with interest, and access to fair credit, building financial security and loyalty.", icon: Landmark, glowColor: "hsl(142 71% 45%)" },
    { title: "CuroMind AI", description: "The intelligent layer that optimizes the entire platform. CuroMind handles smart dispatch, route optimization, and provides a personalized earnings coach for our partners.", icon: BrainCircuit, glowColor: "hsl(48 95% 55%)" },
]

const dayTimelineItems = [
    { time: "Daily Commute", title: "The Morning Rush", description: "Start your day stress-free with Curocity's PATH service. Reliable rides, fair fares, no surge pricing.", icon: Car },
    { time: "Sudden Breakdown", title: "Roadside ResQ", description: "Car trouble? One tap brings a verified ResQ mechanic to your location for on-the-spot repairs.", icon: Wrench },
    { time: "Financial Need", title: "CuroBank", description: "Unexpected expense? Get instant, fair-interest credit directly from your Curocity wallet, no questions asked.", icon: Landmark },
    { time: "In an Emergency", title: "The Safety Net", description: "Health emergency? Don't panic. CURE connects you to the nearest ambulance in seconds.", icon: Siren },
]


export default function HomePage() {
  useEffect(() => {
    AOS.init({ duration: 800, once: true, offset: 100 })
  }, [])
  
  const timelineRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: timelineRef,
    offset: ["start end", "end start"]
  });
  const height = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);


  return (
    <div className={cn("flex flex-col min-h-screen bg-background aurora-background")}>
      <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-sm">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2" aria-label="Curocity Home">
            <BrandLogo hideText={false} />
          </Link>
          <div className="hidden md:flex items-center gap-2">
             <Button variant="ghost" asChild><Link href="#">Download</Link></Button>
             <Button asChild><Link href="/login">Log in</Link></Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative py-20 md:py-28">
          <div className="container grid md:grid-cols-2 gap-10 items-center">
            <div className="text-center md:text-left" data-aos="fade-right">
                <h1 className="text-5xl md:text-7xl font-extrabold font-headline text-foreground">
                Move. Heal. Fix.
                </h1>
                <h2 className="text-3xl sm:text-4xl md:text-4xl font-bold text-primary mt-2">
                One App for Urban Life
                </h2>
                <p className="mt-6 text-lg text-muted-foreground max-w-lg mx-auto md:mx-0">
                    From your morning commute to sudden emergencies, one app handles it all. Curocity begins its journey at AMC, Dibrugarh with rides, rescue, and medical access.
                </p>
                <div className="mt-10 flex flex-col sm:flex-row justify-center md:justify-start gap-4">
                <Button size="lg" className="h-12 text-base btn-glow bg-accent text-accent-foreground hover:bg-accent/90" asChild>
                    <Link href="/login?role=user">Get Started</Link>
                </Button>
                <Button size="lg" variant="outline" className="h-12 text-base" asChild>
                    <Link href="#ecosystem">Learn More</Link>
                </Button>
                </div>
            </div>
             <div className="relative h-80 md:h-full w-full min-h-[300px]" data-aos="fade-left">
                <Image src="https://i.ibb.co/9rSgGjX/hero-curocity.png" layout="fill" objectFit="contain" alt="Curocity App Mockup" data-ai-hint="phone map car illustration" />
            </div>
          </div>
        </section>

        <section id="ecosystem" className="py-20 md:py-24 bg-muted/30">
          <div className="container">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold font-headline" data-aos="fade-up">Our Core Pillars</h2>
              <p className="mt-4 text-muted-foreground" data-aos="fade-up" data-aos-delay="100">
                Our all-in-one solution for rides, emergency response, and financial services - seamlessly integrating into your daily routine.
              </p>
            </div>
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
              {corePillars.map((card, i) => (
                <div key={card.title} data-aos="fade-up" data-aos-delay={100 * (i + 1)}>
                  <Card style={{ '--glow-color': card.glowColor } as React.CSSProperties} className="card-glow text-center h-full flex flex-col bg-card/50">
                    <CardHeader className="items-center">
                      <div className="p-3 rounded-full bg-primary/10 mb-2">
                        <card.icon className="w-8 h-8 text-primary" />
                      </div>
                      <CardTitle>{card.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-grow">
                      <p className="text-sm text-muted-foreground">{card.description}</p>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section ref={timelineRef} className="py-20 md:py-32">
            <div className="container max-w-3xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold font-headline" data-aos="fade-up">A Day with Curocity</h2>
                    <p className="mt-4 text-muted-foreground" data-aos="fade-up" data-aos-delay="100">
                        From morning commute to unexpected emergencies, see how Curocity fits into your day.
                    </p>
                </div>
                <div className="relative">
                    <div className="timeline-line" />
                    <motion.div style={{ height }} className="timeline-progress" />
                    {dayTimelineItems.map((item, index) => (
                        <motion.div 
                            key={index}
                            className="flex items-center w-full mb-8"
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ root: timelineRef, amount: 0.5 }}
                        >
                            <div className={`w-1/2 ${index % 2 === 0 ? 'pr-8 text-right' : 'pl-8 order-2 text-left'}`}>
                                <Card className="p-4 inline-block text-left" data-aos={index % 2 === 0 ? 'fade-right' : 'fade-left'}>
                                    <p className="text-sm font-semibold text-primary">{item.time}</p>
                                    <p className="font-bold">{item.title}</p>
                                    <p className="text-xs text-muted-foreground">{item.description}</p>
                                </Card>
                            </div>
                            <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center z-10 shrink-0 mx-auto order-1">
                                <item.icon className="w-6 h-6" />
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>

      </main>

      <footer className="py-6 bg-background border-t">
        <div className="container flex flex-col sm:flex-row justify-between items-center text-sm text-muted-foreground gap-4">
          <p>Built by Team Curocity © {new Date().getFullYear()}</p>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-primary">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-primary">Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
