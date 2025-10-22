
'use client'

import { Toaster } from '@/components/ui/toaster';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MotionDiv, AnimatePresence } from '@/components/ui/motion-div';
import { FirebaseProviderClient } from '@/firebase/client-provider';

// This layout now checks for an existing session and redirects if found.
export default function UnauthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [showChildren, setShowChildren] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    // Check all possible session keys
    const adminSession = localStorage.getItem('cabzi-session');
    const partnerSession = localStorage.getItem('cabzi-driver-session') || localStorage.getItem('cabzi-resq-session') || localStorage.getItem('cabzi-cure-session') || localStorage.getItem('cabzi-ambulance-session') || localStorage.getItem('cabzi-doctor-session');
    const userSession = localStorage.getItem('cabzi-user-session');

    if (adminSession) {
        try {
            const { adminRole } = JSON.parse(adminSession);
            if (adminRole) {
                router.replace('/admin');
                return;
            }
        } catch (e) { localStorage.removeItem('cabzi-session'); }
    }
    
    if (partnerSession) {
        try {
            const { role } = JSON.parse(partnerSession);
            if (role) {
                router.replace(`/${role}`);
                return;
            }
        } catch (e) { 
            localStorage.removeItem('cabzi-driver-session');
            localStorage.removeItem('cabzi-resq-session');
            localStorage.removeItem('cabzi-cure-session');
            localStorage.removeItem('cabzi-ambulance-session');
            localStorage.removeItem('cabzi-doctor-session');
        }
    }
    
    if (userSession) {
        try {
            const { role } = JSON.parse(userSession);
            if (role === 'user') {
                router.replace('/user');
                return;
            }
        } catch (e) { localStorage.removeItem('cabzi-user-session'); }
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
    </FirebaseProviderClient>
  );
}
