
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { NewLogoIcon } from '@/components/brand-logo'

export default function SplashPage() {
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => {
        router.replace('/home');
    }, 2500);

    return () => clearTimeout(timer);
  }, [router]);

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
