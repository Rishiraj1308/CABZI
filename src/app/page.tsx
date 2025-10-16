'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { NewLogoIcon } from '@/components/brand-logo'
import { useAuth } from '@/firebase/client-provider'

export default function SplashPage() {
  const router = useRouter()
  const { user, isUserLoading } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // Only run this logic on the client-side after the component has mounted and auth state is resolved.
    if (!isMounted || isUserLoading) {
      return;
    }

    const handleRedirect = () => {
      let targetRoute = '/home'; // Default route
      let sessionFound = false;

      // Check all possible session keys
      const sessionKeys = ['cabzi-session', 'cabzi-resq-session', 'cabzi-cure-session', 'cabzi-ambulance-session'];
      for (const key of sessionKeys) {
        const session = localStorage.getItem(key);
        if (session) {
          try {
            const { role } = JSON.parse(session);
            if (role) {
              targetRoute = `/${role}`;
              sessionFound = true;
              break; 
            }
          } catch (e) {
            localStorage.removeItem(key);
          }
        }
      }

      // If a Firebase user exists but no valid session, it's a broken state. Clear it.
      if (user && !sessionFound) {
        localStorage.clear();
      }

      router.replace(targetRoute);
    };

    // Delay the redirect to allow the splash animation to run
    const timer = setTimeout(() => {
        handleRedirect();
    }, 2500);

    return () => clearTimeout(timer);
  }, [isMounted, isUserLoading, user, router]);

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
