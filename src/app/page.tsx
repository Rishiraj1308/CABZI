'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { NewLogoIcon } from '@/components/brand-logo'
import { useAuth } from '@/firebase/client-provider'

export default function SplashPage() {
  const router = useRouter()
  const { user, isUserLoading } = useAuth();
  
  useEffect(() => {
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

      // If no valid session is found, but a user is logged into Firebase, it might be a broken session.
      // Clear localStorage to force a fresh login flow.
      if (user && !sessionFound) {
        localStorage.clear();
      }

      router.replace(targetRoute);
    };

    const timer = setTimeout(() => {
      // Wait for auth state to be resolved before redirecting
      if (!isUserLoading) {
        handleRedirect();
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [router, user, isUserLoading]);
  
   useEffect(() => {
    // This effect runs if auth state changes after the initial timeout
    if (!isUserLoading) {
        const timer = setTimeout(() => {
            // Re-check where to redirect
            let targetRoute = '/home';
            const session = localStorage.getItem('cabzi-session') || localStorage.getItem('cabzi-resq-session') || localStorage.getItem('cabzi-cure-session');
            if (session) {
                 try {
                    const { role } = JSON.parse(session);
                    if (role) targetRoute = `/${role}`;
                 } catch(e) {/* ignore */}
            }
            if (window.location.pathname === '/') {
                 router.replace(targetRoute);
            }
        }, 500); // Shorter delay for subsequent checks
        return () => clearTimeout(timer);
    }
   }, [isUserLoading, router]);

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
