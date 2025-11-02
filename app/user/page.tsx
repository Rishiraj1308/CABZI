
'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Car, Wrench, Ambulance, Calendar, TestTube, Search, X, Mic, AlertTriangle, Phone, History, MapPin, ArrowUpRight, Clock, MessageCircle, Shield, Home
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/hooks/use-language'
import { Input } from '@/components/ui/input'
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'

const ServiceCard = ({
  service,
  onClick,
}: {
  service: any
  onClick: () => void
}) => (
  <button
    className="serviceCard group flex items-center justify-between rounded-2xl border border-border bg-card p-5 sm:p-6 hover:bg-accent/10 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
    role="button"
    tabIndex={0}
    title={service.title}
    onClick={onClick}
    data-label={service.label}
  >
    <div className="flex items-center gap-4 text-left">
      <span className={cn("inline-flex h-10 w-10 items-center justify-center rounded-full ring-1", service.iconBg, service.iconRing, service.iconColor)}>
        <service.icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-[15px] sm:text-base font-semibold tracking-tight text-card-foreground">{service.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{service.description}</p>
      </div>
    </div>
    <div className="flex items-center gap-2">
      {service.tag && (
        <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px]", service.tagBg, service.tagBorder, service.tagColor)}>
          <service.tagIcon className="h-3 w-3" />
          {service.tag}
        </span>
      )}
      <ArrowUpRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground" />
    </div>
  </button>
)

export default function ServicePortalPage() {
  const router = useRouter()
  const { language, t } = useLanguage();
  const { toast } = useToast()
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSosModalOpen, setIsSosModalOpen] = useState(false);
  const [services, setServices] = useState<any[]>([]);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const headingText = "How can we help you today?".split("");

  const serviceData = React.useMemo(() => [
    { id: 'ride', href: '/user/book', icon: Car, title: 'Ride', description: 'On-demand transport to clinics', tag: '5–10m', tagIcon: Clock, iconBg: 'bg-emerald-400/15', iconRing: 'ring-emerald-400/30', iconColor: 'text-emerald-500', tagBg: 'bg-emerald-400/10', tagBorder: 'border-emerald-400/30', tagColor: 'text-emerald-600', label: 'ride transport car taxi clinic mobility hospital cab गाड़ी कार टैक्सी' },
    { id: 'resq', href: '/user/resq', icon: Wrench, title: 'ResQ', description: 'On-site assistance for minor issues', tag: 'On-Demand', tagIcon: Wrench, iconBg: 'bg-amber-400/15', iconRing: 'ring-amber-400/30', iconColor: 'text-amber-500', tagBg: 'bg-amber-400/10', tagBorder: 'border-amber-400/30', tagColor: 'text-amber-600', label: 'resq on-site assistance home help nurse minor issues support मदद सहायता' },
    { id: 'sos', onClick: () => setIsSosModalOpen(true), icon: Ambulance, title: 'Emergency SOS', description: 'Connect to 24/7 emergency line', tag: '24/7', tagIcon: AlertTriangle, iconBg: 'bg-red-500/20', iconRing: 'ring-red-500/40', iconColor: 'text-red-500', tagBg: 'bg-red-400/10', tagBorder: 'border-red-400/40', tagColor: 'text-red-600', label: 'sos emergency ambulance urgent help police fire medical आपातकालीन एम्बुलेंस मदद' },
    { id: 'appointment', href: '/user/appointments', icon: Calendar, title: 'Book Appointment', description: 'Clinics, specialists, telehealth', tag: 'Next: 1–2d', tagIcon: Clock, iconBg: 'bg-sky-400/15', iconRing: 'ring-sky-400/30', iconColor: 'text-sky-500', tagBg: 'bg-sky-400/10', tagBorder: 'border-sky-400/30', tagColor: 'text-sky-200', label: 'book appointment doctor specialist telehealth clinic schedule calendar अपॉइंटमेंट डॉक्टर' },
    { id: 'lab_tests', href: '/user/lab-tests', icon: TestTube, title: 'Lab Tests', description: 'Home sample pickup available', tag: 'Home pickup', tagIcon: Home, iconBg: 'bg-fuchsia-400/15', iconRing: 'ring-fuchsia-400/30', iconColor: 'text-fuchsia-500', tagBg: 'bg-fuchsia-400/10', tagBorder: 'border-fuchsia-400/30', tagColor: 'text-fuchsia-600', label: 'lab tests diagnostics blood test home pickup reports लैब टेस्ट' }
  ], []);
  
  useEffect(() => {
    setServices(serviceData);
  }, [serviceData]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
  };
  
  useEffect(() => {
    if (!searchQuery) {
      setServices(serviceData);
      return;
    }
    const lowercasedQuery = searchQuery.toLowerCase();
    const filtered = serviceData.filter(service => 
      service.label.toLowerCase().includes(lowercasedQuery) ||
      service.title.toLowerCase().includes(lowercasedQuery)
    );
    setServices(filtered);
  }, [searchQuery, serviceData]);
  
  const handleServiceClick = (service: any) => {
    if (service.onClick) {
      service.onClick();
    } else if (service.href) {
      router.push(service.href);
    }
  };

  const handleVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({
        variant: 'destructive',
        title: 'Browser Not Supported',
        description: 'Voice search is not available on this browser.',
      });
      return;
    }

    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    
    // Set language for recognition
    recognition.lang = language === 'hi' ? 'hi-IN' : 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event) => {
      toast({
        variant: 'destructive',
        title: 'Voice Search Error',
        description: event.error === 'not-allowed' ? 'Microphone permission denied.' : 'An error occurred.',
      });
      setIsListening(false);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setSearchQuery(transcript);
    };

    recognition.start();
  };

  return (
    <>
      <main id="main" className="relative z-10 p-4">
        <section className="mx-auto max-w-7xl">
          <div className="rounded-3xl border border-border bg-card/50 p-5 sm:p-8 md:p-10 shadow-xl backdrop-blur-sm">
            <div className="text-center">
              <h1 className="text-3xl sm:text-4xl md:text-5xl tracking-tight font-semibold text-foreground">
                {headingText.map((el, i) => (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{
                      duration: 0.25,
                      delay: i / 20,
                    }}
                    key={i}
                  >
                    {el}
                  </motion.span>
                ))}
              </h1>
              <p className="mt-2 text-base sm:text-lg text-muted-foreground font-normal">
                Choose a service to get started.
              </p>

              <div className="mt-6 relative max-w-xl mx-auto">
                <label htmlFor="serviceSearch" className="sr-only">Search services</label>
                <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
                  <Search className="h-4 w-4 text-muted-foreground" />
                </div>
                <Input
                  id="serviceSearch"
                  type="text"
                  autoComplete="off"
                  className="w-full rounded-xl border-border bg-background pl-9 pr-24 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Search services (e.g., ride, lab, appointment)"
                  value={searchQuery}
                  onChange={handleSearch}
                />
                <div className="absolute inset-y-0 right-0 mr-1.5 my-1.5 flex items-center gap-1.5">
                  <Button variant="ghost" size="icon" className={cn("h-8 w-8", isListening && "bg-destructive/20 text-destructive animate-pulse")} title="Voice search" onClick={handleVoiceSearch}>
                    <Mic className="h-4 w-4" />
                  </Button>
                  {searchQuery && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Clear search" onClick={() => { setSearchQuery('');}}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <Button variant="ghost" className="rounded-full px-3 py-1.5 text-xs font-medium">
                  <MapPin className="h-3.5 w-3.5 mr-1.5" /> Nearest clinic
                </Button>
                <Button variant="ghost" className="rounded-full px-3 py-1.5 text-xs font-medium" onClick={() => router.push('/user/activity')}>
                  <History className="h-3.5 w-3.5 mr-1.5" /> Recent Activity
                </Button>
              </div>
            </div>
            
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              {services.map(service => (
                <ServiceCard key={service.id} service={service} onClick={() => handleServiceClick(service)} />
              ))}
            </div>

            {services.length === 0 && searchQuery && (
                 <div className="mt-4 rounded-xl border border-border bg-muted/50 p-5 text-center">
                    <div className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-background border">
                        <Search className="h-4 w-4 text-muted-foreground"/>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">No services match your search.</p>
                </div>
            )}

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              {/* Buttons removed as per user requests */}
            </div>
          </div>
        </section>

        <AlertDialog open={isSosModalOpen} onOpenChange={setIsSosModalOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <div className="flex items-start gap-3">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20 ring-1 ring-red-500/50 text-red-600">
                            <AlertTriangle className="h-5 w-5" />
                        </span>
                        <div>
                        <AlertDialogTitle>Confirm Emergency SOS</AlertDialogTitle>
                        <AlertDialogDescription>
                            We will connect you to emergency services and share your contact details.
                        </AlertDialogDescription>
                        </div>
                    </div>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-5 grid grid-cols-2 gap-3">
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction asChild>
                        <a href="tel:112" className={cn(buttonVariants({variant: "destructive"}), "bg-red-600 hover:bg-red-700")}>
                           <Phone className="h-4 w-4 mr-2" /> Call now
                        </a>
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </main>
    </>
  )
}
