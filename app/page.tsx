
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { NewLogoIcon } from '@/components/brand-logo'

export default function SplashPage() {
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/home')
    }, 3000) // 3-second splash screen

    return () => clearTimeout(timer)
  }, [router])

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5, delay: 2.5 }}
        className="flex h-screen w-full items-center justify-center bg-background"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            duration: 1,
            ease: [0, 0.71, 0.2, 1.01],
          }}
        >
          <NewLogoIcon className="w-48 h-48" />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
