'use client'

import { Toaster } from '@/components/ui/toaster';
import { useRouter } from 'next/navigation';
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
  const [isMounted, setIsMounted] = useState(false);
  const [showChildren, setShowChildren] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Unify session key checking
    const sessionKeys = ['cabzi-session', 'cabzi-resq-session', 'cabzi-cure-session', 'cabzi-ambulance-session'];
    let sessionFound = false;

    for (const key of sessionKeys) {
        const session = localStorage.getItem(key);
        if (session) {
            try {
                const { role } = JSON.parse(session);
                if (role) {
                    router.replace(`/${role}`);
                    sessionFound = true;
                    break;
                }
            } catch (e) {
                localStorage.removeItem(key);
            }
        }
    }

    if (!sessionFound) {
        setShowChildren(true);
    }
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
