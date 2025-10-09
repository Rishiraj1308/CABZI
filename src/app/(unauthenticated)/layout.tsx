
'use client'

import { Toaster } from '@/components/ui/toaster';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MotionDiv } from '@/components/ui/motion-div';
import { AnimatePresence } from 'framer-motion';

// This layout now checks for an existing session and redirects if found.
export default function UnauthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const session = localStorage.getItem('cabzi-session');
    if (session) {
      try {
        const { role } = JSON.parse(session);
        if (role === 'rider') router.replace('/rider');
        else if (role === 'driver') router.replace('/driver');
        else if (role === 'admin') router.replace('/admin');
      } catch (e) {
        // Corrupt session, let them log in again.
        localStorage.removeItem('cabzi-session');
      }
    }
  }, [router]);
  
  // To prevent flash of login page for logged-in users
  if (!isMounted || (typeof window !== 'undefined' && localStorage.getItem('cabzi-session'))) {
    return null; 
  }

  return (
    <>
      <AnimatePresence mode="wait">
        <MotionDiv
          key={router.asPath}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {children}
        </MotionDiv>
      </AnimatePresence>
      <Toaster />
    </>
  );
}
