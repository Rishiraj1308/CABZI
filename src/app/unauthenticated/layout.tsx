
'use client'

import { Toaster } from '@/components/ui/toaster';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MotionDiv, AnimatePresence } from '@/components/ui/motion-div';
import { FirebaseProviderClient } from '@/firebase/client-provider';

// This layout now checks for a single, unified session and redirects if found.
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
    
    const session = localStorage.getItem('cabzi-session');

    if (session) {
        try {
            const { role } = JSON.parse(session);
            
            // Redirect based on the primary role
            if (role) {
                 if (role === 'admin') router.replace('/admin');
                 else router.replace(`/${role}`); // For user, driver, mechanic, cure, etc.
                 return; // Stop further execution to prevent rendering login page
            }
        } catch (e) {
            // Corrupt session, remove it and allow login page to show.
            localStorage.removeItem('cabzi-session');
        }
    }
    
    // If no valid session is found, show the login/onboarding page.
    setShowChildren(true);

  }, [router]);
  
  if (!isMounted || !showChildren) {
    return null; // Render nothing until redirection logic completes or decides to show children.
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
