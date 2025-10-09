
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { NewLogoIcon } from '@/components/brand-logo'

export default function SplashPage() {
  const router = useRouter()

  useEffect(() => {
    const session = localStorage.getItem('cabzi-session');
    let targetRoute = '/home'; // Default route for non-logged-in users

    if (session) {
      try {
        const { role } = JSON.parse(session);
        if (role === 'rider') targetRoute = '/rider';
        else if (role === 'driver') targetRoute = '/driver';
        else if (role === 'admin') targetRoute = '/admin';
      } catch (e) {
        // Corrupt session, clear it and go to home
        localStorage.removeItem('cabzi-session');
      }
    }

    const timer = setTimeout(() => {
      router.replace(targetRoute);
    }, 2500); // Increased delay for a better feel

    return () => clearTimeout(timer)
  }, [router])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.5 }}
      className="flex flex-col min-h-screen items-center justify-center bg-background gap-4"
    >
        <NewLogoIcon className="w-36 h-36" />
        <h1 className="text-5xl font-extrabold tracking-tight animate-text-gradient bg-gradient-to-r from-primary via-accent to-primary -mt-4">
            Cabzi
        </h1>
    </motion.div>
  )
}

    