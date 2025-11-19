
'use client'

import React, { useEffect, useRef } from 'react'
import Link from 'next/link'
import AOS from 'aos'
import 'aos/dist/aos.css'

import { Button } from '@/components/ui/button'
import BrandLogo from '@/components/shared/brand-logo'

import {
  ArrowRight, Car, Wrench, Ambulance, Landmark, Shield, IndianRupee, Sun, Moon, Globe,
  MapPin, Clock, Calendar, FlaskConical, Home, Siren, CheckCircle, XCircle
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

const ecosystemCards = [
    { title: "Fair Fares with PATH", description: "Our core 0% commission ride-hailing service ensures drivers earn more and riders pay fair, consistent fares. No surge, no surprises.", icon: Car, glowColor: "hsl(210 100% 56%)" },
    { title: "Reliability with ResQ", description: "Our network of verified mechanics provides instant on-road assistance to our partners, minimizing downtime and ensuring a reliable service for you.", icon: Wrench, glowColor: "hsl(36 100% 50%)" },
    { title: "Safety with CURE", description: "In an emergency, every second counts. Our integrated ambulance dispatch and doctor appointment system connects you to the nearest partner hospital.", icon: Ambulance, glowColor: "hsl(0 84% 60%)" },
    { title: "Empowerment with Bank", description: "We are a FinTech company at heart. Our 'Curocity Bank' offers partners instant loans, savings, and financial security, creating a loyal and happy fleet.", icon: Landmark, glowColor: "hsl(142 71% 45%)" },
]

const dayTimelineItems = [
    { time: "Daily Commute", title: "The Morning Rush", description: "Start your day stress-free with Curocity's PATH service. Reliable rides, fair fares, no surge pricing.", icon: Car },
    { time: "Sudden Breakdown", title: "Roadside ResQ", description: "Car trouble? One tap brings a verified ResQ mechanic to your location for on-the-spot repairs.", icon: Wrench },
    { time: "Financial Need", title: "Curocity Bank", description: "Unexpected expense? Get instant, fair-interest credit directly from your Curocity wallet, no questions asked.", icon: Landmark },
    { time: "Household Needs", title: "Home Services", description: "Need a plumber or electrician? Curocity connects you with trusted local professionals.", icon: Home },
    { time: "Feeling Unwell", title: "Doctor Visit", description: "Instantly book an in-clinic or video appointment with a specialist.", icon: Calendar },
    { time: "Health Checkup", title: "Lab Tests at Home", description: "A certified phlebotomist will collect your sample from the comfort of your home.", icon: FlaskConical },
    { time: "In an Emergency", title: "The Safety Net", description: "Health emergency? Don't panic. CURE connects you to the nearest ambulance in seconds.", icon: Siren },
]

const whyCurocityItems = [
    { title: "The Old Way: A Partner's Struggle", description: "A system that profits from a partner's hard work, offering little in return.", points: ["Lose 30% of your earnings to high commissions.", "Unpredictable income due to fluctuating demand.", "No financial safety net for emergencies."], icon: XCircle, isCurocityWay: false },
    { title: "The Curocity Way: A True Partnership", description: "An ecosystem designed to empower partners, not just use them.", points: ["0% commission. You keep 100% of the fare.", "Access to instant loans and high-interest savings.", "A dedicated ResQ network to get you back on the road faster."], icon: CheckCircle, isCurocityWay: true }
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
  const isInView = useInView(timelineRef, { once: true, amount: 0.4 });


  return (
    <div className={cn("flex flex-col min-h-screen bg-background aurora-background")}>
      <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-sm">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <BrandLogo hideText={false} iconClassName="w-8 h-8" />
          </Link>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  Login / Signup
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle><BrandLogo /></SheetTitle>
                </SheetHeader>
                <div className="grid gap-4 py-4">
                  <Button asChild><Link href="/login?role=user">Login as User</Link></Button>
                  <Button asChild variant="outline"><Link href="/partner-hub">Become a Partner</Link></Button>
                  <Separator />
                  <Button asChild variant="ghost" className="text-xs"><Link href="/login?role=admin">Admin Panel</Link></Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative py-24 md:py-32 text-center">
          <div className="container" data-aos="fade-up">
            <h1 className="text-5xl md:text-6xl font-extrabold font-headline animate-text-gradient bg-gradient-to-r from-primary via-accent to-primary">
              Move. Heal. Fix. <br /> One App for Your Urban Life.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              Curocity is India's first Super App for mobility, safety, and daily life. From fair-fare rides and 24/7 roadside assistance to emergency ambulance dispatch, we've integrated all your essential urban needs into one powerful, seamless platform.
            </p>
            <div className="mt-10 flex justify-center gap-4">
              <Button size="lg" className="btn-glow bg-accent text-accent-foreground hover:bg-accent/90" asChild>
                <Link href="/login?role=user">Get Started <ArrowRight className="ml-2 h-5 w-5" /></Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="#ecosystem">Explore Ecosystem</Link>
              </Button>
            </div>
          </div>
        </section>

        <section id="ecosystem" className="py-20 md:py-24 bg-muted/30">
          <div className="container">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold font-headline" data-aos="fade-up">One App for Your Entire Day</h2>
              <p className="mt-4 text-muted-foreground" data-aos="fade-up" data-aos-delay="100">
                Curocity integrates mobility, health, and assistance services into one seamless Super App, creating a safety net for your everyday life.
              </p>
            </div>
            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {ecosystemCards.map((card, i) => (
                <div key={card.title} data-aos="fade-up" data-aos-delay={100 * (i + 1)}>
                  <Card style={{ '--glow-color': card.glowColor } as React.CSSProperties} className="card-glow text-center h-full flex flex-col">
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
                        From your morning commute to unexpected emergencies, see how Curocity fits into your day.
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
                            <div className={`w-1/2 ${index % 2 === 0 ? 'pr-8' : 'pl-8 order-2'}`}>
                                <Card className="p-4" data-aos={index % 2 === 0 ? 'fade-right' : 'fade-left'}>
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

        <section className="py-20 md:py-24 bg-muted/30">
          <div className="container">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold font-headline" data-aos="fade-up">Why Choose Curocity?</h2>
              <p className="mt-4 text-muted-foreground" data-aos="fade-up" data-aos-delay="100">
                We're rebuilding ride-hailing from the ground up to be fair, safe, and reliable for everyone involved.
              </p>
            </div>
            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
                {whyCurocityItems.map((item, i) => (
                    <div key={item.title} data-aos="fade-up" data-aos-delay={100 * (i + 1)}>
                        <Card className={cn("h-full flex flex-col", item.isCurocityWay && "border-primary/50 bg-primary/5")}>
                            <CardHeader className="text-center">
                                <item.icon className={cn("w-10 h-10 mx-auto mb-2", item.isCurocityWay ? 'text-green-500' : 'text-destructive')} />
                                <CardTitle>{item.title}</CardTitle>
                                <CardDescription>{item.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <ul className="space-y-3">
                                    {item.points.map(point => (
                                        <li key={point} className="flex items-start">
                                            {item.isCurocityWay 
                                                ? <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 shrink-0" /> 
                                                : <XCircle className="w-5 h-5 text-destructive mr-3 mt-0.5 shrink-0" />}
                                            <span className="text-sm">{point}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    </div>
                ))}
            </div>
          </div>
        </section>

        <CuroMindReveal />

        <section className="py-20 md:py-32">
            <div className="container text-center">
                <h2 className="text-3xl md:text-4xl font-bold font-headline" data-aos="fade-up">Ready to Join the Revolution?</h2>
                <p className="mt-4 text-muted-foreground max-w-xl mx-auto" data-aos="fade-up" data-aos-delay="100">
                    Whether you need a ride or want to earn with fairness and respect, Curocity is your partner.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
                    <Button size="lg" className="btn-glow bg-accent text-accent-foreground hover:bg-accent/90" asChild data-aos="fade-up" data-aos-delay="200">
                        <Link href="/login?role=user">Get a Safe Ride</Link>
                    </Button>
                    <Button size="lg" variant="outline" asChild data-aos="fade-up" data-aos-delay="300">
                        <Link href="/partner-hub">Become a Partner</Link>
                    </Button>
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
