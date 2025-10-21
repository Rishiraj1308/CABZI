
'use client'

import { Toaster } from '@/components/ui/toaster';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MotionDiv } from '@/components/ui/motion-div';
import { AnimatePresence } from 'framer-motion';
import { FirebaseProviderClient } from '@/firebase/client-provider';

// This layout now checks for an existing session and redirects if found.
export default function UnauthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname(); // Get the current path
  const [isMounted, setIsMounted] = useState(false);
  const [showChildren, setShowChildren] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // A single, unified session for all user types (rider, driver, etc.)
    // Only admin has a truly separate flow.
    const session = localStorage.getItem('cabzi-session');

    if (session) {
        try {
            const { role, adminRole } = JSON.parse(session);
            
            // Handle admin redirection separately
            if (role === 'admin' || adminRole) {
                 router.replace(`/admin`);
                 return;
            }

            // All other logged-in users go to the main user dashboard
            if (role) {
                router.replace(`/${role}`);
                return;
            }
            
        } catch (e) {
            // Corrupt session, remove it and show login.
            localStorage.removeItem('cabzi-session');
        }
    }
    
    // If no valid session is found, show the login/onboarding page.
    setShowChildren(true);

  }, [router]);
  
  if (!isMounted || !showChildren) {
    return null; // Render nothing until logic decides.
  }

  return (
    <FirebaseProviderClient>
      <AnimatePresence mode="wait">
        <MotionDiv
          key={pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {children}
        </MotionDiv>
      </AnimatePresence>
      <Toaster />
    </FirebaseProviderClient>
  );
}
