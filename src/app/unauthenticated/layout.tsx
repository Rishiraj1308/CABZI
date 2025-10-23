
'use client'

import { Toaster } from '@/components/ui/toaster';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FirebaseProviderClient } from '@/firebase/client-provider';

// This layout now checks for a single, unified session and redirects if found.
export default function UnauthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  const [showChildren, setShowChildren] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    // Check for a primary session first
    const primarySession = localStorage.getItem('cabzi-session');
    if (primarySession) {
        try {
            const { role } = JSON.parse(primarySession);
            if (role) {
                 if (role === 'admin') router.replace('/admin');
                 else router.replace(`/${role}`);
                 return;
            }
        } catch (e) {
            localStorage.removeItem('cabzi-session');
        }
    }
    
    // If no primary session, check for other partner sessions
    const partnerSessionKeys = ['cabzi-resq-session', 'cabzi-cure-session', 'cabzi-ambulance-session', 'cabzi-doctor-session'];
    for (const key of partnerSessionKeys) {
        const session = localStorage.getItem(key);
        if (session) {
            try {
                const { role } = JSON.parse(session);
                if (role) {
                    router.replace(`/${role}`);
                    return;
                }
            } catch (e) {
                localStorage.removeItem(key);
            }
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
        <motion.div
          key={pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
      <Toaster />
    </FirebaseProviderClient>
  );
}
