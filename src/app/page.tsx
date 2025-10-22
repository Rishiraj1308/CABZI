
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { NewLogoIcon } from '@/components/brand-logo'

export default function SplashPage() {
  const router = useRouter()
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted) {
      const handleRedirect = () => {
        let targetRoute = '/home'; // Default route
        
        const sessionKeys = [
          { key: 'cabzi-session', role: 'admin', path: '/admin' },
          { key: 'cabzi-driver-session', role: 'driver', path: '/driver' },
          { key: 'cabzi-resq-session', role: 'mechanic', path: '/mechanic' },
          { key: 'cabzi-cure-session', role: 'cure', path: '/cure' },
          { key: 'cabzi-ambulance-session', role: 'ambulance', path: '/ambulance' },
          { key: 'cabzi-doctor-session', role: 'doctor', path: '/doctor' },
          { key: 'cabzi-user-session', role: 'user', path: '/user' }, // General user/rider
        ];
        
        for (const { key, path } of sessionKeys) {
          const session = localStorage.getItem(key);
          if (session) {
            try {
              // Just checking for existence is enough for redirection.
              JSON.parse(session);
              targetRoute = path;
              break; 
            } catch (e) {
              localStorage.removeItem(key);
            }
          }
        }
        router.replace(targetRoute);
      };

      const timer = setTimeout(() => {
          handleRedirect();
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [isMounted, router]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.5 }}
      className="flex flex-col min-h-screen items-center justify-center bg-background gap-4"
    >
        <NewLogoIcon className="w-36 h-36" />
        <h1 className="text-5xl font-extrabold tracking-tight animate-text-gradient bg-gradient-to-r from-primary via-accent to-primary -mt-4 font-headline">
            Cabzi
        </h1>
    </motion.div>
  )
}
